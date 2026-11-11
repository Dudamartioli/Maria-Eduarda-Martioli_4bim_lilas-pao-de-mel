
const express = require("express");
const router = express.Router();

// Importa as funções do controller
const produtoController = require("../controllers/produtoController");

// Rota para listar todos os produtos
router.get("/listar", produtoController.listar);

// Exporta as rotas
module.exports = router;
