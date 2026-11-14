
const pool = require("../database");
const { gerarPix } = require("../services/pix");
const { frete: calcularFrete } = require("../services/valores");

// =====================================================
// DATA MÍNIMA - HORÁRIO DO PARANÁ
// =====================================================

function dataMinima(dias = 7) {

    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const p = Object.fromEntries(
        partes.map(x => [x.type, x.value])
    );

    const hoje = new Date(Date.UTC(
        Number(p.year),
        Number(p.month) - 1,
        Number(p.day)
    ));

    hoje.setUTCDate(hoje.getUTCDate() + dias);

    return hoje.toISOString().slice(0, 10);
}


// =====================================================
// SOLICITAR ENCOMENDA
// =====================================================

exports.solicitar = async (req, res) => {

    // Receber os dados enviados pelo cliente.
    const {
        itens,
        modalidade,
        cidade,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        referencia,
        data_desejada,
        horario_desejado,
        observacao,
        cupom
    } = req.body || {};

    const cidades = [
        "Goioerê",
        "Quarto Centenário",
        "Campo Mourão"
    ];

    // =================================================
    // VALIDAR PRODUTOS E QUANTIDADES
    // =================================================

    if (
        !Array.isArray(itens) ||
        !itens.length ||
        itens.length > 100 ||
        itens.some(i =>
            !Number.isSafeInteger(i.id_produto) ||
            i.id_produto < 1 ||
            !Number.isSafeInteger(i.quantidade) ||
            i.quantidade < 1 ||
            i.quantidade > 999
        )
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Confira os produtos e quantidades."
        });
    }

    // Validar entrega ou retirada.
    if (!["entrega", "retirada"].includes(modalidade)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Escolha entrega ou retirada."
        });
    }

    // =================================================
    // VALIDAR DATA DE ENTREGA
    // =================================================

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(data_desejada || "") ||
        data_desejada < dataMinima(1) ||
        new Date(data_desejada + "T00:00:00Z")
            .toISOString().slice(0, 10) !== data_desejada
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Escolha uma data válida a partir de amanhã."
        });
    }

    // Validar horário.
    if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
            horario_desejado || ""
        )
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe um horário válido."
        });
    }

    // =================================================
    // VALIDAR ENDEREÇO
    // =================================================

    if (
        modalidade === "entrega" &&
        (
            !cidades.includes(cidade) ||
            !/^\d{5}-?\d{3}$/.test(cep || "") ||
            !String(rua || "").trim() ||
            !String(numero || "").trim() ||
            !String(bairro || "").trim()
        )
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem:
                "Preencha o endereço de entrega em uma cidade atendida."
        });
    }

    // Limitar o tamanho dos campos.
    const campos = [
        rua,
        numero,
        complemento,
        bairro,
        referencia,
        observacao
    ];

    if (
        campos.some(v => String(v || "").length > 300)
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Um dos campos de texto está muito longo."
        });
    }

    // Impedir produtos duplicados no carrinho.
    const ids = itens.map(i => i.id_produto);

    if (new Set(ids).size !== ids.length) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Há produtos duplicados no carrinho."
        });
    }

    // =================================================
    // INICIAR TRANSAÇÃO POSTGRESQL
    // =================================================

    const conexao = await pool.connect();

    try {

        await conexao.query("BEGIN");

        // Preços e estoque vêm sempre do PostgreSQL.
        const consulta = await conexao.query(`
            SELECT
                p.id_produto,
                p.preco,
                p.estoque_pronto,
                c.nome_categoria
            FROM produto p
            JOIN categoria c
                ON c.id_categoria = p.id_categoria
            WHERE p.disponivel = true
              AND p.id_produto = ANY($1::integer[])
            ORDER BY p.id_produto
            FOR UPDATE OF p
        `, [ids]);

        if (consulta.rows.length !== itens.length) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Um produto não está mais disponível. Atualize o carrinho."
            });
        }

        const mapa = new Map(
            consulta.rows.map(p => [p.id_produto, p])
        );

        // =================================================
        // VERIFICAR PEDIDO RÁPIDO OU ENCOMENDA
        // =================================================

        const contemMini = itens.some(i =>
            !String(
                mapa.get(i.id_produto).nome_categoria
            ).toLowerCase().includes("normal")
        );

        const faltaEstoque = itens.some(i =>
            Number(
                mapa.get(i.id_produto).estoque_pronto
            ) < i.quantidade
        );

        // Pedido rápido: somente produtos normais
        // e com estoque pronto suficiente.
        const pedidoRapido = !contemMini && !faltaEstoque;

        const diasMinimos = pedidoRapido ? 1 : 7;

        if (data_desejada < dataMinima(diasMinimos)) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem: faltaEstoque
                    ? "Estoque insuficiente para entrega rápida. Reduza a quantidade ou escolha uma data a partir de 7 dias."
                    : "Este pedido exige pelo menos 7 dias de antecedência."
            });
        }

        // =================================================
        // CALCULAR SUBTOTAL
        // =================================================

        let totalCentavos = 0;

        for (const item of itens) {

            const preco = Number(
                mapa.get(item.id_produto).preco
            );

            totalCentavos +=
                Math.round(preco * 100) * item.quantidade;
        }

        if (
            !Number.isSafeInteger(totalCentavos) ||
            totalCentavos <= 0
        ) {
            throw new Error("Total inválido");
        }

        // Quantidade total de unidades.
        const quantidadeTotal = itens.reduce(
            (soma, item) => soma + item.quantidade,
            0
        );

        // =================================================
        // DESCONTO AUTOMÁTICO DE 5%
        // =================================================

        // Mais de 100 unidades: desconto de 5%.
        let descontoCentavos = quantidadeTotal > 100
            ? Math.round(totalCentavos * 0.05)
            : 0;

        let cupomAplicado = null;

        // =================================================
        // VALIDAR CUPOM
        // =================================================

        if (cupom && String(cupom).trim()) {

            const codigo = String(cupom)
                .trim()
                .toUpperCase();

            const resultadoCupom = await conexao.query(`
                SELECT *
                FROM cupom
                WHERE codigo = $1
                  AND ativo = TRUE
                  AND (
                      validade IS NULL
                      OR validade >= CURRENT_DATE
                  )
                  AND (
                      limite_usos IS NULL
                      OR usos < limite_usos
                  )
                FOR UPDATE
            `, [codigo]);

            if (!resultadoCupom.rowCount) {

                await conexao.query("ROLLBACK");

                return res.status(400).json({
                    sucesso: false,
                    mensagem:
                        "Cupom inválido, expirado ou esgotado."
                });
            }

            const c = resultadoCupom.rows[0];

            // Calcular a economia oferecida pelo cupom.
            const economia = c.tipo === "percentual"
                ? Math.round(
                    totalCentavos * Number(c.valor) / 100
                )
                : Math.round(Number(c.valor) * 100);

            const descontoCupom = Math.min(
                totalCentavos,
                economia
            );

            // Aplicar somente o desconto mais vantajoso.
            if (descontoCupom > descontoCentavos) {

                descontoCentavos = descontoCupom;
                cupomAplicado = c.codigo;
            }
        }

        // =================================================
        // CALCULAR FRETE
        // =================================================

        let freteCentavos;

        try {

            freteCentavos = Math.round(
                calcularFrete(modalidade, cidade) * 100
            );

        } catch (erro) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        // =================================================
        // CALCULAR TOTAL FINAL
        // =================================================

        const totalFinalCentavos =
            totalCentavos -
            descontoCentavos +
            freteCentavos;

        if (totalFinalCentavos <= 0) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Pedido com total zero: solicite atendimento."
            });
        }

        // Verificar se o serviço Pix está configurado.
        try {

            gerarPix(totalFinalCentavos / 100, 1);

        } catch (erro) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        // =================================================
        // INSERIR PEDIDO NO BANCO
        // =================================================

        const pedido = await conexao.query(`
            INSERT INTO pedido_encomenda
            (
                id_usuario,
                modalidade,
                cidade,
                cep,
                rua,
                numero,
                complemento,
                bairro,
                referencia,
                data_desejada,
                horario_desejado,
                observacao,
                subtotal,
                status,
                frete,
                desconto,
                total,
                cupom_codigo,
                pagamento_status
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,
                $10,$11,$12,$13,
                'Aguardando pagamento',
                $14,$15,$16,$17,
                'Aguardando pagamento'
            )
            RETURNING id_pedido
        `, [
            req.usuario.id_usuario,
            modalidade,
            modalidade === "entrega" ? cidade : null,
            modalidade === "entrega" ? cep : null,
            modalidade === "entrega" ? rua : null,
            modalidade === "entrega" ? numero : null,
            modalidade === "entrega" ? complemento : null,
            modalidade === "entrega" ? bairro : null,
            modalidade === "entrega" ? referencia : null,
            data_desejada,
            horario_desejado,
            observacao || null,
            totalCentavos / 100,
            freteCentavos / 100,
            descontoCentavos / 100,
            totalFinalCentavos / 100,
            cupomAplicado
        ]);

        const idPedido = pedido.rows[0].id_pedido;

        // =================================================
        // INSERIR ITENS E REGISTRAR RESERVA DE ESTOQUE
        // =================================================

        for (const item of itens) {

            const preco = Number(
                mapa.get(item.id_produto).preco
            );

            const subtotalItem =
                Math.round(preco * 100) *
                item.quantidade / 100;

            // Somente pedidos rápidos reservam estoque pronto.
            const quantidadeReservada = pedidoRapido
                ? item.quantidade
                : 0;

            await conexao.query(`
                INSERT INTO item_encomenda
                (
                    id_pedido,
                    id_produto,
                    quantidade,
                    preco_unitario,
                    subtotal,
                    quantidade_reservada
                )
                VALUES ($1,$2,$3,$4,$5,$6)
            `, [
                idPedido,
                item.id_produto,
                item.quantidade,
                preco,
                subtotalItem,
                quantidadeReservada
            ]);
        }

        // =================================================
        // DESCONTAR ESTOQUE DOS PEDIDOS RÁPIDOS
        // =================================================

        // O estoque foi bloqueado com FOR UPDATE.
        // Assim, dois clientes não reservam as mesmas unidades.

        if (pedidoRapido) {

            for (const item of itens) {

                await conexao.query(`
                    UPDATE produto
                    SET estoque_pronto = estoque_pronto - $1
                    WHERE id_produto = $2
                `, [
                    item.quantidade,
                    item.id_produto
                ]);
            }
        }

        // =================================================
        // GERAR PIX REAL
        // =================================================

        // O Pix usa o total final calculado no backend.
        const pix = gerarPix(
            totalFinalCentavos / 100,
            idPedido
        );

        // Salvar o código Pix no PostgreSQL.
        await conexao.query(`
            UPDATE pedido_encomenda
            SET pix_copia_cola = $1
            WHERE id_pedido = $2
        `, [
            pix,
            idPedido
        ]);

        // =================================================
        // FINALIZAR TRANSAÇÃO
        // =================================================

        await conexao.query("COMMIT");

        return res.status(201).json({

            sucesso: true,

            id_pedido: idPedido,

            subtotal: totalCentavos / 100,

            frete: freteCentavos / 100,

            desconto: descontoCentavos / 100,

            total: totalFinalCentavos / 100,

            pix_copia_cola: pix,

            mensagem:
                "Pedido aguardando pagamento. Confirmação somente após conferência bancária."
        });

    } catch (erro) {

        // Desfazer tudo se ocorrer algum erro.
        await conexao.query("ROLLBACK");

        console.error(
            "Erro ao solicitar encomenda:",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível registrar o pedido."
        });

    } finally {

        // Liberar conexão com o PostgreSQL.
        conexao.release();
    }
};
