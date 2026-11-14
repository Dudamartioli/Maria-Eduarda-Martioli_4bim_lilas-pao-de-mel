
const pool = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================
// CADASTRAR CLIENTE
// ==========================================

const cadastrar = async (req, res) => {

    try {

        // Recebe os dados do formulário
        const { nome, email, senha, telefone } = req.body;

        // Verifica os campos obrigatórios
        if (typeof nome !== "string" ||
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !nome || !email || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos obrigatórios."
            });
        }

        // Verifica o tamanho da senha
        if (senha.length < 6) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "A senha deve ter pelo menos 6 caracteres."
            });
        }

        // Padroniza o e-mail
        const emailUsuario = email.trim().toLowerCase();

        // Verifica o formato básico do e-mail
        if (!emailUsuario.includes("@") ||
            !emailUsuario.includes(".")) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe um e-mail válido."
            });
        }

        // Procura se o e-mail já está cadastrado
        const procura = await pool.query(
            "SELECT id_usuario FROM usuario WHERE email = $1",
            [emailUsuario]
        );

        if (procura.rows.length > 0) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        // Transforma a senha em um hash
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o cliente no banco
        const resultado = await pool.query(
            `INSERT INTO usuario
            (nome, email, senha_hash, telefone, tipo_usuario)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_usuario, nome, email, tipo_usuario`,
            [
                nome.trim(),
                emailUsuario,
                senhaHash,
                telefone || null,
                "cliente"
            ]
        );

        // Retorna o resultado
        res.status(201).json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso!",
            usuario: resultado.rows[0]
        });

    } catch (erro) {

        console.log("Erro ao cadastrar:", erro);

        // Trata e-mails duplicados no PostgreSQL
        if (erro.code === "23505") {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar usuário."
        });
    }
};


// ==========================================
// REALIZAR LOGIN
// ==========================================

const login = async (req, res) => {

    try {

        // Recebe as credenciais
        const { email, senha } = req.body;

        // Verifica os campos
        if (typeof email !== "string" ||
            typeof senha !== "string" ||
            !email || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe o e-mail e a senha."
            });
        }

        // Procura o usuário no banco
        const resultado = await pool.query(
            "SELECT * FROM usuario WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        // Verifica se encontrou o usuário
        if (resultado.rows.length === 0) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }

        // Guarda o usuário encontrado
        const usuario = resultado.rows[0];

        // Compara a senha com o hash
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        // Verifica se a senha está correta
        if (!senhaCorreta) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }

        // Cria o token do usuário
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                tipo_usuario: usuario.tipo_usuario
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        // Cria o cookie de autenticação
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 2 * 60 * 60 * 1000
        });

        // Retorna a confirmação do login
        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!",
            usuario: {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo_usuario: usuario.tipo_usuario
            }
        });

    } catch (erro) {

        console.log("Erro no login:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao realizar login."
        });
    }
};


 // ==========================================
 // VERIFICAR USUÁRIO LOGADO
 // ==========================================

const verificar = async (req, res) => {

    try {

        // Recupera o ID do usuário pelo token
        const id_usuario = req.usuario.id_usuario;

        // Procura o usuário no banco de dados
        const resultado = await pool.query(
            `SELECT id_usuario, nome, email, tipo_usuario
             FROM usuario
             WHERE id_usuario = $1`,
            [id_usuario]
        );

        // Verifica se o usuário ainda existe
        if (resultado.rows.length === 0) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário não encontrado."
            });
        }

        // Guarda os dados encontrados
        const usuario = resultado.rows[0];

        // Retorna os dados do usuário logado
        res.json({
            sucesso: true,
            mensagem: "Usuário autenticado.",
            usuario: usuario
        });

    } catch (erro) {

        console.log("Erro ao verificar usuário:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao verificar autenticação."
        });
    }
};


 // ==========================================
 // LOGOUT DO USUÁRIO
 // ==========================================

const logout = (req, res) => {

    // Apaga o cookie utilizado no login
    res.clearCookie("token", { //pede ao navegador que apague o cookie criado durante o login.
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    // Retorna a confirmação do logout
    res.json({
        sucesso: true,
        mensagem: "Logout realizado com sucesso!"
    });
};


module.exports = {
    cadastrar,
    login,
    verificar,
    logout
};