
const pool = require("../database");

// Lista os produtos cadastrados no banco
const listar = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT produto.*, sabor.nome_sabor,
                    categoria.nome_categoria
             FROM produto
             INNER JOIN sabor
             ON produto.id_sabor = sabor.id_sabor
             INNER JOIN categoria
             ON produto.id_categoria = categoria.id_categoria
             WHERE produto.disponivel = true
             ORDER BY produto.id_produto`
        );

        // Envia os produtos para o frontend
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

// Exporta a função
module.exports = {
    listar
};
