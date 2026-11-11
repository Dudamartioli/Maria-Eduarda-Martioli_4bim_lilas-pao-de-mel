
const URL_API = "http://localhost:3001";

// Mostra todos os produtos quando a página abrir
window.onload = ftodos;


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


// Mostra os produtos na página
function mostrarProdutos(produtos) {

    // Procura a área dos produtos
    const resultado = document.getElementById("resultado");

    // Limpa os produtos anteriores
    resultado.innerHTML = "";

    // Verifica se existem produtos para mostrar
    if (produtos.length === 0) {
        resultado.textContent = "Nenhum produto encontrado.";
        return;
    }

    // Cria um cartão para cada produto
    produtos.forEach(function(produto) {

        // Cria o cartão
        const cartao = document.createElement("article");
        cartao.className = "produto";

        // Cria a imagem
        const imagem = document.createElement("img");
        imagem.src = produto.imagem || "../../imagens/sem-imagem.png";
        imagem.alt = produto.nome_produto;

        // Cria o nome
        const nome = document.createElement("h3");
        nome.textContent = produto.nome_produto;

        // Cria o preço
        const preco = document.createElement("p");
        preco.textContent = "R$ " + Number(produto.preco).toFixed(2);

        // Cria o botão do carrinho
        const botao = document.createElement("button");
        botao.textContent = "Adicionar ao carrinho";

        // Define a ação do botão
        botao.onclick = function() {
            adicionarCarrinho(produto.id_produto);
        };

        // Adiciona os elementos ao cartão
        cartao.appendChild(imagem);
        cartao.appendChild(nome);
        cartao.appendChild(preco);
        cartao.appendChild(botao);

        // Adiciona o cartão à página
        resultado.appendChild(cartao);
    });
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

// Busca todos os banners.
const slidesBanner = document.querySelectorAll(".slideBanner");

// Busca os indicadores.
const indicadoresBanner = document.querySelectorAll(".indicadorBanner");

// Busca os botões de avançar e voltar.
const proximoBanner = document.getElementById("bannerProximo");
const anteriorBanner = document.getElementById("bannerAnterior");

// Guarda qual banner está aparecendo.
let slideAtualBanner = 0;

// Função para trocar o banner.
function mostrarBanner(numero) {

    // Percorre todos os banners.
    slidesBanner.forEach(function(slide, indice) {

        // Remove a classe ativo de todos.
        slide.classList.remove("ativo");

        // Remove o destaque dos indicadores.
        indicadoresBanner[indice].classList.remove("ativo");

    });

    // Mostra o banner escolhido.
    slidesBanner[numero].classList.add("ativo");

    // Destaca o indicador correspondente.
    indicadoresBanner[numero].classList.add("ativo");

    // Atualiza o número do banner atual.
    slideAtualBanner = numero;
}

// Avança para o próximo banner.
function passarProximoBanner() {

    // Calcula o próximo banner.
    let proximo = (slideAtualBanner + 1) % slidesBanner.length;

    // Exibe o próximo banner.
    mostrarBanner(proximo);
}

// Volta para o banner anterior.
function passarBannerAnterior() {

    // Calcula o banner anterior.
    let anterior = (slideAtualBanner - 1 + slidesBanner.length) % slidesBanner.length;

    // Exibe o banner anterior.
    mostrarBanner(anterior);
}

// Evento do botão de avançar.
proximoBanner.addEventListener("click", passarProximoBanner);

// Evento do botão de voltar.
anteriorBanner.addEventListener("click", passarBannerAnterior);

// Evento dos indicadores.
indicadoresBanner.forEach(function(indicador, indice) {

    indicador.addEventListener("click", function() {

        // Abre o banner escolhido.
        mostrarBanner(indice);

    });

});

// Troca automaticamente a cada 5 segundos.
setInterval(function() {

    passarProximoBanner();

}, 5000);
