/* ====================================================
   LILA'S - GERENCIAMENTO DE BANNERS
   CRUD com autenticação e prévia de imagem
   ==================================================== */

const URL_API = window.location.origin;
const $ = id => document.getElementById(id);
let banners = [];
let idSelecionado = null;
let urlPreviaLocal = null;
let imagemParaRecorte = null;

// Confere a sessão e a permissão antes de mostrar a tela.
async function verificarAcesso() {
    try {
        const respostaUsuario = await fetch(URL_API + "/usuario/verificar", { credentials: "include" });
        const dadosUsuario = await respostaUsuario.json();
        if (!respostaUsuario.ok || !dadosUsuario.sucesso) {
            window.location.href = "../../login/login.html";
            return;
        }
        const respostaAdmin = await fetch(URL_API + "/admin/verificar", { credentials: "include" });
        const dadosAdmin = await respostaAdmin.json();
        if (!respostaAdmin.ok || !dadosAdmin.sucesso) {
            $("aviso").textContent = "Você não possui permissão para acessar esta página.";
            return;
        }
        $("conteudo").hidden = false;
        $("aviso").hidden = true;
        await carregarBanners();
    } catch (erro) {
        console.error(erro);
        $("aviso").textContent = "Não foi possível conectar ao servidor.";
    }
}

function mostrarMensagem(texto) { $("mensagem").textContent = texto; if (texto) LilaAvisos.alerta(texto); }

// Evita manter URLs temporárias de prévias anteriores na memória.
function limparUrlLocal() {
    if (urlPreviaLocal) URL.revokeObjectURL(urlPreviaLocal);
    urlPreviaLocal = null;
}

// Atualiza a prévia de textos e imagem, sem salvar no servidor.
function atualizarPrevia() {
    $("tituloPrevia").textContent = $("titulo").value.trim() || "Título do banner";
    $("destaquePrevia").textContent = $("destaque").value.trim();
    $("descricaoPrevia").textContent = $("descricao").value.trim();
    $("botaoPrevia").textContent = $("textoBotao").value.trim();
    // Esconde o botão quando a opção "Sem botão" for escolhida
    $("botaoPrevia").hidden = !$("textoBotao").value.trim() || $("linkBotao").value === "";

    const arquivo = $("imagem").files[0];
    const atual = banners.find(b => b.id === idSelecionado);
    limparUrlLocal();
    let caminho = "";
    if (arquivo) {
        urlPreviaLocal = URL.createObjectURL(arquivo);
        caminho = urlPreviaLocal;
    } else if (atual) {
        caminho = atual.imagem;
    }
    $("imagemPrevia").hidden = !caminho;
    $("semImagem").hidden = !!caminho;
    if (caminho) $("imagemPrevia").src = caminho;
    else $("imagemPrevia").removeAttribute("src");
    atualizarEnquadramento();
}

// Limpa os campos para cadastrar um novo banner.
function novoBanner() {
    idSelecionado = null;
    $("formBanner").reset();
    imagemParaRecorte = null;
    $("controlesRecorte").hidden = true;
    $("idBanner").value = "";
    $("ordem").value = String(Math.max(0, ...banners.map(b => b.ordem)) + 1);
    $("btnSalvar").textContent = "Cadastrar banner";
    $("btnExcluir").hidden = true;
    $("estadoPrevia").textContent = "Novo banner (ainda não salvo).";
    mostrarMensagem("");
    atualizarPrevia();
    renderizarLista();
}

// Preenche o formulário com os dados do banner escolhido.
function selecionarBanner(id) {
    const banner = banners.find(b => b.id === id);
    if (!banner) return;
    idSelecionado = banner.id;
    $("idBanner").value = banner.id;
    $("titulo").value = banner.titulo || "";
    $("destaque").value = banner.destaque || "";
    $("descricao").value = banner.descricao || "";
    $("textoBotao").value = banner.texto_botao || "";
    // Mantém a opção "Sem botão" ao editar um banner
    $("linkBotao").value = banner.link_botao ?? "#catalogo";
    $("ordem").value = banner.ordem;
    $("ativo").value = String(banner.ativo);
    $("imagem").value = "";
    imagemParaRecorte = null;
    $("controlesRecorte").hidden = true;
    $("btnSalvar").textContent = "Salvar alterações";
    $("btnExcluir").hidden = false;
    $("estadoPrevia").textContent = "Editando o banner nº " + banner.id;
    mostrarMensagem("");
    atualizarPrevia();
    renderizarLista();
}

// Cria a lista usando DOM, sem inserir textos do usuário como HTML.
function renderizarLista() {
    const lista = $("listaBanners");
    lista.replaceChildren();
    if (!banners.length) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhum banner cadastrado.";
        lista.appendChild(vazio);
        return;
    }
    banners.forEach(banner => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "item-banner" + (banner.id === idSelecionado ? " selecionado" : "");
        const foto = document.createElement("img");
        foto.src = banner.imagem;
        foto.alt = "Imagem do banner " + banner.id;
        const titulo = document.createElement("strong");
        titulo.textContent = banner.titulo;
        const detalhe = document.createElement("small");
        detalhe.textContent = "Código " + banner.id + " · Ordem " + banner.ordem + " · " + (banner.ativo ? "Ativo" : "Inativo");
        botao.append(foto, titulo, detalhe);
        botao.addEventListener("click", () => selecionarBanner(banner.id));
        lista.appendChild(botao);
    });
}

// Consulta a lista completa pela rota administrativa.
async function carregarBanners(idParaSelecionar = null) {
    try {
        const resposta = await fetch(URL_API + "/admin/banner/listar", { credentials: "include" });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) throw new Error(dados.mensagem || "Erro ao listar banners.");
        banners = dados.banners || [];
        if (idParaSelecionar !== null && banners.some(b => b.id === idParaSelecionar)) selecionarBanner(idParaSelecionar);
        else if (idSelecionado !== null && banners.some(b => b.id === idSelecionado)) selecionarBanner(idSelecionado);
        else novoBanner();
        renderizarLista();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// Cadastra ou altera, enviando texto e imagem com FormData.
async function salvarBanner(evento) {
    evento.preventDefault();
    const arquivo = $("imagem").files[0];
    if (idSelecionado === null && !arquivo) return mostrarMensagem("Escolha uma imagem para cadastrar o banner.");
    if (arquivo && (!(["image/jpeg", "image/png", "image/webp", "image/gif"].includes(arquivo.type)) || arquivo.size > 10 * 1024 * 1024)) {
        return mostrarMensagem("Escolha um JPG, PNG, WebP ou GIF de até 10 MB.");
    }
    const dadosEnvio = new FormData();
    for (const [campo, id] of Object.entries({
        titulo: "titulo", destaque: "destaque", descricao: "descricao",
        texto_botao: "textoBotao", link_botao: "linkBotao", ordem: "ordem", ativo: "ativo"
    })) dadosEnvio.append(campo, $(id).value);
    if (arquivo) {
        try {
            const imagemTratada = await gerarImagemRecortada(arquivo);
            dadosEnvio.append("imagem", imagemTratada, "banner.jpg");
        } catch (erro) {
            return mostrarMensagem("Não foi possível preparar a imagem: " + erro.message);
        }
    }
    const editando = idSelecionado !== null;
    const rota = URL_API + "/admin/banner" + (editando ? "/" + idSelecionado : "");
    $("btnSalvar").disabled = true;
    try {
        const resposta = await fetch(rota, { method: editando ? "PUT" : "POST", credentials: "include", body: dadosEnvio });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) throw new Error(dados.mensagem || "Não foi possível salvar.");
        const idSalvo = dados.banner.id;
        $("imagem").value = "";
        await carregarBanners(idSalvo);
        mostrarMensagem(dados.mensagem || "Banner salvo com sucesso!");
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        $("btnSalvar").disabled = false;
    }
}

// Exclui somente depois da confirmação.
async function excluirBanner() {
    if (idSelecionado === null) return;
    if (!await LilaAvisos.confirmar("Deseja realmente excluir este banner?")) return;
    try {
        const resposta = await fetch(URL_API + "/admin/banner/" + idSelecionado, { method: "DELETE", credentials: "include" });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso) throw new Error(dados.mensagem || "Não foi possível excluir.");
        idSelecionado = null;
        await carregarBanners();
        mostrarMensagem(dados.mensagem || "Banner excluído!");
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// Prévia do enquadramento: object-fit cover igual ao carrossel.
function atualizarEnquadramento() {
    const img = $("imagemPrevia");
    const zoom = Number($("zoomImagem").value) / 100;
    const x = Number($("posicaoHorizontal").value);
    const y = Number($("posicaoVertical").value);
    img.style.objectPosition = `${x}% ${y}%`;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = `scale(${zoom})`;
}

// Abre a foto escolhida para o recorte; só o arquivo novo será alterado.
function prepararRecorte() {
    const arquivo = $("imagem").files[0];
    $("controlesRecorte").hidden = !arquivo;
    for (const id of ["zoomImagem", "posicaoHorizontal", "posicaoVertical"]) {
        $(id).value = id === "zoomImagem" ? "100" : "50";
    }
    atualizarPrevia();
}

// Gera uma foto 16:9 a partir dos ajustes de zoom e posição.
async function gerarImagemRecortada(arquivo) {
    const imagem = new Image();
    const endereco = URL.createObjectURL(arquivo);
    try {
        imagem.src = endereco;
        await imagem.decode();
        const largura = 1920, altura = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = largura; canvas.height = altura;
        const contexto = canvas.getContext("2d");
        if (!contexto) throw new Error("Seu navegador não permite recortar imagens.");
        const zoom = Number($("zoomImagem").value) / 100;
        const escala = Math.max(largura / imagem.naturalWidth, altura / imagem.naturalHeight) * zoom;
        const w = imagem.naturalWidth * escala, h = imagem.naturalHeight * escala;
        const x = (largura - w) * Number($("posicaoHorizontal").value) / 100;
        const y = (altura - h) * Number($("posicaoVertical").value) / 100;
        contexto.drawImage(imagem, x, y, w, h);
        const blob = await new Promise((resolver, rejeitar) => canvas.toBlob(b => b ? resolver(b) : rejeitar(new Error("Falha ao gerar JPG.")), "image/jpeg", .88));
        return new File([blob], "banner.jpg", { type: "image/jpeg" });
    } finally { URL.revokeObjectURL(endereco); }
}

$("imagem").addEventListener("change", prepararRecorte);
for (const id of ["zoomImagem", "posicaoHorizontal", "posicaoVertical"]) $(id).addEventListener("input", atualizarEnquadramento);
$("btnResetarRecorte").addEventListener("click", () => {
    $("zoomImagem").value = 100;
    $("posicaoHorizontal").value = 50;
    $("posicaoVertical").value = 50;
    atualizarEnquadramento();
});

$("formBanner").addEventListener("submit", salvarBanner);
$("btnNovo").addEventListener("click", novoBanner);
$("btnExcluir").addEventListener("click", excluirBanner);
$("btnAtualizar").addEventListener("click", () => carregarBanners());
for (const id of ["titulo", "destaque", "descricao", "textoBotao"]) $(id).addEventListener("input", atualizarPrevia);

window.addEventListener("beforeunload", limparUrlLocal);
verificarAcesso();

// Atualiza a prévia quando o destino do botão mudar
$("linkBotao").addEventListener("change", atualizarPrevia);