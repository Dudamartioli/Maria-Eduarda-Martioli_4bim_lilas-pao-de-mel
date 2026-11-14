
/* ==========================================
   LILA'S - CONTROLLER DE SABORES
   ========================================== */

// Importa a conexão com o PostgreSQL
const pool = require("../database");


// ==========================================
// LISTAR TODOS OS SABORES
// ==========================================

const listar = async (req, res) => {

    try {

        // Busca todos os sabores no banco
        const resultado = await pool.query(
            "SELECT * FROM sabor ORDER BY id_sabor"
        );

        // Envia a lista para o frontend
        res.json({
            sucesso: true,
            sabores: resultado.rows
        });

    } catch (erro) {

        console.log("Erro ao listar sabores:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar sabores."
        });
    }
};


// ==========================================
// PROCURAR SABOR PELO ID
// ==========================================

const procurar = async (req, res) => {

    // Recebe o ID enviado pela URL
    const id = req.params.id;

    try {

        // Procura o sabor no banco
        const resultado = await pool.query(
            "SELECT * FROM sabor WHERE id_sabor = $1",
            [id]
        );

        // Verifica se o sabor existe
        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Sabor não encontrado."
            });
        }

        // Retorna o sabor encontrado
        res.json({
            sucesso: true,
            sabor: resultado.rows[0]
        });

    } catch (erro) {

        console.log("Erro ao procurar sabor:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao procurar sabor."
        });
    }
};


// ==========================================
// INSERIR SABOR
// ==========================================

const inserir = async (req, res) => {

    // Recebe os dados do frontend
    const { nome_sabor, descricao } = req.body;

    // Verifica se o nome foi preenchido
    if (!nome_sabor || !nome_sabor.trim()) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o nome do sabor."
        });
    }

    // Verifica o tamanho dos campos
    if (nome_sabor.trim().length > 80 ||
        (descricao && descricao.length > 200)) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Um dos campos ultrapassou o tamanho permitido."
        });
    }

    try {

        // Insere o sabor no banco
        const resultado = await pool.query(
            `INSERT INTO sabor
             (nome_sabor, descricao)
             VALUES ($1, $2)
             RETURNING *`,
            [
                nome_sabor.trim(),
                descricao ? descricao.trim() : null
            ]
        );

        // Informa que o cadastro funcionou
        res.status(201).json({
            sucesso: true,
            mensagem: "Sabor cadastrado com sucesso!",
            sabor: resultado.rows[0]
        });

    } catch (erro) {

        // O nome do sabor deve ser único
        if (erro.code === "23505") {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Esse sabor já está cadastrado."
            });
        }

        console.log("Erro ao inserir sabor:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar sabor."
        });
    }
};


// ==========================================
// ALTERAR SABOR
// ==========================================

const alterar = async (req, res) => {

    // Recebe o ID e os dados
    const id = req.params.id;
    const { nome_sabor, descricao } = req.body;

    // Verifica se o nome foi preenchido
    if (!nome_sabor || !nome_sabor.trim()) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o nome do sabor."
        });
    }

    // Verifica o tamanho dos campos
    if (nome_sabor.trim().length > 80 ||
        (descricao && descricao.length > 200)) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Um dos campos ultrapassou o tamanho permitido."
        });
    }

    try {

        // Atualiza o sabor no banco
        const resultado = await pool.query(
            `UPDATE sabor
             SET nome_sabor = $1,
                 descricao = $2
             WHERE id_sabor = $3
             RETURNING *`,
            [
                nome_sabor.trim(),
                descricao ? descricao.trim() : null,
                id
            ]
        );

        // Verifica se o ID existe
        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Sabor não encontrado."
            });
        }

        // Informa que a alteração funcionou
        res.json({
            sucesso: true,
            mensagem: "Sabor alterado com sucesso!",
            sabor: resultado.rows[0]
        });

    } catch (erro) {

        // Impede nomes duplicados
        if (erro.code === "23505") {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Já existe um sabor com esse nome."
            });
        }

        console.log("Erro ao alterar sabor:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao alterar sabor."
        });
    }
};


// ==========================================
// EXCLUIR SABOR
// ==========================================

const excluir = async (req, res) => {

    // Recebe o ID do sabor
    const id = req.params.id;

    try {

        // Exclui o sabor do banco
        const resultado = await pool.query(
            `DELETE FROM sabor
             WHERE id_sabor = $1
             RETURNING *`,
            [id]
        );

        // Verifica se o sabor existia
        if (resultado.rows.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: "Sabor não encontrado."
            });
        }

        // Confirma a exclusão
        res.json({
            sucesso: true,
            mensagem: "Sabor excluído com sucesso!"
        });

    } catch (erro) {

        // Impede excluir sabores utilizados por produtos
        if (erro.code === "23503") {

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Não é possível excluir um sabor utilizado por produtos ou pedidos."
            });
        }

        console.log("Erro ao excluir sabor:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao excluir sabor."
        });
    }
};


// ==========================================
// EXPORTAR FUNÇÕES
// ==========================================

module.exports = {
    listar,
    procurar,
    inserir,
    alterar,
    excluir
};
