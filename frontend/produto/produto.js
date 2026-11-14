
// Endereço do servidor
const URL_API = window.location.origin; //"http://localhost:3001";

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

    // Mostra a descrição
    document.getElementById("descricaoProduto").textContent =
        produto.descricao || "Um delicioso pão de mel preparado com carinho!";

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

    // Para os quatro produtos originais, mantém as fotos antigas
    // quando não houver imagens cadastradas pelo administrador.
    if (imagensEncontradas.length === 0 && imagensProdutos[nomeSelecionado]) {
        imagensEncontradas.push(...imagensProdutos[nomeSelecionado]);
    }

    window.imagensDaGaleria = imagensEncontradas;
    imagemAtual = 0;

    if (imagensEncontradas.length === 0) {
        // Não tenta carregar pdm.jpg ou outro arquivo inexistente.
        const elemento = document.getElementById("imagemProduto");
        elemento.removeAttribute("src");
        elemento.alt = "Este produto ainda não possui imagens";
        document.getElementById("indicadoresImagens").innerHTML = "";
        document.getElementById("imagemAnterior").hidden = true;
        document.getElementById("imagemProxima").hidden = true;
        return;
    }

    document.getElementById("imagemAnterior").hidden = imagensEncontradas.length < 2;
    document.getElementById("imagemProxima").hidden = imagensEncontradas.length < 2;
    mostrarImagem();
}


// Mostra a imagem selecionada
function mostrarImagem() {

    // Busca a imagem atual
    const imagem = window.imagensDaGaleria[imagemAtual];

    // Atualiza a imagem principal
    document.getElementById("imagemProduto").src = imagem;

    // Atualiza o texto alternativo
    document.getElementById("imagemProduto").alt = nomeSelecionado;

    // Atualiza os indicadores
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


// Adiciona o produto ao carrinho
function adicionarAoCarrinho() {

    // Busca o sabor selecionado
    const idProduto = document.getElementById("selectSabor").value;

    // Busca a quantidade
    const quantidade = Number(
        document.getElementById("quantidadeProduto").value
    );

    // Verifica se o cliente escolheu um sabor
    if (idProduto === "") {
        alert("Escolha um sabor antes de continuar.");
        return;
    }

    // Verifica a quantidade
    if (quantidade < 1 || !Number.isInteger(quantidade)) {
        alert("Informe uma quantidade válida.");
        return;
    }

    // Por enquanto, mostra a seleção realizada
    alert(
        "Produto selecionado!\n" +
        "ID: " + idProduto + "\n" +
        "Quantidade: " + quantidade
    );

}


// Liga o botão de adicionar ao carrinho
document.getElementById("btnAdicionarCarrinho").onclick =
    adicionarAoCarrinho;
