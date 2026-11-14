// =============================================
// LILA'S - CARRINHO DE COMPRAS
// =============================================

// Formata valores em reais.
const dinheiro = valor =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

// Elementos da página.
const lista = document.getElementById("listaItens");
const mensagem = document.getElementById("mensagem");
const total = document.getElementById("total");
const finalizar = document.getElementById("finalizar");

// Elementos da janela personalizada.
const modal = document.getElementById("modalCarrinho");
const tituloModal = document.getElementById("tituloModal");
const textoModal = document.getElementById("textoModal");
const btnFecharModal = document.getElementById("btnFecharModal");

// Produtos consultados no backend.
let produtos = [];

// =============================================
// MOSTRAR MENSAGEM PERSONALIZADA
// =============================================

function mostrarAviso(titulo, texto) {
    tituloModal.textContent = titulo;
    textoModal.textContent = texto;

    if (!modal.open) {
        modal.showModal();
    }
}

// Fecha a janela.
btnFecharModal.addEventListener("click", () => {
    modal.close();
});

// =============================================
// CONSULTAR PRODUTOS NO BACKEND
// =============================================

async function carregarCarrinho() {
    try {
        const resposta = await fetch(
            "http://localhost:3001/produto/listar"
        );

        const dados = await resposta.json();

        if (
            !resposta.ok ||
            !dados.sucesso ||
            !Array.isArray(dados.produtos)
        ) {
            throw new Error(
                "Não foi possível consultar os produtos."
            );
        }

        produtos = dados.produtos;

        renderizar();

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar os preços. Tente atualizar a página.";

        finalizar.disabled = true;

        mostrarAviso(
            "Não foi possível carregar",
            "Verifique a conexão com o servidor e tente novamente."
        );
    }
}

// =============================================
// PRIMEIRA FOTO DE CADA PRODUTO
// =============================================

// Endereço do backend que disponibiliza as fotos cadastradas.
const URL_IMAGENS = "http://localhost:3001";

// Guarda as imagens já consultadas para não repetir requisições.
const cacheFotos = new Map();

async function obterPrimeiraFoto(produto) {
    const id = Number(produto.id_produto);

    if (cacheFotos.has(id)) {
        return cacheFotos.get(id);
    }

    // Sem foto cadastrada, não usamos imagens antigas como alternativa.
    let caminho = "";

    try {
        const resposta = await fetch(
            URL_IMAGENS + "/produto/" + id + "/imagens"
        );

        if (resposta.ok) {
            const dados = await resposta.json();

            if (dados.sucesso && Array.isArray(dados.imagens) && dados.imagens.length) {
                // O backend ordena os nomes das fotos: foto1 vem primeiro.
                const primeira = dados.imagens[0];
                caminho = new URL(primeira, URL_IMAGENS).href;
            }
        }
    } catch (erro) {
        console.warn("Não foi possível consultar a foto do produto:", id, erro);
    }

    cacheFotos.set(id, caminho);
    return caminho;
}

// Preenche a imagem sem impedir o funcionamento do carrinho.
async function carregarFotoDoItem(imagem, produto, aviso) {
    if (!produto) return;
    const caminho = await obterPrimeiraFoto(produto);
    if (!imagem.isConnected) return;
    if (!caminho) {
        imagem.hidden = true;
        aviso.hidden = false;
        return;
    }
    imagem.onload = function() {
        imagem.hidden = false;
        aviso.hidden = true;
    };
    imagem.onerror = function() {
        imagem.hidden = true;
        aviso.hidden = false;
    };
    imagem.src = caminho;
}

// =============================================
// MOSTRAR PRODUTOS NO CARRINHO
// =============================================

function renderizar() {

    lista.replaceChildren();

    let soma = 0;
    let validos = 0;

    const itens = LilaCarrinho.listar();

    mensagem.textContent = itens.length
        ? ""
        : "Seu carrinho está vazio.";

    itens.forEach(item => {

        // Procura o produto correspondente.
        const produto = produtos.find(
            p => Number(p.id_produto) === item.id_produto
        );

        // Verifica a disponibilidade.
        const disponivel =
            produto && produto.disponivel !== false;

        const preco = disponivel
            ? Number(produto.preco)
            : 0;

        const valido =
            disponivel &&
            Number.isFinite(preco) &&
            preco > 0;

        if (valido) {
            soma += preco * item.quantidade;
            validos++;
        }

        // Cria o cartão do produto.
        const linha = document.createElement("article");
        linha.className = "item";

        // Informações.
        const descricao = document.createElement("div");
        descricao.className = "descricao-item";

        const nome = document.createElement("h3");
        nome.textContent =
            produto?.nome_produto || "Produto não encontrado";

        const sabor = document.createElement("p");
        sabor.textContent =
            "Sabor: " + (produto?.nome_sabor || "Indisponível");

        const precoTexto = document.createElement("p");

        precoTexto.textContent = valido
            ? "Preço unitário: " + dinheiro(preco)
            : "Indisponível — remova este item";

        descricao.append(nome, sabor, precoTexto);

        // =====================================
        // CONTROLES DE QUANTIDADE
        // =====================================

        const controles = document.createElement("div");
        controles.className = "controles-item";

                
        // =============================================
        // CONTROLE DE QUANTIDADE PERSONALIZADO
        // =============================================

        // Título acima dos botões.
        const rotulo = document.createElement("label");
        rotulo.textContent = "Quantidade";

        // Caixa que organiza os botões e o número.
        const seletorQuantidade = document.createElement("div");
        seletorQuantidade.className = "seletor-quantidade";

        // Botão + à esquerda.
        const btnMais = document.createElement("button");
        btnMais.type = "button";
        btnMais.className = "btn-quantidade";
        btnMais.textContent = "+";
        btnMais.setAttribute(
            "aria-label",
            "Aumentar quantidade de " + nome.textContent
        );

        // Número centralizado.
        const quantidade = document.createElement("span");
        quantidade.className = "numero-quantidade";
        quantidade.textContent = item.quantidade;

        // Botão - à direita.
        const btnMenos = document.createElement("button");
        btnMenos.type = "button";
        btnMenos.className = "btn-quantidade";
        btnMenos.textContent = "−";
        btnMenos.setAttribute(
            "aria-label",
            "Diminuir quantidade de " + nome.textContent
        );

        // Não permite quantidade menor que 1.
        btnMenos.disabled = item.quantidade <= 1;

        // Não permite quantidade maior que 999.
        btnMais.disabled = item.quantidade >= 999;

        // Função que altera a quantidade no carrinho.
        function mudarQuantidade(novaQuantidade) {

            try {

                LilaCarrinho.alterar(
                    item.id_produto,
                    novaQuantidade
                );

                // Atualiza os produtos e os valores.
                renderizar();

            } catch (erro) {

                mostrarAviso(
                    "Não foi possível alterar",
                    erro.message
                );
            }
        }

        // Aumenta uma unidade.
        btnMais.addEventListener("click", () => {
            mudarQuantidade(item.quantidade + 1);
        });

        // Diminui uma unidade.
        btnMenos.addEventListener("click", () => {
            mudarQuantidade(item.quantidade - 1);
        });

        // Organiza os elementos na ordem solicitada.
        seletorQuantidade.append(
            btnMais,
            quantidade,
            btnMenos
        );

        // =====================================
        // REMOVER PRODUTO
        // =====================================

        const remover = document.createElement("button");

        remover.type = "button";
        remover.textContent = "Remover";

        remover.addEventListener("click", () => {

            LilaCarrinho.remover(item.id_produto);

            renderizar();
        });

        controles.append(rotulo, seletorQuantidade, remover);
        // =====================================
        // SUBTOTAL DO PRODUTO
        // =====================================

        const subtotal = document.createElement("div");
        subtotal.className = "subtotal";

        subtotal.textContent = valido
            ? dinheiro(preco * item.quantidade)
            : "—";

        // Foto à esquerda das informações do produto.
        const imagem = document.createElement("img");
        imagem.className = "imagem-item";
        imagem.alt = "Foto de " + nome.textContent;
        imagem.loading = "lazy";
        imagem.hidden = true;


        // Mensagem no lugar da foto quando o produto não tem imagens.
        const avisoFoto = document.createElement("div");
        avisoFoto.className = "lilas-sem-foto lilas-sem-foto-carrinho";
        avisoFoto.innerHTML = '<span class="lilas-sem-foto-icone" aria-hidden="true">🍯</span>' +
            '<strong>Uma foto deliciosa vem aí!</strong>';

        // Insere antes de consultar, para manter o aviso no lugar correto.
        linha.prepend(imagem, avisoFoto);
        carregarFotoDoItem(imagem, produto, avisoFoto);
        linha.append(descricao, controles, subtotal);

        lista.append(linha);
    });

    // Atualiza o total.
    total.textContent = dinheiro(soma);

    // Só permite finalizar com itens válidos.
    finalizar.disabled =
        !itens.length || validos !== itens.length;
}

// =============================================
// FINALIZAR PEDIDO
// =============================================

finalizar.addEventListener("click", () => {
    // O checkout verifica o login e mantém os produtos no carrinho.
    window.location.href = "../checkout/checkout.html";
});

// Carrega os dados ao abrir a página.
carregarCarrinho();
