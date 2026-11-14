
const express = require("express");
const router = express.Router();

// Importa o controller
const recuperacaoController = require(
    "../controllers/recuperacaoController"
);

// Solicita o envio do e-mail
router.post(
    "/solicitar",
    recuperacaoController.solicitarRecuperacao
);

// Redefine a senha
router.post(
    "/redefinir",
    recuperacaoController.redefinirSenha
);

// Exporta as rotas
module.exports = router;
