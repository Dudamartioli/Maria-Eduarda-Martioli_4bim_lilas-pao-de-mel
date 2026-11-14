
const pool = require("../database");

// ==========================================
// VERIFICAR ADMINISTRADOR
// ==========================================

const verificarAdministrador = async (req, res, next) => {

    try {

        // Recupera o ID do usuário autenticado
        const id_usuario = req.usuario.id_usuario;

        // Procura o usuário no banco de dados
        const resultado = await pool.query(
            `SELECT tipo_usuario
             FROM usuario
             WHERE id_usuario = $1`,
            [id_usuario]
        );

        // Verifica se o usuário existe
        if (resultado.rows.length === 0) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário não encontrado."
            });
        }

        // Recupera o tipo do usuário
        const tipo_usuario = resultado.rows[0].tipo_usuario;

        // Mostra no terminal o usuário autenticado e sua permissão
console.log("ID do usuário autenticado:", id_usuario);
console.log("Tipo de usuário no banco:", tipo_usuario);

        // Verifica se possui permissão administrativa
        if (tipo_usuario !== "admin" &&
            tipo_usuario !== "ambos") {

            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso permitido somente para administradores."
            });
        }

        // Permite continuar para a próxima função
        next();

    } catch (erro) {

        console.log("Erro ao verificar administrador:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao verificar permissão."
        });
    }
};

// Exporta a função
module.exports = verificarAdministrador;
