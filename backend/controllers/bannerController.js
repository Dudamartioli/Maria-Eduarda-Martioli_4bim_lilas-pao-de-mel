/* =============================================
   LILA'S - GERENCIADOR DE BANNERS
   Dados em JSON e imagens em pasta
   ============================================= */

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

const arquivoDados = path.join(__dirname, "../dados/banners.json");
const pastaImagens = path.join(__dirname, "../../frontend/imagens-banners");

// Recebe uma imagem JPG ou PNG de até 5 MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, arquivo, callback) {
        if (!["image/jpeg", "image/png"].includes(arquivo.mimetype)) {
            return callback(new Error("Envie uma imagem JPG, JPEG ou PNG."));
        }
        callback(null, true);
    }
}).single("imagem");

// Lê os banners salvos.
async function lerBanners() {
    const conteudo = await fs.readFile(arquivoDados, "utf8");
    return JSON.parse(conteudo);
}

// Salva os dados primeiro em arquivo temporário para evitar JSON incompleto.
async function salvarBanners(banners) {
    const temporario = arquivoDados + ".tmp";
    await fs.writeFile(temporario, JSON.stringify(banners, null, 2), "utf8");
    await fs.rename(temporario, arquivoDados);
}

// Ordena os banners pela posição definida pela administradora.
function ordenar(banners) {
    return banners.sort((a, b) => a.ordem - b.ordem || a.id - b.id);
}

// Retorna os banners ativos para o site público.
const listarPublicos = async (req, res) => {
    try {
        const banners = await lerBanners();
        res.json({ sucesso: true, banners: ordenar(banners.filter(b => b.ativo)) });
    } catch (erro) {
        console.error("Erro ao listar banners:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao listar banners." });
    }
};

// Retorna todos os banners para o painel administrativo.
const listar = async (req, res) => {
    try {
        res.json({ sucesso: true, banners: ordenar(await lerBanners()) });
    } catch (erro) {
        console.error("Erro ao listar banners:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao listar banners." });
    }
};

// Procura um banner pelo ID.
const procurar = async (req, res) => {
    try {
        const banners = await lerBanners();
        const banner = banners.find(b => b.id === Number(req.params.id));
        if (!banner) return res.status(404).json({ sucesso: false, mensagem: "Banner não encontrado." });
        res.json({ sucesso: true, banner });
    } catch (erro) {
        console.error("Erro ao procurar banner:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao procurar banner." });
    }
};

// Aceita somente texto simples, com tamanho máximo.
function texto(valor, maximo = 300) {
    return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}

// Só permite links internos (#seção ou /página) e HTTPS.
function linkSeguro(valor) {
    const link = texto(valor, 500);

    // Link vazio significa que o banner não terá botão
    if (link === "") return "";
    if (/^#[a-zA-Z0-9_-]+$/.test(link) || /^\/(?!\/)[a-zA-Z0-9/_#.?=&%-]*$/.test(link) || /^https:\/\/[^\s]+$/i.test(link)) return link;
    return null;
}

// Valida a posição do banner.
function obterOrdem(valor, padrao) {
    if (valor === undefined || valor === "") return padrao;
    const numero = Number(valor);
    return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

// Valida o campo de disponibilidade.
function obterAtivo(valor, padrao) {
    if (valor === undefined) return padrao;
    if (valor === true || valor === "true") return true;
    if (valor === false || valor === "false") return false;
    return null;
}

// Converte a foto para JPG e cria um nome único.
async function salvarImagem(arquivo) {
    if (!arquivo) return null;
    const metadados = await sharp(arquivo.buffer).metadata();
    if (!["jpeg", "png"].includes(metadados.format)) {
        throw new Error("Imagem inválida. Use JPG, JPEG ou PNG.");
    }
    await fs.mkdir(pastaImagens, { recursive: true });
    const nome = "banner-" + crypto.randomUUID() + ".jpg";
    const caminho = path.join(pastaImagens, nome);
    await sharp(arquivo.buffer)
        .rotate()
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(caminho);
    return "/imagens-banners/" + nome;
}

// Apaga somente imagens geradas pelo gerenciador.
async function apagarImagemGerenciada(imagem) {
    const nome = path.posix.basename(imagem || "");
    if (!/^banner-[0-9a-f-]{36}\.jpg$/i.test(nome)) return;
    if (imagem !== "/imagens-banners/" + nome) return;
    try {
        await fs.unlink(path.join(pastaImagens, nome));
    } catch (erro) {
        if (erro.code !== "ENOENT") console.error("Erro ao apagar imagem:", erro);
    }
}

// Cadastra um novo banner.
const inserir = async (req, res) => {
    let novaImagem = null;
    try {
        const banners = await lerBanners();
        const titulo = texto(req.body.titulo);
        const destaque = texto(req.body.destaque);
        const descricao = texto(req.body.descricao, 1000);
        const texto_botao = texto(req.body.texto_botao, 100);
        const link_botao = linkSeguro(req.body.link_botao);
        const ordem = obterOrdem(req.body.ordem, banners.length + 1);
        const ativo = obterAtivo(req.body.ativo, true);

        if (!titulo || !req.file || link_botao === null || ordem === null || ativo === null) {
            return res.status(400).json({ sucesso: false, mensagem: "Informe título e imagem válidos, além de ordem, link e disponibilidade válidos." });
        }

        novaImagem = await salvarImagem(req.file);
        const id = Math.max(0, ...banners.map(b => b.id)) + 1;
        const banner = { id, titulo, destaque, descricao, texto_botao, link_botao, imagem: novaImagem, ordem, ativo };
        banners.push(banner);
        await salvarBanners(banners);
        res.status(201).json({ sucesso: true, mensagem: "Banner cadastrado!", banner });
    } catch (erro) {
        if (novaImagem) await apagarImagemGerenciada(novaImagem);
        console.error("Erro ao cadastrar banner:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao cadastrar banner." });
    }
};

// Altera texto, posição, disponibilidade e, opcionalmente, a imagem.
const alterar = async (req, res) => {
    let novaImagem = null;
    try {
        const banners = await lerBanners();
        const banner = banners.find(b => b.id === Number(req.params.id));
        if (!banner) return res.status(404).json({ sucesso: false, mensagem: "Banner não encontrado." });

        const titulo = req.body.titulo === undefined ? banner.titulo : texto(req.body.titulo);
        const destaque = req.body.destaque === undefined ? banner.destaque : texto(req.body.destaque);
        const descricao = req.body.descricao === undefined ? banner.descricao : texto(req.body.descricao, 1000);
        const texto_botao = req.body.texto_botao === undefined ? banner.texto_botao : texto(req.body.texto_botao, 100);
        const link_botao = req.body.link_botao === undefined ? banner.link_botao : linkSeguro(req.body.link_botao);
        const ordem = obterOrdem(req.body.ordem, banner.ordem);
        const ativo = obterAtivo(req.body.ativo, banner.ativo);

        if (!titulo || link_botao === null || ordem === null || ativo === null) {
            return res.status(400).json({ sucesso: false, mensagem: "Confira título, link, ordem e disponibilidade." });
        }

        if (req.file) novaImagem = await salvarImagem(req.file);
        const imagemAnterior = banner.imagem;
        Object.assign(banner, { titulo, destaque, descricao, texto_botao, link_botao, ordem, ativo });
        if (novaImagem) banner.imagem = novaImagem;
        await salvarBanners(banners);
        if (novaImagem) await apagarImagemGerenciada(imagemAnterior);
        res.json({ sucesso: true, mensagem: "Banner alterado!", banner });
    } catch (erro) {
        if (novaImagem) await apagarImagemGerenciada(novaImagem);
        console.error("Erro ao alterar banner:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao alterar banner." });
    }
};

// Exclui o banner e a imagem enviada pelo painel, se houver.
const excluir = async (req, res) => {
    try {
        const banners = await lerBanners();
        const indice = banners.findIndex(b => b.id === Number(req.params.id));
        if (indice === -1) return res.status(404).json({ sucesso: false, mensagem: "Banner não encontrado." });
        const [banner] = banners.splice(indice, 1);
        await salvarBanners(banners);
        await apagarImagemGerenciada(banner.imagem);
        res.json({ sucesso: true, mensagem: "Banner excluído!" });
    } catch (erro) {
        console.error("Erro ao excluir banner:", erro);
        res.status(500).json({ sucesso: false, mensagem: "Erro ao excluir banner." });
    }
};

// Executa o Multer e devolve erros de upload em JSON.
function receberImagem(req, res, proximo) {
    upload(req, res, erro => {
        if (erro) return res.status(400).json({ sucesso: false, mensagem: erro.message });
        proximo();
    });
}

module.exports = { listarPublicos, listar, procurar, inserir, alterar, excluir, receberImagem };
