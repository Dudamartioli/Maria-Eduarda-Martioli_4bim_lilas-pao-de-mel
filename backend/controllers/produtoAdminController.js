
/* ==========================================
   LILA'S - CRUD ADMINISTRATIVO DE PRODUTOS
   ========================================== */

const pool = require("../database");

// ==========================================
// LISTAR PRODUTOS
// ==========================================

const listar = async (req, res) => {

    try {

        // Lista todos, inclusive os indisponíveis
        const resultado = await pool.query(
            `SELECT produto.*,
                    categoria.nome_categoria,
                    sabor.nome_sabor
             FROM produto
             INNER JOIN categoria
                 ON produto.id_categoria = categoria.id_categoria
             INNER JOIN sabor
                 ON produto.id_sabor = sabor.id_sabor
             ORDER BY produto.id_produto`
        );

        res.json({
            sucesso: true,
            produtos: resultado.rows
        });

    } catch (erro) {

        console.log("Erro ao listar produtos:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar produtos."
        });
    }
};

// ==========================================
// PROCURAR PRODUTO
// ==========================================

const procurar = async (req, res) => {

    try {

        const resultado = await pool.query(
            "SELECT * FROM produto WHERE id_produto = $1",
            [req.params.id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Produto não encontrado."
            });
        }

        res.json({
            sucesso: true,
            produto: resultado.rows[0]
        });

    } catch (erro) {

        console.log("Erro ao procurar produto:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao procurar produto."
        });
    }
};

// ==========================================
// VALIDAR DADOS DO PRODUTO
// ==========================================

function validarProduto(dados) {

    const {
        nome_produto,
        descricao,
        preco,
        id_categoria,
        id_sabor,
        estoque_pronto
    } = dados;

    if (typeof nome_produto !== "string" ||
        !nome_produto.trim()) {
        return "Informe o nome do produto.";
    }

    if (nome_produto.trim().length > 100) {
        return "O nome deve ter até 100 caracteres.";
    }

    if (descricao !== undefined &&
        descricao !== null &&
        (typeof descricao !== "string" ||
         descricao.length > 200)) {
        return "A descrição deve ter até 200 caracteres.";
    }

    if (preco === "" || preco === null ||
        preco === undefined ||
        !Number.isFinite(Number(preco)) ||
        Number(preco) <= 0) {
        return "Informe um preço válido, maior que zero.";
    }

    if (!Number.isInteger(Number(id_categoria)) ||
        Number(id_categoria) <= 0) {
        return "Selecione uma categoria válida.";
    }

    if (!Number.isInteger(Number(id_sabor)) ||
        Number(id_sabor) <= 0) {
        return "Selecione um sabor válido.";
    }

    if (!Number.isSafeInteger(Number(estoque_pronto)) || Number(estoque_pronto) < 0) {
        return "Informe uma quantidade de estoque válida (zero ou maior).";
    }
    return null;
}

// ==========================================
// INSERIR PRODUTO
// ==========================================

const inserir = async (req, res) => {

    const dados = req.body;
    const erroValidacao = validarProduto(dados);

    if (erroValidacao) {

        return res.status(400).json({
            sucesso: false,
            mensagem: erroValidacao
        });
    }

    try {

        const resultado = await pool.query(
            `INSERT INTO produto
             (nome_produto, descricao, preco,
              disponivel, id_categoria, id_sabor, estoque_pronto)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                dados.nome_produto.trim(),
                dados.descricao?.trim() || null,
                Number(dados.preco),
                dados.disponivel === true,
                Number(dados.id_categoria),
                Number(dados.id_sabor),
                Number(dados.estoque_pronto)
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Produto cadastrado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {

        tratarErro(erro, res, "cadastrar");
    }
};

// ==========================================
// ALTERAR PRODUTO
// ==========================================

const alterar = async (req, res) => {

    const dados = req.body;
    const erroValidacao = validarProduto(dados);

    if (erroValidacao) {

        return res.status(400).json({
            sucesso: false,
            mensagem: erroValidacao
        });
    }

    try {

        const resultado = await pool.query(
            `UPDATE produto
             SET nome_produto = $1,
                 descricao = $2,
                 preco = $3,
                 disponivel = $4,
                 id_categoria = $5,
                 id_sabor = $6,
                 estoque_pronto = $8
             WHERE id_produto = $7
             RETURNING *`,
            [
                dados.nome_produto.trim(),
                dados.descricao?.trim() || null,
                Number(dados.preco),
                dados.disponivel === true,
                Number(dados.id_categoria),
                Number(dados.id_sabor),
                req.params.id,
                Number(dados.estoque_pronto)
            ]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Produto não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Produto alterado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {

        tratarErro(erro, res, "alterar");
    }
};

// ==========================================
// EXCLUIR PRODUTO
// ==========================================

const excluir = async (req, res) => {

    try {

        const resultado = await pool.query(
            `DELETE FROM produto
             WHERE id_produto = $1
             RETURNING *`,
            [req.params.id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Produto não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Produto excluído com sucesso!"
        });

    } catch (erro) {

        tratarErro(erro, res, "excluir");
    }
};

// ==========================================
// TRATAR ERROS DO BANCO
// ==========================================

function tratarErro(erro, res, operacao) {

    if (erro.code === "23505") {

        return res.status(409).json({
            sucesso: false,
            mensagem:
                "Já existe um produto com esse nome e sabor."
        });
    }

    if (erro.code === "23503") {

        return res.status(409).json({
            sucesso: false,
            mensagem:
                operacao === "excluir"
                    ? "Este produto está vinculado a pedidos e não pode ser excluído. Você pode marcá-lo como indisponível."
                    : "A categoria ou o sabor selecionado não existe."
        });
    }

    console.log("Erro ao " + operacao + " produto:", erro);

    res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao " + operacao + " produto."
    });
}

// Exporta as funções
module.exports = {
    listar,
    procurar,
    inserir,
    alterar,
    excluir
};
