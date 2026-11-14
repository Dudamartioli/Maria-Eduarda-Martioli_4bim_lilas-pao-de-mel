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
router.get("/pedidos", async (req, res) => {
  try {
    const r =
      await pool.query(`SELECT p.*, u.nome AS cliente_nome, u.telefone AS cliente_telefone
   FROM pedido_encomenda p JOIN usuario u ON u.id_usuario=p.id_usuario ORDER BY p.id_pedido DESC`);
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
   WHERE id_pedido=$1 AND status='Aguardando pagamento' RETURNING id_pedido,cupom_codigo`,
      [id],
    );
    if (!r.rowCount) {
      await c.query("ROLLBACK");
      return res.status(409).json({
        sucesso: false,
        mensagem: "Pedido não está aguardando pagamento.",
      });
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
            WHERE p.id_pedido = $1
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
        "Pendente": [],
        "Aguardando pagamento": []
    };

    const conexao = await pool.connect();

    try {

        await conexao.query("BEGIN");

        // Bloquear o registro durante a alteração.
        const resultado = await conexao.query(`
            SELECT status, pagamento_status
            FROM pedido_encomenda
            WHERE id_pedido = $1
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
            WHERE id_pedido = $1
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
  if (
    !/^[A-Z0-9_-]{3,30}$/.test(codigo) ||
    !["percentual", "fixo"].includes(tipo) ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    (tipo === "percentual" && valor > 100) ||
    (limite !== null && (!Number.isSafeInteger(limite) || limite < 1))
  )
    return null;
  return {
    codigo,
    tipo,
    valor,
    validade: d.validade || null,
    limite,
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
      "INSERT INTO cupom(codigo,tipo,valor,validade,limite_usos,ativo) VALUES($1,$2,$3,$4,$5,$6)",
      [d.codigo, d.tipo, d.valor, d.validade, d.limite, d.ativo],
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
      "UPDATE cupom SET codigo=$1,tipo=$2,valor=$3,validade=$4,limite_usos=$5,ativo=$6 WHERE id_cupom=$7 RETURNING id_cupom",
      [d.codigo, d.tipo, d.valor, d.validade, d.limite, d.ativo, req.params.id],
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
router.delete("/cupons/:id", async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE cupom SET ativo=FALSE WHERE id_cupom=$1 RETURNING id_cupom",
      [req.params.id],
    );
    res.status(r.rowCount ? 200 : 404).json({
      sucesso: !!r.rowCount,
      mensagem: r.rowCount ? "Cupom desativado" : "Cupom não encontrado",
    });
  } catch (e) {
    falha(res, e);
  }
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
