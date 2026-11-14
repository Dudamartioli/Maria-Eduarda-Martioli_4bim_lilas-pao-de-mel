
const pool = require("../database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { enviarEmailRecuperacao } = require(
    "../services/emailService"
);

// ==========================================
// SOLICITAR RECUPERAÇÃO
// ==========================================

const solicitarRecuperacao = async (req, res) => {

    try {

        // Recebe o e-mail digitado
        const { email } = req.body;

        // Verifica se o e-mail foi informado
        if (typeof email !== "string" || !email) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe seu e-mail."
            });
        }

        // Mensagem igual para e-mails existentes ou não
        const mensagem =
            "Se o e-mail estiver cadastrado, você receberá um link de recuperação.";

        // Procura o usuário no banco
        const resultado = await pool.query(
            "SELECT id_usuario, email FROM usuario WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        // Não revela se o e-mail existe
        if (resultado.rows.length === 0) {

            return res.json({
                sucesso: true,
                mensagem: mensagem
            });
        }

        // Guarda os dados do usuário
        const usuario = resultado.rows[0];

        // Gera um token aleatório
        const token = crypto.randomBytes(32).toString("hex");

        // Cria o hash do token
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Define a validade de 15 minutos
        const expiracao = new Date(
            Date.now() + 15 * 60 * 1000
        );

        // Invalida links anteriores desse usuário
        await pool.query(
            `UPDATE recuperacao_senha
             SET utilizado = TRUE
             WHERE id_usuario = $1`,
            [usuario.id_usuario]
        );

        // Salva somente o hash do token
        await pool.query(
            `INSERT INTO recuperacao_senha
             (id_usuario, token_hash, data_expiracao, utilizado)
             VALUES ($1, $2, $3, FALSE)`,
            [
                usuario.id_usuario,
                tokenHash,
                expiracao
            ]
        );

        // Monta o link para a página de redefinição
        const link =
            process.env.URL_FRONTEND +
            "/frontend/login/redefinir-senha.html?token=" +
            token;

        // Envia o link por e-mail
        await enviarEmailRecuperacao(
            usuario.email,
            link
        );

        // Retorna a mensagem
        res.json({
            sucesso: true,
            mensagem: mensagem
        });

    } catch (erro) {

        console.log("Erro na recuperação:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível processar a solicitação."
        });
    }
};


// ==========================================
// REDEFINIR SENHA
// ==========================================

const redefinirSenha = async (req, res) => {

    // Guarda a conexão para controlar a transação
    let conexao;

    try {

        // Recebe o token e a nova senha
        const { token, novaSenha } = req.body;

        // Verifica os dados
        if (typeof token !== "string" ||
            typeof novaSenha !== "string" ||
            !token ||
            novaSenha.length < 6) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe um link válido e uma senha com pelo menos 6 caracteres."
            });
        }

        // Verifica o formato do token
        if (!/^[a-f0-9]{64}$/.test(token)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Link inválido ou expirado."
            });
        }

        // Cria o hash do token recebido
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Cria o hash da nova senha
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Abre uma conexão com o PostgreSQL
        conexao = await pool.connect();

        // Inicia uma transação
        await conexao.query("BEGIN");

        // Procura e bloqueia a recuperação durante a alteração
        const resultado = await conexao.query(
            `SELECT id_recuperacao, id_usuario
             FROM recuperacao_senha
             WHERE token_hash = $1
               AND utilizado = FALSE
               AND data_expiracao > CURRENT_TIMESTAMP
             FOR UPDATE`,
            [tokenHash]
        );

        // Verifica se o link ainda é válido
        if (resultado.rows.length === 0) {

            await conexao.query("ROLLBACK");

            return res.status(400).json({
                sucesso: false,
                mensagem: "Link inválido, expirado ou já utilizado."
            });
        }

        // Guarda os dados da recuperação
        const recuperacao = resultado.rows[0];

        // Atualiza a senha do usuário
        await conexao.query(
            `UPDATE usuario
             SET senha_hash = $1
             WHERE id_usuario = $2`,
            [
                senhaHash,
                recuperacao.id_usuario
            ]
        );

        // Invalida todos os links de recuperação do usuário
        await conexao.query(
            `UPDATE recuperacao_senha
             SET utilizado = TRUE
             WHERE id_usuario = $1`,
            [recuperacao.id_usuario]
        );

        // Confirma as alterações
        await conexao.query("COMMIT");

        // Retorna a confirmação
        res.json({
            sucesso: true,
            mensagem: "Senha redefinida com sucesso! Faça login novamente."
        });

    } catch (erro) {

        // Desfaz alterações em caso de erro
        if (conexao) {
            await conexao.query("ROLLBACK");
        }

        console.log("Erro ao redefinir senha:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao redefinir senha."
        });

    } finally {

        // Libera a conexão
        if (conexao) {
            conexao.release();
        }
    }
};


// Exporta as funções
module.exports = {
    solicitarRecuperacao,
    redefinirSenha
};
