
const express = require("express");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const pool = require("../database");

const verificarAutenticacao = require("../middlewares/autenticacao");
const checkoutController = require("../controllers/checkoutController");

// =====================================================
// SOLICITAR ENCOMENDA
// =====================================================

// Mantém o checkout que já está funcionando.
router.post(
    "/solicitar",
    verificarAutenticacao,
    checkoutController.solicitar
);


// =====================================================
// FINALIZAR ETAPA DE PAGAMENTO
// =====================================================

router.patch(
    "/pedidos/:id/finalizar-pagamento",
    verificarAutenticacao,
    async (req, res) => {

        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID do pedido inválido."
            });
        }

        try {

            // Atualizar somente um pedido pertencente ao cliente.
            // Não confirmar automaticamente o recebimento do Pix.
            const resultado = await pool.query(`
                UPDATE pedido_encomenda
                SET pagamento_finalizado_em =
                    COALESCE(pagamento_finalizado_em, NOW())
                WHERE id_pedido = $1
                  AND id_usuario = $2
                  AND status = 'Aguardando pagamento'
                  AND pagamento_status = 'Aguardando pagamento'
                RETURNING id_pedido
            `, [
                id,
                req.usuario.id_usuario
            ]);

            if (resultado.rowCount === 0) {

                return res.status(409).json({
                    sucesso: false,
                    mensagem:
                        "Não foi possível finalizar esta etapa. " +
                        "Verifique se o pedido existe e está aguardando pagamento."
                });
            }

            return res.json({
                sucesso: true,
                id_pedido: id,
                mensagem:
                    "Etapa de pagamento finalizada. " +
                    "Aguardando confirmação da Lila's."
            });

        } catch (erro) {

            console.error(
                "Erro ao finalizar pagamento:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao finalizar o pagamento."
            });
        }
    }
);


// =====================================================
// CONSULTAR RESUMO DO PEDIDO
// =====================================================

router.get(
    "/pedidos/:id/resumo",
    verificarAutenticacao,
    async (req, res) => {

        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID inválido."
            });
        }

        try {

            // Buscar o pedido e o nome do cliente.
            const resultado = await pool.query(`
                SELECT
                    p.*,
                    u.nome AS cliente_nome
                FROM pedido_encomenda p
                JOIN usuario u
                    ON u.id_usuario = p.id_usuario
                WHERE p.id_pedido = $1
                  AND p.id_usuario = $2
            `, [
                id,
                req.usuario.id_usuario
            ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Pedido não encontrado."
                });
            }

            const pedido = resultado.rows[0];

            // Buscar os produtos da encomenda.
            const itens = await pool.query(`
                SELECT
                    i.id_item,
                    i.id_produto,
                    i.quantidade,
                    i.preco_unitario,
                    i.subtotal,
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

            // Definir o texto exibido ao cliente.
            let statusExibicao = pedido.status;

            if (
                pedido.status === "Aguardando pagamento" &&
                pedido.pagamento_finalizado_em
            ) {
                statusExibicao =
                    "Aguardando confirmação de pagamento";
            }

            // Não enviar o código Pix nem dados internos
            // desnecessários nesta resposta.
            return res.json({
                sucesso: true,

                pedido: {
                    id_pedido: pedido.id_pedido,
                    cliente_nome: pedido.cliente_nome,

                    modalidade: pedido.modalidade,
                    cidade: pedido.cidade,
                    cep: pedido.cep,
                    rua: pedido.rua,
                    numero: pedido.numero,
                    complemento: pedido.complemento,
                    bairro: pedido.bairro,
                    referencia: pedido.referencia,

                    data_desejada: pedido.data_desejada,
                    horario_desejado: pedido.horario_desejado,
                    observacao: pedido.observacao,

                    subtotal: pedido.subtotal,
                    desconto: pedido.desconto,
                    frete: pedido.frete,
                    total: pedido.total,

                    status: statusExibicao,
                    pagamento_status: pedido.pagamento_status,
                    pagamento_finalizado_em:
                        pedido.pagamento_finalizado_em,

                    comprovante_enviado:
                        Boolean(pedido.comprovante_enviado_em),

                    itens: itens.rows
                }
            });

        } catch (erro) {

            console.error(
                "Erro ao consultar resumo:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao consultar o pedido."
            });
        }
    }
);


// =====================================================
// COMPROVANTE PIX - CONFIGURAÇÃO
// =====================================================

// Pasta privada, fora do frontend.
const pastaComprovantes = path.join(
    __dirname,
    "..",
    "uploads",
    "comprovantes"
);

// Criar a pasta caso ainda não exista.
fs.mkdirSync(pastaComprovantes, {
    recursive: true
});

// Guardar o arquivo temporariamente na memória.
const uploadComprovante = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Conferir o conteúdo real do arquivo.
function identificarComprovante(arquivo) {

    const dados = arquivo.buffer;

    // PDF: assinatura %PDF-
    if (
        dados.length >= 5 &&
        dados.subarray(0, 5).toString("ascii") === "%PDF-"
    ) {
        return {
            extensao: ".pdf",
            tipo: "application/pdf"
        };
    }

    // PNG: assinatura binária.
    const assinaturaPng =
        Buffer.from("89504e470d0a1a0a", "hex");

    if (
        dados.length >= 8 &&
        dados.subarray(0, 8).equals(assinaturaPng)
    ) {
        return {
            extensao: ".png",
            tipo: "image/png"
        };
    }

    // JPG/JPEG: assinatura inicial.
    if (
        dados.length >= 3 &&
        dados[0] === 0xff &&
        dados[1] === 0xd8 &&
        dados[2] === 0xff
    ) {
        return {
            extensao: ".jpg",
            tipo: "image/jpeg"
        };
    }

    return null;
}

// =====================================================
// ENVIAR COMPROVANTE
// =====================================================

router.post(
    "/pedidos/:id/comprovante",
    verificarAutenticacao,

    (req, res, next) => {

        uploadComprovante.single("comprovante")(
            req,
            res,
            erro => {

                if (erro) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem:
                            "Arquivo inválido ou maior que 5 MB."
                    });
                }

                next();
            }
        );
    },

    async (req, res) => {

        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Pedido inválido."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Selecione um comprovante."
            });
        }

        const formato = identificarComprovante(req.file);

        if (!formato) {
            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "O comprovante precisa ser PDF, JPG ou PNG."
            });
        }

        let nomeArquivo = null;

        try {

            // Somente o dono pode enviar o comprovante.
            const consulta = await pool.query(`
                SELECT
                    id_pedido,
                    status,
                    pagamento_status,
                    pagamento_finalizado_em,
                    comprovante_caminho
                FROM pedido_encomenda
                WHERE id_pedido = $1
                  AND id_usuario = $2
            `, [
                id,
                req.usuario.id_usuario
            ]);

            if (consulta.rowCount === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Pedido não encontrado."
                });
            }

            const pedido = consulta.rows[0];

            if (
                pedido.status !== "Aguardando pagamento" ||
                pedido.pagamento_status !== "Aguardando pagamento" ||
                pedido.pagamento_finalizado_em ||
                pedido.comprovante_caminho
            ) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem:
                        "Este pedido não permite um novo comprovante."
                });
            }

            // Nome aleatório, sem utilizar o nome original.
            nomeArquivo =
                crypto.randomUUID() + formato.extensao;

            const destino = path.join(
                pastaComprovantes,
                nomeArquivo
            );

            // Criar arquivo sem sobrescrever outro.
            await fs.promises.writeFile(
                destino,
                req.file.buffer,
                { flag: "wx" }
            );

            // Associar ao pedido no PostgreSQL.
            const atualizado = await pool.query(`
                UPDATE pedido_encomenda
                SET
                    comprovante_caminho = $1,
                    comprovante_enviado_em = NOW()
                WHERE id_pedido = $2
                  AND id_usuario = $3
                  AND status = 'Aguardando pagamento'
                  AND pagamento_status = 'Aguardando pagamento'
                  AND pagamento_finalizado_em IS NULL
                  AND comprovante_caminho IS NULL
                RETURNING id_pedido
            `, [
                nomeArquivo,
                id,
                req.usuario.id_usuario
            ]);

            if (atualizado.rowCount === 0) {

                await fs.promises.unlink(destino);

                return res.status(409).json({
                    sucesso: false,
                    mensagem:
                        "O pedido foi alterado. Atualize a página."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Comprovante enviado com sucesso!"
            });

        } catch (erro) {

            // Remover arquivo caso o banco falhe.
            if (nomeArquivo) {

                const destino = path.join(
                    pastaComprovantes,
                    nomeArquivo
                );

                await fs.promises.unlink(destino)
                    .catch(() => {});
            }

            console.error(
                "Erro ao enviar comprovante:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao salvar o comprovante."
            });
        }
    }
);

// =====================================================
// VISUALIZAR COMPROVANTE DO PRÓPRIO PEDIDO
// =====================================================

router.get(
    "/pedidos/:id/comprovante",
    verificarAutenticacao,
    async (req, res) => {

        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Pedido inválido."
            });
        }

        try {

            const resultado = await pool.query(`
                SELECT comprovante_caminho
                FROM pedido_encomenda
                WHERE id_pedido = $1
                  AND id_usuario = $2
            `, [
                id,
                req.usuario.id_usuario
            ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Pedido não encontrado."
                });
            }

            const nome =
                resultado.rows[0].comprovante_caminho;

            if (!nome) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Nenhum comprovante enviado."
                });
            }

            // Impedir acesso a caminhos fora da pasta.
            if (path.basename(nome) !== nome) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Arquivo inválido."
                });
            }

            const arquivo = path.join(
                pastaComprovantes,
                nome
            );

            res.setHeader(
                "Content-Disposition",
                "inline"
            );

            res.setHeader(
                "X-Content-Type-Options",
                "nosniff"
            );

            return res.sendFile(arquivo);

        } catch (erro) {

            console.error(
                "Erro ao consultar comprovante:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao consultar comprovante."
            });
        }
    }
);


// Recuperar um Pix pendente do próprio cliente, sem criar outro pedido.
router.get("/pedidos/:id/pix", verificarAutenticacao, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "ID inválido." });
    }
    try {
        const resultado = await pool.query(`
            SELECT id_pedido, total, frete, desconto, pix_copia_cola
            FROM pedido_encomenda
            WHERE id_pedido = $1 AND id_usuario = $2
              AND status = 'Aguardando pagamento'
              AND pagamento_status = 'Aguardando pagamento'
              AND pagamento_finalizado_em IS NULL
        `, [id, req.usuario.id_usuario]);
        if (!resultado.rowCount) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido pendente não encontrado."
            });
        }
        return res.json({ sucesso: true, ...resultado.rows[0] });
    } catch (erro) {
        console.error("Erro ao recuperar Pix:", erro);
        return res.status(500).json({
            sucesso: false, mensagem: "Erro ao recuperar o Pix."
        });
    }
});


// =====================================================
// MEUS PEDIDOS - LISTAGEM DO CLIENTE LOGADO
// =====================================================
router.get("/meus-pedidos", verificarAutenticacao, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                p.id_pedido, p.status, p.pagamento_status,
                p.pagamento_finalizado_em, p.comprovante_enviado_em,
                p.criado_em, p.data_desejada, p.horario_desejado,
                p.modalidade, p.total, p.frete, p.desconto,
                p.cancelado_em, p.motivo_cancelamento,
                p.reembolso_status, p.valor_reembolso,
                COUNT(i.id_item)::integer AS quantidade_itens,
                COALESCE(SUM(i.quantidade), 0)::integer AS unidades
            FROM pedido_encomenda p
            LEFT JOIN item_encomenda i ON i.id_pedido = p.id_pedido
            WHERE p.id_usuario = $1
            GROUP BY p.id_pedido
            ORDER BY p.id_pedido DESC
        `, [req.usuario.id_usuario]);

        const pedidos = resultado.rows.map(p => ({
            ...p,
            status_exibicao:
                p.status === "Aguardando pagamento" && p.pagamento_finalizado_em
                    ? "Aguardando confirmação de pagamento"
                    : p.status,
            comprovante_enviado: Boolean(p.comprovante_enviado_em)
        }));

        return res.json({ sucesso: true, pedidos });
    } catch (erro) {
        console.error("Erro em Meus Pedidos:", erro);
        return res.status(500).json({
            sucesso: false, mensagem: "Não foi possível consultar seus pedidos."
        });
    }
});

module.exports = router;
