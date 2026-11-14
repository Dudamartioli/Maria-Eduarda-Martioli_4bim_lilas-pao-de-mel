
/* ==========================================
   LILA'S - IMAGENS DOS PRODUTOS
   Upload com Multer e Sharp
   ========================================== */

// Bibliotecas
const pool = require("../database");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

// Pasta onde ficarão as imagens por ID
const pastaImagens = path.join(
    __dirname,
    "../../frontend/imagens-produtos/por-id"
);

// Configuração do Multer
// Recebe as imagens na memória antes de salvar
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
    },

    fileFilter: (req, file, callback) => {

        // Formatos aceitos
        const formatos = [
            "image/jpeg",
            "image/png"
        ];

        // Verifica o tipo declarado do arquivo
        if (!formatos.includes(file.mimetype)) {
            return callback(
                new Error("Envie imagens JPG, JPEG ou PNG.")
            );
        }

        callback(null, true);
    }
}).array("imagens", 10);


// ==========================================
// VERIFICAR PRODUTO
// ==========================================

async function verificarProduto(id) {

    // Consulta o banco pelo ID
    const resultado = await pool.query(
        "SELECT id_produto FROM produto WHERE id_produto = $1",
        [id]
    );

    return resultado.rows.length > 0;
}


// ==========================================
// LISTAR IMAGENS
// ==========================================

const listar = async (req, res) => {

    try {

        const id = Number(req.params.id);

        // Valida o ID
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID inválido."
            });
        }

        // Verifica se o produto existe
        if (!(await verificarProduto(id))) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Produto não encontrado."
            });
        }

        // Pasta específica do produto
        const pastaProduto = path.join(
            pastaImagens,
            String(id)
        );

        // Procura as imagens da pasta
        let arquivos = [];

        try {
            arquivos = await fs.readdir(pastaProduto);
        } catch (erro) {

            // Se a pasta não existe, não há imagens
            if (erro.code !== "ENOENT") {
                throw erro;
            }
        }

        // Aceita somente arquivos de imagem
        const imagens = arquivos
            .filter(nome => /\.(jpg|jpeg|png)$/i.test(nome))
            .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
            .map(nome =>
                "/imagens-produtos/por-id/" +
                id + "/" + nome
            );

        res.json({
            sucesso: true,
            imagens: imagens
        });

    } catch (erro) {

        console.log("Erro ao listar imagens:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar imagens."
        });
    }
};


// ==========================================
// ENVIAR IMAGENS
// ==========================================

const enviar = async (req, res) => {

    // Primeiro o Multer recebe os arquivos
    upload(req, res, async function(erroUpload) {

        if (erroUpload) {
            return res.status(400).json({
                sucesso: false,
                mensagem: erroUpload.message
            });
        }

        try {

            const id = Number(req.params.id);

            // Verifica o ID
            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID inválido."
                });
            }

            // Confere se o produto existe
            if (!(await verificarProduto(id))) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Produto não encontrado."
                });
            }

            // Verifica se recebeu arquivos
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Selecione pelo menos uma imagem."
                });
            }

            // Valida o conteúdo real das imagens
            for (const arquivo of req.files) {

                const dados = await sharp(arquivo.buffer)
                    .metadata();

                if (!["jpeg", "png"].includes(dados.format)) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: "Imagem inválida. Use JPG, JPEG ou PNG."
                    });
                }
            }

            // Define a pasta do produto
            const pastaProduto = path.join(
                pastaImagens,
                String(id)
            );

            // Cria a pasta se ainda não existir
            await fs.mkdir(pastaProduto, {
                recursive: true
            });

            // Guarda os caminhos das imagens salvas
            const imagensSalvas = [];

            // Processa cada arquivo
            for (const arquivo of req.files) {

                // Prepara uma cópia JPG, sem alterar a foto original.
                const imagem = await sharp(arquivo.buffer)
                    .rotate()
                    .resize(1200, 1200, {
                        fit: "inside",
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                // Encontra o primeiro número disponível sem sobrescrever fotos.
                let numero = 1;
                let nome;
                while (true) {
                    nome = "foto" + numero + ".jpg";
                    const caminho = path.join(pastaProduto, nome);
                    try {
                        await fs.writeFile(caminho, imagem, { flag: "wx" });
                        break;
                    } catch (erro) {
                        if (erro.code !== "EEXIST") throw erro;
                        numero++;
                    }
                }

                // Caminho público da imagem
                imagensSalvas.push(
                    "/imagens-produtos/por-id/" +
                    id + "/" + nome
                );
            }

            res.json({
                sucesso: true,
                mensagem: "Imagens enviadas com sucesso!",
                imagens: imagensSalvas
            });

        } catch (erro) {

            console.log("Erro no upload:", erro);

            res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao salvar imagens."
            });
        }
    });
};


// ==========================================
// EXCLUIR UMA IMAGEM
// ==========================================

const excluir = async (req, res) => {

    try {

        const id = Number(req.params.id);
        const nome = req.params.nome;

        // Verifica o ID
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID inválido."
            });
        }

        // Verifica se o produto existe
        if (!(await verificarProduto(id))) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Produto não encontrado."
            });
        }

        // Permite apenas nomes simples de imagens
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$/i.test(nome)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome de imagem inválido."
            });
        }

        // Monta o caminho do arquivo
        const caminho = path.join(
            pastaImagens,
            String(id),
            nome
        );

        // Apaga somente a imagem selecionada
        await fs.unlink(caminho);

        res.json({
            sucesso: true,
            mensagem: "Imagem excluída com sucesso!"
        });

    } catch (erro) {

        if (erro.code === "ENOENT") {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Imagem não encontrada."
            });
        }

        console.log("Erro ao excluir imagem:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao excluir imagem."
        });
    }
};


// Exporta as funções
module.exports = {
    listar,
    enviar,
    excluir
};
