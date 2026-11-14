
const URL_API = "http://localhost:3001";

// Executa as funções quando a página abrir
window.onload = function() {

    // Mostra todos os produtos quando a página abrir
    ftodos();

    // Verifica se o cliente está logado
    verificarLogin();

    // Configura os botões da conta
    configurarConta();
};


// Mostra somente os pães de mel grandes
async function fgrandes() {

    // Busca os produtos cadastrados no banco
    const resposta = await fetch(URL_API + "/produto/listar");

    // Converte a resposta para JSON
    const dados = await resposta.json();

    // Verifica se a consulta funcionou
    if (resposta.ok && dados.sucesso) {

        // Seleciona somente os pães de mel normais
        const produtos = dados.produtos.filter(function(produto) {
            return produto.nome_produto.toLowerCase().includes("normal");
        });

        // Exibe os produtos grandes
        mostrarProdutos(produtos);

        // Destaca o botão selecionado
        marcarBotao(1);
    }
}


// Mostra somente os mini pães de mel
async function fminis() {

    // Busca os produtos cadastrados no banco
    const resposta = await fetch(URL_API + "/produto/listar");

    // Converte a resposta para JSON
    const dados = await resposta.json();

    // Verifica se a consulta funcionou
    if (resposta.ok && dados.sucesso) {

        // Seleciona somente os mini pães de mel
        const produtos = dados.produtos.filter(function(produto) {
            return produto.nome_produto.toLowerCase().includes("mini");
        });

        // Exibe os produtos pequenos
        mostrarProdutos(produtos);

        // Destaca o botão selecionado
        marcarBotao(2);
    }
}


// Busca todos os produtos cadastrados
async function ftodos() {

    // Busca os produtos no servidor
    const resposta = await fetch(URL_API + "/produto/listar");

    // Recebe a resposta do servidor
    const dados = await resposta.json();

    // Verifica se a consulta funcionou
    if (resposta.ok && dados.sucesso) {

        // Mostra todos os produtos cadastrados
        mostrarProdutos(dados.produtos);

        // Destaca o botão Todos
        marcarBotao(0);

    } else {

        // Mostra uma mensagem caso aconteça um erro
        document.getElementById("resultado").textContent =
            "Erro ao carregar os produtos.";
    }
}


// Pesquisa produtos pelo nome
async function fpesquisar() {

    // Recebe o nome digitado pelo cliente
    const nome = document.getElementById("inputPesquisa").value;

    // Busca os produtos cadastrados
    const resposta = await fetch(URL_API + "/produto/listar");

    // Converte a resposta para JSON
    const dados = await resposta.json();

    // Verifica se a consulta funcionou
    if (resposta.ok && dados.sucesso) {

        // Lista para guardar os produtos encontrados
        let encontrados = [];

        // Percorre os produtos e procura o nome digitado
        dados.produtos.forEach(function(produto) {

            if (produto.nome_produto.toLowerCase().includes(nome.toLowerCase())) {
                encontrados.push(produto);
            }

        });

        // Mostra os produtos encontrados
        mostrarProdutos(encontrados);

        // Remove a seleção dos filtros
        marcarBotao(-1);
    }
}



// Mostra os produtos na página inicial
async function mostrarProdutos(produtos) {

    // Procura a área onde os cards aparecem
    const resultado = document.getElementById("resultado");
    resultado.innerHTML = "";

    // Agrupa os sabores pelo nome do produto
    const produtosAgrupados = {};

    produtos.forEach(function(produto) {
        if (!produtosAgrupados[produto.nome_produto]) {
            produtosAgrupados[produto.nome_produto] = produto;
        }
    });

    // Mantém os quatro produtos tradicionais no começo
    const ordemProdutos = [
        "Pão de mel normal",
        "Mini clássico",
        "Mini refinado",
        "Mini no palito"
    ];

    // Acrescenta todos os outros produtos cadastrados no banco
    Object.keys(produtosAgrupados).forEach(function(nome) {
        if (!ordemProdutos.includes(nome)) {
            ordemProdutos.push(nome);
        }
    });

    // Fotos originais dos quatro cards: não vamos removê-las
    const imagensCards = {
        "Pão de mel normal": "../imagens-produtos/pao-grande/foto1.jpg",
        "Mini clássico": "../imagens-produtos/mini-classico/foto1.jpg",
        "Mini refinado": "../imagens-produtos/mini-refinado/foto1.jpg",
        "Mini no palito": "../imagens-produtos/mini-palito/foto1.jpg"
    };

    // Cria um card para cada nome de produto encontrado
    for (const nomeProduto of ordemProdutos) {

        const produto = produtosAgrupados[nomeProduto];
        if (!produto) {
            continue;
        }

        const cartao = document.createElement("article");
        cartao.className = "produto";

        const imagem = document.createElement("img");
        imagem.alt = nomeProduto;

        // Para os quatro cards antigos, mantém a imagem conhecida.
        // Para novos produtos, procura as fotos na pasta do ID.
        let caminhoImagem = imagensCards[nomeProduto] || "";

        if (!caminhoImagem) {
            try {
                const resposta = await fetch(
                    URL_API + "/produto/" + produto.id_produto + "/imagens",
                    { credentials: "include" }
                );

                if (resposta.ok) {
                    const dados = await resposta.json();
                    if (dados.sucesso && dados.imagens.length > 0) {
                        caminhoImagem = dados.imagens[0];
                    }
                }
            } catch (erro) {
                console.log("Não foi possível buscar a imagem:", erro);
            }
        }

        // Imagem alternativa quando não houver foto disponível
        imagem.src = caminhoImagem || "../imagens-produtos/pao-grande/foto1.jpg";

        const nome = document.createElement("h3");
        nome.textContent = nomeProduto;

        const preco = document.createElement("p");
        preco.textContent = "A partir de R$ " +
            Number(produto.preco).toFixed(2).replace(".", ",");

        const botao = document.createElement("button");
        botao.textContent = "Ver sabores";
        botao.onclick = function() {
            window.location.href =
                "../produto/produto.html?nome=" +
                encodeURIComponent(nomeProduto);
        };

        cartao.appendChild(imagem);
        cartao.appendChild(nome);
        cartao.appendChild(preco);
        cartao.appendChild(botao);
        resultado.appendChild(cartao);
    }

    if (resultado.children.length === 0) {
        resultado.textContent = "Nenhum produto encontrado.";
    }
}


// Destaca o botão de filtro selecionado
function marcarBotao(numero) {

    // Busca os três botões de filtro
    const botoes = document.querySelectorAll(".filtros-produtos button");

    // Remove a seleção anterior
    botoes.forEach(function(botao) {
        botao.classList.remove("ativo");
    });

    // Destaca o botão escolhido
    if (botoes[numero]) {
        botoes[numero].classList.add("ativo");
    }
}


// Função provisória do carrinho
function adicionarCarrinho(id) {
    alert("Produto " + id + " selecionado!");
}


// Liga o botão de pesquisa à função
document.getElementById("btnPesquisar").onclick = fpesquisar;



// ========================================
// CARROSSEL DOS BANNERS DA LILA'S
// ========================================

// Elementos que já existem no HTML.
const secaoBanner = document.getElementById("bannerInicial");
const proximoBanner = document.getElementById("bannerProximo");
const anteriorBanner = document.getElementById("bannerAnterior");
const caixaIndicadores = secaoBanner.querySelector(".indicadoresBanner");

// As listas são atualizadas quando os banners vêm do backend.
let slidesBanner = Array.from(secaoBanner.querySelectorAll(".slideBanner"));
let indicadoresBanner = Array.from(caixaIndicadores.querySelectorAll(".indicadorBanner"));
let slideAtualBanner = 0;

// Mostra um banner e atualiza os indicadores.
function mostrarBanner(numero) {
    if (slidesBanner.length === 0) return;

    slideAtualBanner = (numero + slidesBanner.length) % slidesBanner.length;

    slidesBanner.forEach(function (slide, indice) {
        slide.classList.toggle("ativo", indice === slideAtualBanner);
    });

    indicadoresBanner.forEach(function (indicador, indice) {
        indicador.classList.toggle("ativo", indice === slideAtualBanner);
    });
}

function passarProximoBanner() {
    mostrarBanner(slideAtualBanner + 1);
}

function passarBannerAnterior() {
    mostrarBanner(slideAtualBanner - 1);
}

proximoBanner.addEventListener("click", passarProximoBanner);
anteriorBanner.addEventListener("click", passarBannerAnterior);

// Liga o clique dos indicadores aos banners correspondentes.
function configurarIndicadores() {
    indicadoresBanner.forEach(function (indicador, indice) {
        indicador.addEventListener("click", function () {
            mostrarBanner(indice);
        });
    });
}

configurarIndicadores();

// Confere se o link do botão é interno ou usa um protocolo seguro.
function linkPermitido(link) {
    if (typeof link !== "string") return "#catalogo";
    const valor = link.trim();
    if (valor.startsWith("/") && !valor.startsWith("//")) return valor;
    if (valor.startsWith("#")) return valor;
    try {
        const url = new URL(valor, window.location.href);
        if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (erro) {
        // Links inválidos levam ao catálogo.
    }
    return "#catalogo";
}

// Cria um slide com as informações recebidas do backend.
function criarSlideBanner(banner) {
    const slide = document.createElement("div");
    slide.className = "slideBanner";

    // A imagem é enviada pelo backend como /imagens-banners/nome.jpg.
    if (typeof banner.imagem === "string" && banner.imagem.startsWith("/imagens-banners/")) {
        slide.style.backgroundImage = 'url("' + encodeURI(banner.imagem).replace(/"/g, "%22") + '")';
    }

    const conteudo = document.createElement("div");
    conteudo.className = "conteudoBanner";

    const titulo = document.createElement("h2");
    titulo.appendChild(document.createTextNode(banner.titulo || ""));

    if (banner.destaque) {
        const destaque = document.createElement("span");
        destaque.textContent = banner.destaque;
        titulo.appendChild(document.createTextNode(" "));
        titulo.appendChild(destaque);
    }

    const descricao = document.createElement("p");
    descricao.textContent = banner.descricao || "";

    // Só cria o botão se o banner tiver um link
if (banner.link_botao && banner.texto_botao) {

    const botao = document.createElement("a");

    botao.className = "btnConhecer";

    botao.href = linkPermitido(banner.link_botao);

    botao.appendChild(
        document.createTextNode(banner.texto_botao + " ")
    );

    const seta = document.createElement("span");

    seta.textContent = "→";

    botao.appendChild(seta);

    conteudo.appendChild(botao);
}
    slide.appendChild(conteudo);
    return slide;
}

// Consulta os banners ativos e substitui os slides fixos do HTML.
async function carregarBanners() {
    try {
        const resposta = await fetch("/banner/listar", { cache: "no-store" });
        if (!resposta.ok) throw new Error("Não foi possível consultar os banners.");

        const dados = await resposta.json();
        if (!dados.sucesso || !Array.isArray(dados.banners)) {
            throw new Error("Resposta inválida do servidor.");
        }

        // A rota pública já retorna somente os ativos; o filtro reforça isso.
        const banners = dados.banners.filter(function (banner) {
            return banner.ativo === true;
        }).sort(function (a, b) {
            return a.ordem - b.ordem || a.id - b.id;
        });

        // Monta todos os novos slides antes de remover os antigos.
        const novosSlides = banners.map(criarSlideBanner);
        slidesBanner.forEach(function (slide) { slide.remove(); });
        caixaIndicadores.replaceChildren();

        // Insere os slides antes das setas, mantendo o CSS existente.
        novosSlides.forEach(function (slide, indice) {
            secaoBanner.insertBefore(slide, anteriorBanner);

            const indicador = document.createElement("button");
            indicador.type = "button";
            indicador.className = "indicadorBanner";
            indicador.setAttribute("aria-label", "Mostrar banner " + (indice + 1));
            caixaIndicadores.appendChild(indicador);
        });

        slidesBanner = novosSlides;
        indicadoresBanner = Array.from(caixaIndicadores.querySelectorAll(".indicadorBanner"));
        configurarIndicadores();
        mostrarBanner(0);

        // Não exibe setas ou indicadores quando houver um banner ou nenhum.
        const mostrarNavegacao = banners.length > 1;
        proximoBanner.style.display = mostrarNavegacao ? "" : "none";
        anteriorBanner.style.display = mostrarNavegacao ? "" : "none";
        caixaIndicadores.style.display = mostrarNavegacao ? "" : "none";

    } catch (erro) {
        // Se o backend estiver indisponível, mantém os dois banners do HTML.
        console.error("Erro ao carregar banners:", erro);
    }
}

carregarBanners();

// Troca automaticamente a cada 5 segundos, se houver mais de um banner.
setInterval(function () {
    if (slidesBanner.length > 1) passarProximoBanner();
}, 5000);


// ==========================================
// VERIFICAR LOGIN DO USUÁRIO
// ==========================================

async function verificarLogin() {

    // Recupera os elementos do cabeçalho
    const linkLogin = document.getElementById("linkLogin");
    const opcoesUsuario = document.getElementById("opcoesUsuario");
    const menuUsuario = document.getElementById("menuUsuario");

    // Esconde os botões enquanto verifica a sessão
    linkLogin.hidden = true;
    opcoesUsuario.hidden = true;
    menuUsuario.hidden = true;

    try {

        // Consulta o backend para verificar o cookie
        const resposta = await fetch(
            URL_API + "/usuario/verificar",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        // Verifica se a resposta foi bem-sucedida
        if (!resposta.ok) {

            // Não está logado: mostra Login
            linkLogin.hidden = false;
            return;
        }

        // Recebe os dados do usuário
        const dados = await resposta.json();

        if (dados.sucesso) {

            // Está logado: mostra Minha conta
            linkLogin.hidden = true;
            opcoesUsuario.hidden = false;

        } else {

            // Não está logado: mostra Login
            linkLogin.hidden = false;
            opcoesUsuario.hidden = true;
        }

    } catch (erro) {

        console.log("Erro ao verificar login:", erro);

        // Se houver erro, mostra Login
        linkLogin.hidden = false;
        opcoesUsuario.hidden = true;
    }
}



// ==========================================
// CONFIGURAR BOTÕES DA CONTA
// ==========================================

function configurarConta() {

    // Recupera os botões da página
    const btnMinhaConta = document.getElementById("btnMinhaConta");
    const btnSair = document.getElementById("btnSair");
    const menuUsuario = document.getElementById("menuUsuario");

    // Abre a página Minha conta
    btnMinhaConta.onclick = function() {

        window.location.href = "http://localhost:3001/minha-conta/minha-conta.html";
    };

    // Executa o logout quando clicar em Sair
    btnSair.onclick = logout;
}


// ==========================================
// SAIR DA CONTA
// ==========================================

async function logout() {

    try {

        // Solicita o logout ao servidor
        const resposta = await fetch(URL_API + "/usuario/logout", {
            method: "POST",
            credentials: "include"
        });

        // Converte a resposta para JSON
        const dados = await resposta.json();

        // Verifica se o logout funcionou
        if (resposta.ok && dados.sucesso) {

            // Atualiza o menu após sair da conta
            await verificarLogin();

            // Mostra uma mensagem ao usuário
            alert("Você saiu da sua conta com sucesso!");

        } else {

            // Mostra a mensagem de erro
            alert(dados.mensagem);
        }

    } catch (erro) {

        // Mostra o erro no console
        console.log("Erro ao sair da conta:", erro);

        alert("Não foi possível sair da conta.");
    }
}


// ==========================================
// ATUALIZAR LOGIN AO VOLTAR PARA O MENU
// ==========================================

// Executa quando a página é exibida,
// inclusive quando o navegador restaura uma página anterior.
window.addEventListener("pageshow", function() {

    // Verifica novamente se o usuário está logado
    verificarLogin();

});
