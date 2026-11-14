
const pool = require("../database");

// ==========================================
// LISTAR CATEGORIAS
// ==========================================

const listar = async (req, res) => {

    try {

        const resultado = await pool.query(
            "SELECT * FROM categoria ORDER BY id_categoria"
        );

        res.json({
            sucesso: true,
            categorias: resultado.rows
        });

    } catch (erro) {

        console.log("Erro ao listar categorias:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar categorias."
        });
    }
};

// ==========================================
// PROCURAR CATEGORIA PELO ID
// ==========================================

const procurar = async (req, res) => {

    try {

        const resultado = await pool.query(
            "SELECT * FROM categoria WHERE id_categoria = $1",
            [req.params.id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            sucesso: true,
            categoria: resultado.rows[0]
        });

    } catch (erro) {

        console.log("Erro ao procurar categoria:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao procurar categoria."
        });
    }
};

// ==========================================
// INSERIR CATEGORIA
// ==========================================

const inserir = async (req, res) => {

    const { nome_categoria, descricao } = req.body;

    if (!nome_categoria || !nome_categoria.trim()) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o nome da categoria."
        });
    }

    try {

        const resultado = await pool.query(
            `INSERT INTO categoria
             (nome_categoria, descricao)
             VALUES ($1, $2)
             RETURNING *`,
            [nome_categoria.trim(), descricao || null]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Categoria cadastrada com sucesso!",
            categoria: resultado.rows[0]
        });

    } catch (erro) {

        if (erro.code === "23505") {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Essa categoria já está cadastrada."
            });
        }

        console.log("Erro ao inserir categoria:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar categoria."
        });
    }
};

// ==========================================
// ALTERAR CATEGORIA
// ==========================================

const alterar = async (req, res) => {

    const { nome_categoria, descricao } = req.body;

    if (!nome_categoria || !nome_categoria.trim()) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o nome da categoria."
        });
    }

    try {

        const resultado = await pool.query(
            `UPDATE categoria
             SET nome_categoria = $1,
                 descricao = $2
             WHERE id_categoria = $3
             RETURNING *`,
            [
                nome_categoria.trim(),
                descricao || null,
                req.params.id
            ]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Categoria alterada com sucesso!",
            categoria: resultado.rows[0]
        });

    } catch (erro) {

        if (erro.code === "23505") {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Já existe uma categoria com esse nome."
            });
        }

        console.log("Erro ao alterar categoria:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao alterar categoria."
        });
    }
};

// ==========================================
// EXCLUIR CATEGORIA
// ==========================================

const excluir = async (req, res) => {

    try {

        const resultado = await pool.query(
            `DELETE FROM categoria
             WHERE id_categoria = $1
             RETURNING *`,
            [req.params.id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Categoria excluída com sucesso!"
        });

    } catch (erro) {

        // Impede excluir categorias utilizadas em produtos
        if (erro.code === "23503") {

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Não é possível excluir uma categoria que possui produtos."
            });
        }

        console.log("Erro ao excluir categoria:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao excluir categoria."
        });
    }
};

// Exporta as funções
module.exports = {
    listar,
    procurar,
    inserir,
    alterar,
    excluir
};
