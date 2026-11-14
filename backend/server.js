/* ========================================
   LILA'S PÃO DE MEL - SERVIDOR
   ======================================== */

// Importa as bibliotecas
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");

// Carrega as configurações do .env
dotenv.config();

// Cria o servidor
const app = express();

// Configura o acesso do frontend pelo Live Server
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    credentials: true
}));

// Permite receber dados JSON
app.use(express.json());

// Permite ler cookies
app.use(cookieParser());

// ========================================
// ROTAS DO BACKEND
// ========================================

// Importa as rotas
const produtoRoutes = require("./routes/produtoRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const administradorRoutes = require("./routes/administradorRoutes");
const recuperacaoRoutes = require("./routes/recuperacaoRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const pagamentosAdminRoutes = require("./routes/pagamentosAdminRoutes");

// Listagem pública dos banners
app.use("/banner", bannerRoutes);

// Solicitações de encomenda (checkout)
app.use("/checkout", checkoutRoutes);
app.use("/pagamentos-admin", pagamentosAdminRoutes);

// Rotas dos produtos
app.use("/produto", produtoRoutes);

// Rotas dos usuários
app.use("/usuario", usuarioRoutes);

// Rotas protegidas da administração
app.use("/admin", administradorRoutes);

// Rotas para recuperar a senha
app.use("/recuperacao", recuperacaoRoutes);

// ========================================
// FRONTEND DA LILA'S
// ========================================

// Localiza a pasta frontend do projeto
const pastaFrontend = path.join(__dirname, "../frontend");

// Permite acessar HTML, CSS, JS e imagens
app.use(express.static(pastaFrontend));

// Abre a página inicial quando acessar o servidor
// Abre a página inicial mantendo os caminhos dos arquivos

// ========================================
// PÁGINA INICIAL CONFORME O TIPO DE USUÁRIO
// ========================================

// Importa o JWT para verificar o cookie
const jwt = require("jsonwebtoken");

// Decide a página inicial
app.get("/", function(req, res) {

    // Recupera o token salvo no cookie
    const token = req.cookies.token;

    // Visitante sem login: abre a loja
    if (!token) {

        return res.redirect("/menu/menu.html");
    }

    try {

        // Verifica se o token é válido
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Administrador: abre o painel
        if (usuario.tipo_usuario === "admin") {

            return res.redirect(
                "/administrador/admin.html"
            );
        }

        // Usuário com os dois tipos de acesso
        if (usuario.tipo_usuario === "ambos") {

            return res.redirect(
                "/escolher-acesso/escolher-acesso.html"
            );
        }

        // Cliente: abre a loja
        return res.redirect("/menu/menu.html");

    } catch (erro) {

        // Token expirado ou inválido
        res.clearCookie("token");

        // Abre a loja como visitante
        return res.redirect("/menu/menu.html");
    }
});


// ========================================
// INICIAR SERVIDOR
// ========================================

// Define a porta
const PORT = 3001;

// Inicia o servidor
app.listen(PORT, () => {

    console.log("Servidor executando na porta " + PORT);

    console.log(
        "Site disponível em http://localhost:" + PORT
    );
});
