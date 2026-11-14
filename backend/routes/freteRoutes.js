const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarAutenticacao = require("../middlewares/autenticacao");
const verificarAdministrador = require("../middlewares/administrador");

const cidades = ["Campo Mourão", "Goioerê"];
function dadosValidos(body) {
    const cidade = String(body.cidade || "").trim();
    const bairro = String(body.bairro || "").trim();
    const valor = Number(body.valor);
    if (!cidades.includes(cidade) || !bairro || bairro.length > 100 ||
        body.valor === "" || body.valor === null || body.valor === undefined ||
        !Number.isFinite(valor) || valor < 0 || Math.round(valor * 100) !== valor * 100) return null;
    return { cidade, bairro, valor, disponivel: body.disponivel !== false };
}

// Listagem pública: só bairros ativos; valores vêm do PostgreSQL.
router.get("/disponiveis", async (req, res) => {
    const cidade = String(req.query.cidade || "");
    if (cidade === "Quarto Centenário") {
        return res.json({ sucesso: true, bairros: [], gratuito: true });
    }
    if (!cidades.includes(cidade)) {
        return res.status(400).json({ sucesso: false, mensagem: "Cidade inválida." });
    }
    try {
        const r = await pool.query(
            "SELECT bairro, valor FROM frete_bairro WHERE cidade = $1 AND disponivel = TRUE ORDER BY bairro",
            [cidade]
        );
        res.json({ sucesso: true, bairros: r.rows, gratuito: false });
    } catch (erro) {
        console.error("Erro ao listar fretes:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao consultar bairros." });
    }
});

// CRUD somente para administradores.
router.use(verificarAutenticacao);
router.use(verificarAdministrador);

router.get("/", async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM frete_bairro ORDER BY cidade, bairro");
        res.json({ sucesso: true, fretes: r.rows });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao listar fretes." });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM frete_bairro WHERE id_frete = $1", [req.params.id]);
        if (!r.rowCount) return res.status(404).json({ sucesso: false, mensagem: "Frete não encontrado." });
        res.json({ sucesso: true, frete: r.rows[0] });
    } catch (erro) {
        res.status(400).json({ sucesso: false, mensagem: "ID inválido." });
    }
});
router.post("/", async (req, res) => {
    const d = dadosValidos(req.body);
    if (!d) return res.status(400).json({ sucesso: false, mensagem: "Informe cidade, bairro e preço válido." });
    try {
        const r = await pool.query(
            "INSERT INTO frete_bairro(cidade,bairro,valor,disponivel) VALUES($1,$2,$3,$4) RETURNING *",
            [d.cidade,d.bairro,d.valor,d.disponivel]
        );
        res.status(201).json({ sucesso: true, frete: r.rows[0] });
    } catch (erro) {
        res.status(erro.code === "23505" ? 409 : 500).json({
            sucesso: false, mensagem: erro.code === "23505" ? "Bairro já cadastrado nesta cidade." : "Erro ao cadastrar."
        });
    }
});
router.put("/:id", async (req, res) => {
    const d = dadosValidos(req.body);
    if (!d) return res.status(400).json({ sucesso: false, mensagem: "Dados inválidos." });
    try {
        const r = await pool.query(
            "UPDATE frete_bairro SET cidade=$1,bairro=$2,valor=$3,disponivel=$4 WHERE id_frete=$5 RETURNING *",
            [d.cidade,d.bairro,d.valor,d.disponivel,req.params.id]
        );
        if (!r.rowCount) return res.status(404).json({ sucesso: false, mensagem: "Frete não encontrado." });
        res.json({ sucesso: true, frete: r.rows[0] });
    } catch (erro) {
        res.status(erro.code === "23505" ? 409 : 500).json({
            sucesso: false, mensagem: erro.code === "23505" ? "Bairro já cadastrado nesta cidade." : "Erro ao alterar."
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const r = await pool.query("DELETE FROM frete_bairro WHERE id_frete=$1 RETURNING id_frete", [req.params.id]);
        if (!r.rowCount) return res.status(404).json({ sucesso: false, mensagem: "Frete não encontrado." });
        res.json({ sucesso: true, mensagem: "Frete excluído." });
    } catch (erro) {
        res.status(400).json({ sucesso: false, mensagem: "Não foi possível excluir o frete." });
    }
});
module.exports = router;
