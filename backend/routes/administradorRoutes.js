
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

// Histórico de clientes: somente administradores autenticados.
router.get('/historico-clientes', async (req, res) => {
    const pool = require('../database');
    const ano = req.query.ano ? Number(req.query.ano) : null;
    if (ano !== null && (!Number.isInteger(ano) || ano < 2000 || ano > 2100))
        return res.status(400).json({ sucesso: false, mensagem: 'Ano inválido.' });
    try {
        const resultado = await pool.query(`
            SELECT u.id_usuario, u.nome, u.email,
              COUNT(p.id_pedido) FILTER (WHERE p.status = 'Concluído')::int AS pedidos_finalizados,
              COALESCE(SUM(p.total) FILTER (WHERE p.status = 'Concluído'),0)::numeric AS total_gasto,
              COALESCE(SUM(it.unidades) FILTER (WHERE p.status = 'Concluído'),0)::int AS unidades,
              COUNT(p.id_pedido) FILTER (WHERE p.status NOT IN ('Concluído','Cancelado'))::int AS em_andamento
            FROM usuario u
            LEFT JOIN pedido_encomenda p ON p.id_usuario=u.id_usuario
              AND ($1::int IS NULL OR EXTRACT(YEAR FROM p.criado_em)::int=$1)
            LEFT JOIN LATERAL (SELECT SUM(quantidade)::int AS unidades FROM item_encomenda
                               WHERE id_pedido=p.id_pedido) it ON TRUE
            WHERE u.tipo_usuario IN ('cliente','ambos') OR p.id_pedido IS NOT NULL
            GROUP BY u.id_usuario, u.nome, u.email
            ORDER BY pedidos_finalizados DESC, total_gasto DESC, u.nome`, [ano]);
        res.json({ sucesso: true, clientes: resultado.rows });
    } catch (erro) {
        console.error('Histórico de clientes:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar histórico.' });
    }
});

router.get('/historico-clientes/:id/pedidos', async (req, res) => {
    const pool = require('../database');
    if (!/^[1-9]\d*$/.test(req.params.id))
        return res.status(400).json({ sucesso: false, mensagem: 'Cliente inválido.' });
    const ano = req.query.ano ? Number(req.query.ano) : null;
    if (ano !== null && (!Number.isInteger(ano) || ano < 2000 || ano > 2100))
        return res.status(400).json({ sucesso: false, mensagem: 'Ano inválido.' });
    try {
        const resultado = await pool.query(`
            SELECT p.id_pedido, p.criado_em, p.status, p.total,
                   COALESCE(SUM(i.quantidade),0)::int AS unidades
            FROM pedido_encomenda p
            LEFT JOIN item_encomenda i ON i.id_pedido=p.id_pedido
            WHERE p.id_usuario=$1 AND ($2::int IS NULL OR EXTRACT(YEAR FROM p.criado_em)::int=$2)
            GROUP BY p.id_pedido ORDER BY p.criado_em DESC, p.id_pedido DESC`, [req.params.id,ano]);
        res.json({ sucesso: true, pedidos: resultado.rows });
    } catch (erro) {
        console.error('Pedidos do cliente:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar pedidos.' });
    }
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
