const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const pool = require("../database");
router.use(require("../middlewares/autenticacao"));
router.use(require("../middlewares/administrador"));

const falha = (res, erro) => {
  console.error("Admin pagamentos:", erro);
  return res
    .status(500)
    .json({ sucesso: false, mensagem: "Erro interno ao consultar o banco." });
};

// Cadastro e edição manual de encomendas (somente administração).
router.get('/pedidos-cadastro/opcoes', async (req, res) => {
  try {
    const [u, p] = await Promise.all([
      pool.query("SELECT id_usuario,nome,email FROM usuario WHERE tipo_usuario IN ('cliente','ambos') ORDER BY nome"),
      pool.query(`
    SELECT
        p.id_produto,
        p.nome_produto,
        p.preco,
        p.estoque_pronto,
        p.disponivel,
        s.nome_sabor,
        c.nome_categoria, c.regra_producao
    FROM produto p
    LEFT JOIN sabor s ON s.id_sabor = p.id_sabor
    JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY p.nome_produto, s.nome_sabor
`)
    ]);
    res.json({sucesso:true,usuarios:u.rows,produtos:p.rows});
  } catch(e) {falha(res,e);}
});

async function salvarPedidoManual(req,res,edicao) {
  const d=req.body||{};
  const id=Number(req.params.id);
  const usuario=Number(d.id_usuario);
  const itens=d.itens;
  const data=String(d.data_desejada||'');
  const horario=String(d.horario_desejado||'');
  if (!/^(?:(?:0[89]|1[0-9]):[0-5]\d|20:00)$/.test(horario)) return res.status(400).json({sucesso:false,mensagem:'Escolha um horário entre 08:00 e 20:00.'});
  const modalidade=d.modalidade;
  const texto=(v,max)=>String(v??'').trim().slice(0,max)||null;
  if ((edicao&&(!Number.isSafeInteger(id)||id<1)) || !Number.isSafeInteger(usuario)||usuario<1 ||
      !['retirada','entrega'].includes(modalidade) || !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      !/^\d{2}:\d{2}$/.test(horario) || !Array.isArray(itens)||!itens.length||itens.length>50 ||
      itens.some(i=>!Number.isSafeInteger(Number(i.id_produto))||Number(i.id_produto)<1||!Number.isSafeInteger(Number(i.quantidade))||Number(i.quantidade)<1||Number(i.quantidade)>10000) ||
      (modalidade==='entrega'&&(!texto(d.cidade,60)||!texto(d.bairro,100)||!texto(d.rua,150)||!texto(d.numero,30)))) {
    return res.status(400).json({sucesso:false,mensagem:'Confira cliente, itens, data, horário e endereço de entrega.'});
  }
  const frete=Number(d.frete||0);
  if (!Number.isFinite(frete)||frete<0||frete>10000 || (modalidade==='retirada'&&frete!==0))
    return res.status(400).json({sucesso:false,mensagem:'Frete inválido.'});
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const usr=await c.query("SELECT id_usuario FROM usuario WHERE id_usuario=$1 AND tipo_usuario IN ('cliente','ambos')",[usuario]);
    if (!usr.rowCount) throw new Error('Selecione um cliente cadastrado.');
    if (edicao) {
      const atual=await c.query('SELECT * FROM pedido_encomenda WHERE id_pedido=$1 FOR UPDATE',[id]);
      if (!atual.rowCount) throw new Error('Pedido não encontrado.');
      if (atual.rows[0].status !== 'Aguardando pagamento' ||
          !['Pendente', 'Aguardando pagamento'].includes(atual.rows[0].pagamento_status) || atual.rows[0].comprovante_caminho || atual.rows[0].pix_copia_cola)
        throw new Error('Este pedido já possui pagamento, Pix gerado ou andamento iniciado. Não é seguro editar seus valores.');
      const reservas=await c.query('SELECT id_produto, quantidade_reservada FROM item_encomenda WHERE id_pedido=$1 ORDER BY id_produto',[id]);
      for (const r of reservas.rows) {
        if (Number(r.quantidade_reservada)>0) await c.query('UPDATE produto SET estoque_pronto=estoque_pronto+$1 WHERE id_produto=$2',[r.quantidade_reservada,r.id_produto]);
      }
    }
    const ids=[...new Set(itens.map(i=>Number(i.id_produto)))];
const produtos = await c.query(
    `SELECT id_produto, preco, disponivel
     FROM produto
     WHERE id_produto = ANY($1::int[])
     ORDER BY id_produto
     FOR UPDATE`,
    [ids]
);

const indisponiveis = produtos.rows.filter(
    p => !(p.disponivel === true || p.disponivel === 'true' || p.disponivel === 't' || p.disponivel === 1 || p.disponivel === '1')
);

if (indisponiveis.length > 0) {
    throw new Error(
        "Um ou mais produtos selecionados estão indisponíveis. " +
        "Escolha apenas produtos disponíveis."
    );
}    const mapa=new Map(produtos.rows.map(x=>[Number(x.id_produto),Number(x.preco)]));
    if(mapa.size!==ids.length) throw new Error('Um dos produtos não existe.');
    const agrupados=new Map();
    for(const i of itens) agrupados.set(Number(i.id_produto),(agrupados.get(Number(i.id_produto))||0)+Number(i.quantidade));
    const linhas=[...agrupados].map(([produto,quantidade])=>({produto,quantidade,preco:mapa.get(produto),subtotal:Math.round(mapa.get(produto)*quantidade*100)/100}));

    // Validação da antecedência no servidor.
    // Utiliza o horário oficial de Brasília.
    const partesHoje = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const hojePartes = Object.fromEntries(
        partesHoje.map(p => [p.type, p.value])
    );

    function dataMinimaAdmin(dias) {
        const base = new Date(Date.UTC(
            Number(hojePartes.year),
            Number(hojePartes.month) - 1,
            Number(hojePartes.day)
        ));

        base.setUTCDate(base.getUTCDate() + dias);
        return base.toISOString().slice(0, 10);
    }

    const detalhes = await c.query(`
        SELECT
            p.id_produto,
            p.estoque_pronto,
            cat.nome_categoria, cat.regra_producao
        FROM produto p
        JOIN categoria cat
            ON cat.id_categoria = p.id_categoria
        WHERE p.id_produto = ANY($1::int[])
        FOR UPDATE OF p
    `, [ids]);

    const detalhesMapa = new Map(
        detalhes.rows.map(p => [Number(p.id_produto), p])
    );

    const totalUnidades = linhas.reduce(
        (total, item) => total + item.quantidade, 0
    );

    const contemMini = linhas.some(item => {
        const produto = detalhesMapa.get(item.produto);
        return !(produto.regra_producao === "estoque");
    });

    const faltaEstoque = linhas.some(item => {
        const produto = detalhesMapa.get(item.produto);
        return item.quantidade > Number(produto.estoque_pronto);
    });

    const pedidoRapido =
        totalUnidades <= 20 &&
        !contemMini &&
        !faltaEstoque;

    const diasMinimos = pedidoRapido ? 1 : 7;
    const primeiraData = dataMinimaAdmin(diasMinimos);

    if (data < primeiraData) {
        throw new Error(
            `A data mínima para este pedido é ${primeiraData}. ` +
            (contemMini
                ? "Pedidos com minis exigem 7 dias de antecedência."
                : totalUnidades > 20
                    ? "Pedidos acima de 20 unidades exigem 7 dias."
                    : faltaEstoque
                        ? "Estoque insuficiente para o pedido rápido."
                        : "Não são permitidos pedidos para o mesmo dia.")
        );
    }

    await require('../services/agenda').verificarAgenda(data,diasMinimos,c);

    const subtotal=Math.round(linhas.reduce((a,x)=>a+x.subtotal,0)*100)/100;
    if(subtotal<=0) throw new Error('O subtotal deve ser positivo.');
    const campos=[usuario,modalidade,texto(d.cidade,60),texto(d.cep,9),texto(d.rua,150),texto(d.numero,30),texto(d.complemento,300),texto(d.bairro,100),texto(d.referencia,300),data,horario,texto(d.observacao,300),subtotal,frete,Math.round((subtotal+frete)*100)/100];
    let pedidoId;
    if(edicao) {
      await c.query(`UPDATE pedido_encomenda SET id_usuario=$1,modalidade=$2,cidade=$3,cep=$4,rua=$5,numero=$6,complemento=$7,bairro=$8,referencia=$9,data_desejada=$10,horario_desejado=$11,observacao=$12,subtotal=$13,frete=$14,total=$15,desconto=0,cupom_codigo=NULL WHERE id_pedido=$16`,[...campos,id]);
      await c.query('DELETE FROM item_encomenda WHERE id_pedido=$1',[id]);
      pedidoId=id;
    } else {
      const novo=await c.query(`INSERT INTO pedido_encomenda (id_usuario,modalidade,cidade,cep,rua,numero,complemento,bairro,referencia,data_desejada,horario_desejado,observacao,subtotal,frete,total,status,pagamento_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Aguardando pagamento','Pendente') RETURNING id_pedido`,campos);
      pedidoId=novo.rows[0].id_pedido;
    }
    for(const x of linhas) {
      const produto = detalhesMapa.get(x.produto);
      const reserva = pedidoRapido && data < dataMinimaAdmin(7) ? x.quantidade : 0;
      await c.query('INSERT INTO item_encomenda (id_pedido,id_produto,quantidade,preco_unitario,subtotal,quantidade_reservada) VALUES ($1,$2,$3,$4,$5,$6)',[pedidoId,x.produto,x.quantidade,x.preco,x.subtotal,reserva]);
      if (reserva > 0) await c.query('UPDATE produto SET estoque_pronto=estoque_pronto-$1 WHERE id_produto=$2',[reserva,x.produto]);
    }
    await c.query('COMMIT');
    res.status(edicao?200:201).json({sucesso:true,id_pedido:pedidoId,mensagem:edicao?'Pedido alterado com sucesso.':'Pedido cadastrado com sucesso.'});
  } catch(e) {await c.query('ROLLBACK');if(e.message.startsWith('Erro'))return falha(res,e);console.error('Cadastro manual:',e);res.status(400).json({sucesso:false,mensagem:e.message||'Não foi possível salvar.'});}
  finally {c.release();}
}
router.post('/pedidos-cadastro', (req,res)=>salvarPedidoManual(req,res,false));
router.put('/pedidos-cadastro/:id', (req,res)=>salvarPedidoManual(req,res,true));

router.get("/pedidos", async (req, res) => {
  try {
    const r =
      await pool.query(`SELECT p.*, u.nome AS cliente_nome, u.telefone AS cliente_telefone
   FROM pedido_encomenda p JOIN usuario u ON u.id_usuario=p.id_usuario WHERE (p.pix_copia_cola IS NULL OR p.pagamento_finalizado_em IS NOT NULL OR p.status <> 'Aguardando pagamento' OR p.pagamento_status = 'Confirmado') ORDER BY p.id_pedido DESC`);
    res.json({ sucesso: true, pedidos: r.rows });
  } catch (e) {
    falha(res, e);
  }
});
router.patch("/pedidos/:id/confirmar-pix", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({ sucesso: false, mensagem: "ID inválido." });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `UPDATE pedido_encomenda SET status='Confirmado', pagamento_status='Confirmado', confirmado_em=NOW()
   WHERE id_pedido=$1 AND (pix_copia_cola IS NULL OR pagamento_finalizado_em IS NOT NULL OR status <> 'Aguardando pagamento' OR pagamento_status = 'Confirmado') AND status = 'Aguardando pagamento'
     AND pagamento_status IN ('Pendente', 'Aguardando pagamento') RETURNING id_pedido,cupom_codigo`,
      [id],
    );
    if (!r.rowCount) {
      await c.query("ROLLBACK");
      return res.status(409).json({
        sucesso: false,
        mensagem: "Pedido não está aguardando pagamento.",
      });
    }
    // Número sequencial anual, atribuído somente ao confirmar a venda.
    const anoVenda = new Date().getFullYear();
    const seq = await c.query(`INSERT INTO numeracao_venda(ano,ultimo_numero) VALUES($1,1)
      ON CONFLICT(ano) DO UPDATE SET ultimo_numero=numeracao_venda.ultimo_numero+1 RETURNING ultimo_numero`,[anoVenda]);
    await c.query('UPDATE pedido_encomenda SET numero_venda_ano=$1 WHERE id_pedido=$2',[seq.rows[0].ultimo_numero,id]);
    const cfg = await c.query('SELECT ativa,tipo,valor FROM reserva_configuracao WHERE id=1');
    if(cfg.rows[0]?.ativa){
      const pedido = await c.query('SELECT total FROM pedido_encomenda WHERE id_pedido=$1',[id]);
      const total = Number(pedido.rows[0].total);
      const cgf = cfg.rows[0];
      const reservado = Math.round(Math.min(total,cgf.tipo==='percentual'?total*Number(cgf.valor)/100:Number(cgf.valor))*100)/100;
      if(reservado>0) await c.query(`INSERT INTO reserva_movimentacao(id_pedido,tipo,origem,valor,motivo)
        VALUES($1,'entrada','automatica',$2,'Reserva automática da venda') ON CONFLICT DO NOTHING`,[id,reservado]);
    }
    if (r.rows[0].cupom_codigo) {
      await c.query("UPDATE cupom SET usos=usos+1 WHERE codigo=$1", [
        r.rows[0].cupom_codigo,
      ]);
    }
    await c.query("COMMIT");
    res.json({ sucesso: true, mensagem: "Pix confirmado manualmente." });
  } catch (e) {
    await c.query("ROLLBACK");
    falha(res, e);
  } finally {
    c.release();
  }
});


/* =====================================================
   CRUD DE PEDIDOS - LILA'S
   Consultar e atualizar andamento
   ===================================================== */

// Validar o ID recebido pela URL.
function validarIdPedido(id) {
    const numero = Number(id);

    if (!Number.isSafeInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

// PROCURAR: consultar um pedido pelo ID.
router.get("/pedidos/:id", async (req, res) => {

    const id = validarIdPedido(req.params.id);

    if (!id) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "ID do pedido inválido."
        });
    }

    try {

        // Consultar o pedido e o cliente.
        const resultado = await pool.query(`
            SELECT
                p.*,
                u.nome AS cliente_nome,
                u.email AS cliente_email,
                u.telefone AS cliente_telefone
            FROM pedido_encomenda p
            JOIN usuario u
                ON u.id_usuario = p.id_usuario
            WHERE p.id_pedido = $1 AND (p.pix_copia_cola IS NULL OR p.pagamento_finalizado_em IS NOT NULL OR p.status <> 'Aguardando pagamento' OR p.pagamento_status = 'Confirmado')
        `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido não encontrado."
            });
        }

        
        // Consultar os produtos e seus sabores.
        const itens = await pool.query(`
            SELECT
                i.*,
                pr.nome_produto AS produto_nome,
                s.nome_sabor AS sabor_nome
            FROM item_encomenda i
            JOIN produto pr
                ON pr.id_produto = i.id_produto
            LEFT JOIN sabor s
                ON s.id_sabor = pr.id_sabor
            WHERE i.id_pedido = $1
            ORDER BY i.id_item
        `, [id]);


        return res.json({
            sucesso: true,
            pedido: {
                ...resultado.rows[0],
                chave_pix_loja: String(process.env.PIX_CHAVE || "").trim(),
                itens: itens.rows
            }
        });

    } catch (erro) {
        return falha(res, erro);
    }
});


// ALTERAR: atualizar o andamento do pedido.
router.patch("/pedidos/:id/status", async (req, res) => {

    const id = validarIdPedido(req.params.id);
    const novoStatus = req.body.status;

    if (!id) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "ID inválido."
        });
    }

    // Transições permitidas.
    const transicoes = {
        "Confirmado": ["Em produção"],
        "Em produção": ["Pronto"],
        "Pronto": ["Concluído"],
        "Concluído": [],
        "Cancelado": [],
        "Aguardando pagamento": []
    };

    const conexao = await pool.connect();

    try {

        await conexao.query("BEGIN");

        // Bloquear o registro durante a alteração.
        const resultado = await conexao.query(`
            SELECT status, pagamento_status
            FROM pedido_encomenda
            WHERE id_pedido = $1 AND (pix_copia_cola IS NULL OR pagamento_finalizado_em IS NOT NULL OR status <> 'Aguardando pagamento' OR pagamento_status = 'Confirmado')
            FOR UPDATE
        `, [id]);

        if (resultado.rowCount === 0) {
            await conexao.query("ROLLBACK");

            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido não encontrado."
            });
        }

        const pedido = resultado.rows[0];

        // Não permitir avançar pedidos sem pagamento.
        if (pedido.pagamento_status !== "Confirmado") {
            await conexao.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem: "Confirme o pagamento antes de iniciar a produção."
            });
        }

        const permitidos = transicoes[pedido.status] || [];

        if (!permitidos.includes(novoStatus)) {
            await conexao.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem: "Esta mudança de status não é permitida."
            });
        }

        await conexao.query(`
            UPDATE pedido_encomenda
            SET status = $1
            WHERE id_pedido = $2
        `, [novoStatus, id]);

        await conexao.query("COMMIT");

        return res.json({
            sucesso: true,
            mensagem: "Andamento atualizado com sucesso!"
        });

    } catch (erro) {

        await conexao.query("ROLLBACK");
        return falha(res, erro);

    } finally {
        conexao.release();
    }
});


/* =====================================================
   CANCELAR PEDIDO - LILA'S
   Mantém histórico, pagamento e reembolso.
   ===================================================== */

router.patch("/pedidos/:id/cancelar", async (req, res) => {

    const id = validarIdPedido(req.params.id);

    const motivo = String(
        req.body.motivo || ""
    ).trim();

    if (!id) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "ID do pedido inválido."
        });
    }

    if (motivo.length < 5 || motivo.length > 500) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um motivo entre 5 e 500 caracteres."
        });
    }

    const conexao = await pool.connect();

    try {

        await conexao.query("BEGIN");

        // Bloquear o pedido para evitar alterações simultâneas.
        const resultado = await conexao.query(`
            SELECT *
            FROM pedido_encomenda
            WHERE id_pedido = $1 AND (pix_copia_cola IS NULL OR pagamento_finalizado_em IS NOT NULL OR status <> 'Aguardando pagamento' OR pagamento_status = 'Confirmado')
            FOR UPDATE
        `, [id]);

        if (resultado.rowCount === 0) {
            await conexao.query("ROLLBACK");

            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido não encontrado."
            });
        }

        const pedido = resultado.rows[0];

        // Impedir cancelamento duplicado.
        if (pedido.status === "Cancelado") {
            await conexao.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem: "Este pedido já foi cancelado."
            });
        }

        // Pedidos concluídos exigem tratamento separado.
        if (pedido.status === "Concluído") {
            await conexao.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Pedido já concluído. Verifique a entrega e " +
                    "o reembolso antes de cancelar."
            });
        }

        // Identificar se houve pagamento confirmado.
        const pago = pedido.pagamento_status === "Confirmado";

        // Não criar reembolso sem valor financeiro registrado.
        const valor = Number(pedido.total);

        if (pago && (
            pedido.total === null ||
            !Number.isFinite(valor) ||
            valor <= 0
        )) {
            await conexao.query("ROLLBACK");

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Pedido pago sem total válido. " +
                    "Confira o histórico financeiro antes de cancelar."
            });
        }

        // Consultar os itens com reserva registrada.
        const itens = await conexao.query(`
            SELECT
                id_item,
                id_produto,
                quantidade_reservada
            FROM item_encomenda
            WHERE id_pedido = $1
            ORDER BY id_item
            FOR UPDATE
        `, [id]);

        // Devolver somente as unidades efetivamente reservadas.
        for (const item of itens.rows) {

            const quantidade = Number(item.quantidade_reservada);

            if (quantidade > 0) {

                await conexao.query(`
                    UPDATE produto
                    SET estoque_pronto = estoque_pronto + $1
                    WHERE id_produto = $2
                `, [
                    quantidade,
                    item.id_produto
                ]);

                // Zerar a reserva para impedir devolução duplicada.
                await conexao.query(`
                    UPDATE item_encomenda
                    SET quantidade_reservada = 0
                    WHERE id_item = $1
                `, [item.id_item]);
            }
        }

        // Preservar o status do pagamento original.
        // Se houve Pix, registrar reembolso pendente.
        const reembolsoStatus = pago
            ? "Pendente"
            : "Não necessário";

        const valorReembolso = pago ? valor : null;

        await conexao.query(`
            UPDATE pedido_encomenda
            SET
                status = 'Cancelado',
                cancelado_em = NOW(),
                motivo_cancelamento = $1,
                reembolso_status = $2,
                valor_reembolso = $3
            WHERE id_pedido = $4
        `, [
            motivo,
            reembolsoStatus,
            valorReembolso,
            id
        ]);

        await conexao.query("COMMIT");

        return res.json({
            sucesso: true,
            mensagem: pago
                ? "Pedido cancelado. Reembolso pendente."
                : "Pedido cancelado com sucesso.",
            reembolso_status: reembolsoStatus
        });

    } catch (erro) {

        await conexao.query("ROLLBACK");
        return falha(res, erro);

    } finally {
        conexao.release();
    }
});


/* =====================================================
   CONFIRMAR REEMBOLSO REALIZADO
   ===================================================== */

router.patch("/pedidos/:id/reembolso", async (req, res) => {

    const id = validarIdPedido(req.params.id);

    if (!id) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "ID inválido."
        });
    }

    try {

        const resultado = await pool.query(`
            UPDATE pedido_encomenda
            SET
                reembolso_status = 'Realizado',
                reembolsado_em = NOW()
            WHERE id_pedido = $1
              AND status = 'Cancelado'
              AND pagamento_status = 'Confirmado'
              AND reembolso_status = 'Pendente'
            RETURNING id_pedido
        `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Não existe reembolso pendente para este pedido."
            });
        }

        return res.json({
            sucesso: true,
            mensagem: "Reembolso registrado como realizado."
        });

    } catch (erro) {
        return falha(res, erro);
    }
});



router.get("/cupons", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM cupom ORDER BY id_cupom DESC");
    res.json({ sucesso: true, cupons: r.rows });
  } catch (e) {
    falha(res, e);
  }
});
function validar(d) {
  const codigo = String(d.codigo || "")
    .trim()
    .toUpperCase();
  const tipo = d.tipo;
  const valor = Number(d.valor);
  const limite = d.limite_usos == null ? null : Number(d.limite_usos);
  const minimo = Number(d.valor_minimo_pedido ?? 0);
  if (
    !/^[A-Z0-9_-]{3,30}$/.test(codigo) ||
    !["percentual", "fixo"].includes(tipo) ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    (tipo === "percentual" && valor > 100) ||
    (limite !== null && (!Number.isSafeInteger(limite) || limite < 1)) ||
    !Number.isFinite(minimo) || minimo < 0 || Math.round(minimo*100)/100 !== minimo
  )
    return null;
  return {
    codigo,
    tipo,
    valor,
    validade: d.validade || null,
    limite,
    minimo,
    ativo: d.ativo !== false,
  };
}
router.post("/cupons", async (req, res) => {
  const d = validar(req.body || {});
  if (!d)
    return res.status(400).json({
      sucesso: false,
      mensagem: "Confira código, tipo, valor e limite.",
    });
  try {
    await pool.query(
      "INSERT INTO cupom(codigo,tipo,valor,validade,limite_usos,ativo,valor_minimo_pedido) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [d.codigo, d.tipo, d.valor, d.validade, d.limite, d.ativo, d.minimo],
    );
    res.status(201).json({ sucesso: true });
  } catch (e) {
    if (e.code === "23505")
      return res
        .status(409)
        .json({ sucesso: false, mensagem: "Cupom já cadastrado." });
    falha(res, e);
  }
});
router.put("/cupons/:id", async (req, res) => {
  const d = validar(req.body || {});
  if (!d)
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "Dados inválidos." });
  try {
    const r = await pool.query(
      "UPDATE cupom SET codigo=$1,tipo=$2,valor=$3,validade=$4,limite_usos=$5,ativo=$6,valor_minimo_pedido=$8 WHERE id_cupom=$7 RETURNING id_cupom",
      [d.codigo, d.tipo, d.valor, d.validade, d.limite, d.ativo, req.params.id, d.minimo],
    );
    res.status(r.rowCount ? 200 : 404).json({
      sucesso: !!r.rowCount,
      mensagem: r.rowCount ? "Salvo" : "Cupom não encontrado",
    });
  } catch (e) {
    if (e.code === "23505")
      return res
        .status(409)
        .json({ sucesso: false, mensagem: "Código já existe." });
    falha(res, e);
  }
});
// Desabilita sem remover o cupom.
router.patch("/cupons/:id/desabilitar", async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({sucesso:false,mensagem:"Cupom inválido."});
  try {
    const r = await pool.query("UPDATE cupom SET ativo=FALSE WHERE id_cupom=$1 AND ativo=TRUE RETURNING id_cupom", [id]);
    return res.status(r.rowCount ? 200 : 404).json({sucesso:!!r.rowCount,mensagem:r.rowCount?"Cupom desabilitado.":"Cupom ativo não encontrado."});
  } catch(e) { falha(res,e); }
});
// Exclusão definitiva explícita, inclusive para cupons ativos.
router.delete("/cupons/:id/definitivo", async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({sucesso:false,mensagem:"Cupom inválido."});
  try {
    const r = await pool.query("DELETE FROM cupom WHERE id_cupom=$1 RETURNING id_cupom", [id]);
    return res.status(r.rowCount ? 200 : 404).json({sucesso:!!r.rowCount,mensagem:r.rowCount?"Cupom excluído definitivamente.":"Cupom não encontrado."});
  } catch(e) {
    if(e.code === "23503") return res.status(409).json({sucesso:false,mensagem:"Este cupom está vinculado a registros existentes e não pode ser excluído definitivamente."});
    falha(res,e);
  }
});
// Primeira ação: desabilitar. A exclusão definitiva é permitida apenas depois.
router.delete("/cupons/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({sucesso:false,mensagem:"Cupom inválido."});
  try {
    const r = await pool.query("SELECT ativo FROM cupom WHERE id_cupom=$1", [id]);
    if (!r.rowCount) return res.status(404).json({sucesso:false,mensagem:"Cupom não encontrado."});
    if (r.rows[0].ativo) {
      await pool.query("UPDATE cupom SET ativo=FALSE WHERE id_cupom=$1", [id]);
      return res.json({sucesso:true,mensagem:"Cupom desabilitado. Agora é possível excluí-lo definitivamente."});
    }
    await pool.query("DELETE FROM cupom WHERE id_cupom=$1 AND ativo=FALSE", [id]);
    return res.json({sucesso:true,mensagem:"Cupom excluído definitivamente."});
  } catch (e) {
    if (e.code === "23503") return res.status(409).json({sucesso:false,mensagem:"Este cupom possui vínculos com registros existentes e não pode ser excluído definitivamente."});
    falha(res,e);
  }
});
router.patch("/cupons/:id/reativar", async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({sucesso:false,mensagem:"Cupom inválido."});
  try {
    const r=await pool.query("UPDATE cupom SET ativo=TRUE WHERE id_cupom=$1 AND ativo=FALSE RETURNING id_cupom",[id]);
    res.status(r.rowCount?200:404).json({sucesso:!!r.rowCount,mensagem:r.rowCount?"Cupom reativado.":"Cupom inativo não encontrado."});
  } catch(e) {falha(res,e);}
});
// Abrir comprovante somente para usuário autenticado com perfil administrador.
router.get("/pedidos/:id/comprovante", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "ID inválido." });
    }
    try {
        const resultado = await pool.query(`
            SELECT comprovante_caminho FROM pedido_encomenda WHERE id_pedido = $1
        `, [id]);
        if (!resultado.rowCount || !resultado.rows[0].comprovante_caminho) {
            return res.status(404).json({
                sucesso: false, mensagem: "Comprovante não encontrado."
            });
        }
        const nome = resultado.rows[0].comprovante_caminho;
        if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(nome) || path.basename(nome) !== nome) {
            return res.status(400).json({
                sucesso: false, mensagem: "Nome de arquivo inválido."
            });
        }
        const arquivo = path.join(__dirname, "..", "uploads", "comprovantes", nome);
        if (!fs.existsSync(arquivo)) {
            return res.status(404).json({
                sucesso: false, mensagem: "Arquivo não encontrado no servidor."
            });
        }
        const tipos = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };
        res.setHeader("Content-Type", tipos[path.extname(nome)]);
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "no-store");
        return res.sendFile(arquivo);
    } catch (erro) {
        console.error("Erro ao abrir comprovante:", erro);
        return res.status(500).json({
            sucesso: false, mensagem: "Erro ao abrir comprovante."
        });
    }
});

module.exports = router;
