
const express = require("express");
const router = express.Router();

// Importa o controller de usuários
const usuarioController = require("../controllers/usuarioController");

// Importa a função que verifica o cookie
const verificarAutenticacao = require("../middlewares/autenticacao");

// Rota para cadastrar clientes
router.post("/cadastrar", usuarioController.cadastrar);

// Rota para realizar login
router.post("/login", usuarioController.login);

// Rota para verificar o usuário logado
router.get("/verificar", verificarAutenticacao, usuarioController.verificar);

// Rota para sair da conta
router.post("/logout", usuarioController.logout);

// Exporta as rotas
module.exports = router;
