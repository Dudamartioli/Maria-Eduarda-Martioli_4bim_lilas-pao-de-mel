
const express = require("express");
const router = express.Router();

// Importa as funções do controller
const produtoController = require("../controllers/produtoController");

// Rota para listar todos os produtos
router.get("/listar", produtoController.listar);

// Listagem pública das imagens (sem permitir edição)
const imagemProdutoController = require("../controllers/imagemProdutoController");
router.get("/:id/imagens", imagemProdutoController.listar);

// Exporta as rotas
module.exports = router;
