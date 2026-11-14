
const jwt = require("jsonwebtoken");

// ==========================================
// VERIFICAR AUTENTICAÇÃO
// ==========================================

const verificarAutenticacao = (req, res, next) => {

    // Recupera o token armazenado no cookie
    const token = req.cookies.token;

    // Verifica se o cookie existe
    if (!token) {

        return res.status(401).json({
            sucesso: false,
            mensagem: "Você precisa fazer login."
        });
    }

    try {

        // Verifica se o token é verdadeiro e válido
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Guarda os dados do usuário na requisição
        req.usuario = usuario;

        // Permite continuar para a próxima função
        next();

    } catch (erro) {

        // Impede o acesso com token inválido ou expirado
        return res.status(401).json({
            sucesso: false,
            mensagem: "Sua sessão expirou. Faça login novamente."
        });
    }
};

// Exporta a função
module.exports = verificarAutenticacao;


//Entendendo o código
//- req.cookies.token: recupera o cookie que criamos durante o login.
//- jwt.verify(): verifica se o token é legítimo e se ainda está dentro das 2 horas de validade.
//- req.usuario = usuario: disponibiliza o ID e o tipo do usuário para as próximas funções.
//- next(): permite que o Express continue executando a rota solicitada.
//- res.status(401): impede o acesso quando o usuário não está autenticado.
// Uma coisa importante: o JavaScript do navegador não precisa ler o cookie diretamente. 
// Como utilizamos httpOnly, ele fica protegido contra a leitura por scripts da página.