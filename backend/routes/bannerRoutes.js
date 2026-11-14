/* ========================================
   LILA'S - ROTAS PÚBLICAS DOS BANNERS
   ======================================== */
const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/bannerController");

// O cliente só pode consultar banners ativos.
router.get("/listar", bannerController.listarPublicos);

module.exports = router;
