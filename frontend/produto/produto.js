
// Endereço do servidor
const URL_API = "http://localhost:3001";

// Recebe o nome do produto enviado pela página inicial
const parametros = new URLSearchParams(window.location.search);
const nomeSelecionado = parametros.get("nome");

// Guarda os produtos encontrados
let produtosDoTipo = [];

// Guarda a imagem que está sendo exibida
let imagemAtual = 0;

// Lista de imagens disponíveis para cada tipo de produto
// Os caminhos usam arquivos que já estão na pasta imagens
// Fotos de cada tipo de pão de mel
const imagensProdutos = {

    // Fotos exclusivas do pão de mel grande
    "Pão de mel normal": [
        "../imagens-produtos/pao-grande/foto1.jpg",
        "../imagens-produtos/pao-grande/foto2.jpg",
        "../imagens-produtos/pao-grande/foto3.jpg"
    ],

    // Fotos exclusivas do mini clássico
    "Mini clássico": [
        "../imagens-produtos/mini-classico/foto1.jpg",
        "../imagens-produtos/mini-classico/foto2.jpg",
        "../imagens-produtos/mini-classico/foto3.jpg"
    ],

    // Fotos exclusivas do mini refinado
    "Mini refinado": [
        "../imagens-produtos/mini-refinado/foto1.jpg",
        "../imagens-produtos/mini-refinado/foto2.jpg",
        "../imagens-produtos/mini-refinado/foto3.jpg"
    ],

    // Fotos exclusivas do mini no palito
    "Mini no palito": [
        "../imagens-produtos/mini-palito/foto1.jpg",
        "../imagens-produtos/mini-palito/foto2.jpg",
        "../imagens-produtos/mini-palito/foto3.jpg"
    ]
};


// Textos gerais para cada tipo de produto, sem depender de um sabor específico.
const descricoesGerais = {
    "Pão de mel normal": "Pão de mel artesanal com massa macia, recheio cremoso e cobertura de chocolate. Escolha entre nossos sabores e aproveite!",
    "Mini clássico": "A versão mini do nosso pão de mel artesanal, perfeita para festas, lembrancinhas e momentos especiais. Escolha seu sabor favorito!",
    "Mini refinado": "Mini pães de mel com apresentação refinada, ideais para presentear e celebrar. Escolha o recheio que mais combina com você!",
    "Mini no palito": "Pão de mel em versão mini no palito, uma opção prática e deliciosa para festas e comemorações. Escolha seu sabor favorito!"
};

// Quando a página carregar, busca os dados
window.onload = carregarProduto;


// Busca os produtos no banco de dados
async function carregarProduto() {

    try {

        // Busca todos os produtos cadastrados
        const resposta = await fetch(URL_API + "/produto/listar");

        // Converte a resposta para JSON
        const dados = await resposta.json();

        // Verifica se a consulta funcionou
        if (resposta.ok && dados.sucesso) {

            // Seleciona somente os sabores do produto escolhido
            produtosDoTipo = dados.produtos.filter(function(produto) {
                return produto.nome_produto === nomeSelecionado;
            });

            // Verifica se encontrou o produto
            if (produtosDoTipo.length === 0) {
                document.getElementById("nomeProduto").textContent =
                    "Produto não encontrado.";

                return;
            }

            // Mostra as informações do produto
            mostrarInformacoes();

            // Prepara a galeria de imagens
            await carregarGaleria();

        } else {

            document.getElementById("nomeProduto").textContent =
                "Erro ao carregar o produto.";

        }

    } catch (erro) {

        // Mostra o erro no console
        console.log("Erro ao carregar produto:", erro);

        document.getElementById("nomeProduto").textContent =
            "Não foi possível conectar ao servidor.";

    }
}


// Mostra as informações do produto
function mostrarInformacoes() {

    // Usa o primeiro registro para buscar o nome e o preço
    const produto = produtosDoTipo[0];

    // Mostra o nome
    document.getElementById("nomeProduto").textContent =
        produto.nome_produto;

    document.getElementById("tituloProduto").textContent =
        produto.nome_produto;

    // Descrição geral do tipo, não do sabor.
    document.getElementById("descricaoProduto").textContent =
        produto.descricao_geral?.trim() || "Este produto ainda não possui descrição geral cadastrada.";

    // Mostra o preço
    document.getElementById("precoProduto").textContent =
        "R$ " + Number(produto.preco).toFixed(2);

    // Procura o campo de sabores
    const selectSabor = document.getElementById("selectSabor");

    // Limpa as opções anteriores
    selectSabor.innerHTML = "";

    // Cria a primeira opção
    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione um sabor";

    selectSabor.appendChild(opcaoInicial);

    // Adiciona os sabores disponíveis
    produtosDoTipo.forEach(function(item) {

        const opcao = document.createElement("option");

        // O valor guarda o ID do produto correspondente ao sabor
        opcao.value = item.id_produto;

        // O texto mostra o nome do sabor
        opcao.textContent = item.nome_sabor;

        selectSabor.appendChild(opcao);

    });

    selectSabor.addEventListener(
        "change",
        atualizarDetalhesSabor
    );

}


// Atualiza a descrição e informa o estoque pronto do sabor selecionado.
function atualizarDetalhesSabor() {
    const id = Number(document.getElementById("selectSabor").value);
    const produto = produtosDoTipo.find(p => Number(p.id_produto) === id);
    const descricao = document.getElementById("descricaoSabor");
    const estoque = document.getElementById("estoqueSabor");
    descricao.textContent = produto
        ? (produto.descricao_sabor?.trim() ||
        "Este sabor ainda não possui descrição cadastrada.")
        : "";    if (!produto) { estoque.textContent = ""; return; }
    const normal = (produto.regra_producao === "estoque");
    if (!normal) {
        estoque.textContent = "Produzido sob encomenda. Peça com pelo menos 7 dias de antecedência.";
    } else {
        const qtd = Number(produto.estoque_pronto || 0);
        estoque.textContent = qtd > 0
            ? `${qtd} unidade(s) pronta(s) disponíveis. Quantidades maiores exigem 7 dias de antecedência.`
            : "Sem unidades prontas disponíveis. Você pode encomendar com pelo menos 7 dias de antecedência.";
    }
}

// Prepara as imagens da galeria
// Prepara as imagens da galeria, consultando o backend pelo ID.
async function carregarGaleria() {

    // Fotos cadastradas pela administração, sem duplicatas.
    const imagensEncontradas = [];

    // Cada sabor pode ter um ID diferente no banco.
    for (const produto of produtosDoTipo) {
        try {
            const resposta = await fetch(
                URL_API + "/produto/" + produto.id_produto + "/imagens"
            );

            if (!resposta.ok) continue;

            const dados = await resposta.json();

            if (dados.sucesso && Array.isArray(dados.imagens)) {
                dados.imagens.forEach(function(caminho) {
                    if (!imagensEncontradas.includes(caminho)) {
                        imagensEncontradas.push(caminho);
                    }
                });
            }
        } catch (erro) {
            console.log("Não foi possível carregar as imagens:", erro);
        }
    }

    window.imagensDaGaleria = imagensEncontradas;
    imagemAtual = 0;

    if (imagensEncontradas.length === 0) {
        // Não tenta carregar pdm.jpg ou outro arquivo inexistente.
        const elemento = document.getElementById("imagemProduto");
        elemento.removeAttribute("src");
        elemento.hidden = true;
        document.getElementById("avisoSemFotoProduto").hidden = false;
        elemento.alt = "Este produto ainda não possui imagens";
        document.getElementById("indicadoresImagens").innerHTML = "";
        document.getElementById("imagemAnterior").hidden = true;
        document.getElementById("imagemProxima").hidden = true;
        return;
    }

    document.getElementById("imagemProduto").hidden = false;
    document.getElementById("avisoSemFotoProduto").hidden = true;
    document.getElementById("imagemAnterior").hidden = imagensEncontradas.length < 2;
    document.getElementById("imagemProxima").hidden = imagensEncontradas.length < 2;
    mostrarImagem();
}


// Mostra a imagem selecionada
function mostrarImagem() {

    const imagem = window.imagensDaGaleria[imagemAtual];

    const elemento = document.getElementById("imagemProduto");

    if (!imagem) {
        elemento.removeAttribute("src");
        elemento.hidden = true;
        return;
    }

    // Constrói a URL no servidor correto
    const caminhoImagem = new URL(imagem, URL_API).href;

    elemento.src = caminhoImagem;
    elemento.alt = nomeSelecionado;
    elemento.hidden = false;

    elemento.onerror = function() {
        console.error("Erro ao carregar imagem:", caminhoImagem);
    };

    mostrarIndicadores();
}


// Cria os indicadores da galeria
function mostrarIndicadores() {

    // Procura a área dos indicadores
    const area = document.getElementById("indicadoresImagens");

    // Limpa os indicadores anteriores
    area.innerHTML = "";

    // Cria um indicador para cada imagem
    window.imagensDaGaleria.forEach(function(imagem, indice) {

        const indicador = document.createElement("button");

        indicador.className = "indicador-imagem";

        // Destaca a imagem atual
        if (indice === imagemAtual) {
            indicador.classList.add("ativo");
        }

        // Ao clicar, mostra a imagem escolhida
        indicador.onclick = function() {

            imagemAtual = indice;
            mostrarImagem();

        };

        area.appendChild(indicador);

    });

}


// Avança para a próxima imagem
function proximaImagem() {

    imagemAtual++;

    // Volta para a primeira imagem quando chegar ao final
    if (imagemAtual >= window.imagensDaGaleria.length) {
        imagemAtual = 0;
    }

    mostrarImagem();

}


// Volta para a imagem anterior
function imagemAnterior() {

    imagemAtual--;

    // Vai para a última imagem se estiver na primeira
    if (imagemAtual < 0) {
        imagemAtual = window.imagensDaGaleria.length - 1;
    }

    mostrarImagem();

}


// Liga os botões da galeria
document.getElementById("imagemProxima").onclick = proximaImagem;

document.getElementById("imagemAnterior").onclick = imagemAnterior;


// Adiciona o sabor escolhido ao armazenamento local do carrinho.
function adicionarAoCarrinho() {
    const idProduto = Number(document.getElementById("selectSabor").value);
    const quantidade = Number(document.getElementById("quantidadeProduto").value);
    if (!idProduto) { LilaAvisos.alerta("Escolha um sabor antes de continuar."); return; }
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 999) {
        LilaAvisos.alerta("Informe uma quantidade entre 1 e 999."); return;
    }
    const produto = produtosDoTipo.find(p => Number(p.id_produto) === idProduto);
    if (!produto || produto.disponivel === false) { LilaAvisos.alerta("Produto indisponível."); return; }
    try {
        LilaCarrinho.adicionar(idProduto, quantidade);
        // Produto já foi adicionado com sucesso.
        // Mostra a janela personalizada.
        mostrarConfirmacaoCarrinho();
    } catch (erro) { LilaAvisos.alerta(erro.message); }
}
document.getElementById("btnAdicionarCarrinho").onclick = adicionarAoCarrinho;


// =============================================
// JANELA DE CONFIRMAÇÃO DO CARRINHO
// =============================================

// Abre a janela personalizada.
function mostrarConfirmacaoCarrinho() {

    const modal = document.getElementById(
        "modalProdutoAdicionado"
    );

    if (modal && !modal.open) {
        modal.showModal();
    }
}

// Botão para continuar comprando.

/* =====================================================
   BOTÃO CONTINUAR COMPRANDO
   ===================================================== */

// Localiza o botão e a janela de confirmação.
const btnContinuar = document.getElementById("btnContinuarComprando");

const modalAdicionado = document.getElementById("modalProdutoAdicionado");

// Verifica se os elementos existem na página.
if (btnContinuar && modalAdicionado) {

    // Executa quando o cliente clica no botão.
    btnContinuar.addEventListener("click", function (evento) {

        // Impede qualquer comportamento padrão do botão.
        evento.preventDefault();

        // Fecha a janela personalizada.
        if (modalAdicionado.open) {
            modalAdicionado.close();
        }

    });
}


// =============================================
// MODAL PERSONALIZADO DO CARRINHO
// =============================================

// Mostra a janela após adicionar o produto.
function mostrarConfirmacaoCarrinho() {

    const modal = document.getElementById(
        "modalProdutoAdicionado"
    );

    if (modal && !modal.open) {
        modal.showModal();
    }
}

// Botão para continuar comprando.
document.getElementById("btnContinuarComprando")
    ?.addEventListener("click", () => {

        document.getElementById("modalProdutoAdicionado")
            .close();
    });
