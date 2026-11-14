
const express = require("express");
const router = express.Router();

// Importa os middlewares
const verificarAutenticacao = require("../middlewares/autenticacao");
const verificarAdministrador = require("../middlewares/administrador");

// Importa o controller de categorias
const categoriaController = require("../controllers/categoriaController");
// Importa o controller de sabores
const saborController = require("../controllers/saborController");
const produtoAdminController = require("../controllers/produtoAdminController");
// Controller das imagens dos produtos
const imagemProdutoController = require("../controllers/imagemProdutoController");


const bannerController = require("../controllers/bannerController");

// CRUD administrativo de usuários
const usuarioAdminController = require("../controllers/usuarioAdminController");

// Protege todas as rotas administrativas
router.use(verificarAutenticacao);
router.use(verificarAdministrador);

// ==========================================
// VERIFICAR ADMINISTRADOR
// ==========================================

router.get("/verificar", (req, res) => {

    res.json({
        sucesso: true,
        mensagem: "Acesso administrativo autorizado."
    });
});

// ==========================================
// CRUD DE CATEGORIAS
// ==========================================

// Lista todas as categorias
router.get("/categoria/listar", categoriaController.listar);

// Procura uma categoria pelo ID
router.get("/categoria/:id", categoriaController.procurar);

// Cadastra uma categoria
router.post("/categoria", categoriaController.inserir);

// Altera uma categoria
router.put("/categoria/:id", categoriaController.alterar);

// Exclui uma categoria
router.delete("/categoria/:id", categoriaController.excluir);


// ==========================================
// CRUD DE SABORES
// ==========================================

// Lista todos os sabores
router.get("/sabor/listar", saborController.listar);

// Procura um sabor pelo ID
router.get("/sabor/:id", saborController.procurar);

// Cadastra um sabor
router.post("/sabor", saborController.inserir);

// Altera um sabor
router.put("/sabor/:id", saborController.alterar);

// Exclui um sabor
router.delete("/sabor/:id", saborController.excluir);


// ==========================================
// CRUD ADMINISTRATIVO DE PRODUTOS
// ==========================================

// Lista todos os produtos
router.get("/produto/listar", produtoAdminController.listar);

// Procura um produto pelo ID
router.get("/produto/:id", produtoAdminController.procurar);

// Insere um produto
router.post("/produto", produtoAdminController.inserir);

// Altera um produto
router.put("/produto/:id", produtoAdminController.alterar);

// Exclui um produto
router.delete("/produto/:id", produtoAdminController.excluir);


// ==========================================
// IMAGENS DOS PRODUTOS
// ==========================================

// Lista as imagens de um produto
router.get(
    "/produto/:id/imagens",
    imagemProdutoController.listar
);

// Envia várias imagens
router.post(
    "/produto/:id/imagens",
    imagemProdutoController.enviar
);

// Exclui uma imagem específica
router.delete(
    "/produto/:id/imagens/:nome",
    imagemProdutoController.excluir
);


// CRUD ADMINISTRATIVO DE BANNERS
router.get("/banner/listar", bannerController.listar);
router.get("/banner/:id", bannerController.procurar);
router.post("/banner", bannerController.receberImagem, bannerController.inserir);
router.put("/banner/:id", bannerController.receberImagem, bannerController.alterar);
router.delete("/banner/:id", bannerController.excluir);

// CRUD DE USUÁRIOS (todas as rotas protegidas pelos middlewares acima)
router.get("/usuario/listar", usuarioAdminController.listar);
router.get("/usuario/:id", usuarioAdminController.procurar);
router.post("/usuario", usuarioAdminController.inserir);
router.put("/usuario/:id", usuarioAdminController.alterar);
router.delete("/usuario/:id", usuarioAdminController.excluir);

// Exporta as rotas
module.exports = router;
