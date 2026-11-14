
/* ==========================================
   LILA'S - CRUD DE PRODUTOS
   MODELO CANDY SHOP
   ========================================== */

// Endereço do backend
const URL_API = window.location.origin;

// ==========================================
// CAMPOS DO FORMULÁRIO
// ==========================================

const campoId = document.getElementById("id_produto");
const campoNome = document.getElementById("nome_produto");
const campoDescricao = document.getElementById("descricao");
const campoPreco = document.getElementById("preco");
const campoCategoria = document.getElementById("id_categoria");
const campoSabor = document.getElementById("id_sabor");
const campoDisponivel = document.getElementById("disponivel");

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================

const mensagem = document.getElementById("mensagem");
const listaProdutos = document.getElementById("listaProdutos");
const conteudo = document.getElementById("conteudo");
const avisoAcesso = document.getElementById("avisoAcesso");

const botoesPrincipais =
    document.getElementById("botoesPrincipais");

const botoesConfirmacao =
    document.getElementById("botoesConfirmacao");

// ==========================================
// BOTÕES
// ==========================================

const btnProcurar = document.getElementById("btnProcurar");
const btnInserir = document.getElementById("btnInserir");
const btnAlterar = document.getElementById("btnAlterar");
const btnExcluir = document.getElementById("btnExcluir");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const btnAtualizar = document.getElementById("btnAtualizar");

// Elementos da galeria de fotos
const areaImagens = document.getElementById("areaImagens");
const arquivosImagens = document.getElementById("arquivosImagens");
const btnEnviarImagens = document.getElementById("btnEnviarImagens");
const galeriaImagens = document.getElementById("galeriaImagens");
const mensagemImagens = document.getElementById("mensagemImagens");
let carregamentoImagens = 0;
// Alterações temporárias: só serão enviadas ao clicar em Salvar.
let fotosParaEnviar = [];
let fotosParaExcluir = [];
let urlsPrevias = [];

// Libera os endereços temporários das prévias.
function liberarPrevias() {
    urlsPrevias.forEach(function(url) { URL.revokeObjectURL(url); });
    urlsPrevias = [];
}

// Mostra as fotos escolhidas antes de salvar, usando o CSS da galeria.
function mostrarPrevias() {
    // Retira apenas as prévias antigas; mantém as fotos já cadastradas.
    galeriaImagens.querySelectorAll(".previa-pendente").forEach(function(cartao) {
        cartao.remove();
    });
    liberarPrevias();

    fotosParaEnviar.forEach(function(arquivo, indice) {
        const cartao = document.createElement("div");
        cartao.className = "cartao-imagem previa-pendente";
        const foto = document.createElement("img");
        const url = URL.createObjectURL(arquivo);
        urlsPrevias.push(url);
        foto.src = url;
        foto.alt = "Prévia da imagem " + (indice + 1);
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Remover seleção";
        botao.disabled = !["alterar", "inserir"].includes(oQueEstaFazendo) || salvando;
        botao.onclick = function() {
            fotosParaEnviar.splice(indice, 1);
            mostrarPrevias();
            mensagemImagens.textContent = fotosParaEnviar.length
                ? fotosParaEnviar.length + " foto(s) aguardando Salvar."
                : "Seleção de fotos removida.";
        };
        cartao.appendChild(foto);
        cartao.appendChild(botao);
        galeriaImagens.appendChild(cartao);
    });
}


function atualizarEdicaoImagens() {
    const podeEditar = (oQueEstaFazendo === "alterar" || oQueEstaFazendo === "inserir") && !salvando;
    arquivosImagens.disabled = !podeEditar;
    btnEnviarImagens.disabled = !podeEditar;
    galeriaImagens.querySelectorAll("button").forEach(function(botao) {
        botao.disabled = !podeEditar;
    });
}

function descartarEdicaoImagens() {
    fotosParaEnviar = [];
    fotosParaExcluir = [];
    liberarPrevias();
    arquivosImagens.value = "";
    atualizarEdicaoImagens();
}


// ==========================================
// VARIÁVEIS DE CONTROLE
// ==========================================

// Indica se estamos inserindo, alterando ou excluindo
let oQueEstaFazendo = "";

// Guarda o ID do produto selecionado
let produtoSelecionado = null;

// Impede duas operações ao mesmo tempo
let salvando = false;

// ==========================================
// MOSTRAR AVISO
// ==========================================

function mostrarAviso(texto) {

    mensagem.textContent = texto;
    if (texto) LilaAvisos.alerta(texto);
}

// ==========================================
// BLOQUEAR ATRIBUTOS
// ==========================================

function bloquearAtributos(bloquear) {

    campoNome.disabled = bloquear;
    campoDescricao.disabled = bloquear;
    campoPreco.disabled = bloquear;
    campoCategoria.disabled = bloquear;
    campoSabor.disabled = bloquear;
    campoDisponivel.disabled = bloquear;
}

// ==========================================
// VISIBILIDADE DOS BOTÕES
// ==========================================

function visibilidadeDosBotoes(editando) {

    botoesPrincipais.hidden = editando;
    botoesConfirmacao.hidden = !editando;

    campoId.disabled = editando;
    btnProcurar.disabled = editando;
    btnAtualizar.disabled = editando;
    atualizarEdicaoImagens();
}

// ==========================================
// LIMPAR CAMPOS
// ==========================================

function limparCampos() {

    campoId.value = "";
    campoNome.value = "";
    campoDescricao.value = "";
    campoPreco.value = "";
    campoCategoria.value = "";
    campoSabor.value = "";
    campoDisponivel.value = "true";

    produtoSelecionado = null;
    limparGaleria();
}

// ==========================================
// PREENCHER CAMPOS
// ==========================================

function preencherCampos(produto) {

    campoId.value = produto.id_produto;
    campoNome.value = produto.nome_produto;
    campoDescricao.value = produto.descricao || "";
    campoPreco.value = produto.preco;
    campoCategoria.value = produto.id_categoria;
    campoSabor.value = produto.id_sabor;

    campoDisponivel.value =
        produto.disponivel ? "true" : "false";

    produtoSelecionado = Number(produto.id_produto);

    bloquearAtributos(true);

    mostrarAviso("Produto encontrado.");

    destacarProduto();
    carregarImagens();
}

// ==========================================
// DESTACAR PRODUTO
// ==========================================

function destacarProduto() {

    const linhas = listaProdutos.querySelectorAll("tr");

    linhas.forEach(function(linha) {

        linha.classList.toggle(
            "selecionada",
            produtoSelecionado !== null &&
            Number(linha.dataset.id) === produtoSelecionado
        );
    });
}

// ==========================================
// CARREGAR CATEGORIAS E SABORES
// ==========================================

async function carregarOpcoes() {

    // Busca as categorias cadastradas
    const respostaCategorias = await fetch(
        URL_API + "/admin/categoria/listar",
        { credentials: "include" }
    );

    // Busca os sabores cadastrados
    const respostaSabores = await fetch(
        URL_API + "/admin/sabor/listar",
        { credentials: "include" }
    );

    const dadosCategorias = await respostaCategorias.json();
    const dadosSabores = await respostaSabores.json();

    // Verifica as duas respostas
    if (!respostaCategorias.ok || !dadosCategorias.sucesso ||
        !respostaSabores.ok || !dadosSabores.sucesso) {

        throw new Error(
            "Não foi possível carregar categorias e sabores."
        );
    }

    // Limpa os selects
    campoCategoria.innerHTML =
        '<option value="">Selecione uma categoria</option>';

    campoSabor.innerHTML =
        '<option value="">Selecione um sabor</option>';

    // Adiciona as categorias
    dadosCategorias.categorias.forEach(function(categoria) {

        const opcao = document.createElement("option");

        opcao.value = categoria.id_categoria;
        opcao.textContent = categoria.nome_categoria;

        campoCategoria.appendChild(opcao);
    });

    // Adiciona os sabores
    dadosSabores.sabores.forEach(function(sabor) {

        const opcao = document.createElement("option");

        opcao.value = sabor.id_sabor;
        opcao.textContent = sabor.nome_sabor;

        campoSabor.appendChild(opcao);
    });
}

// ==========================================
// LISTAR PRODUTOS
// ==========================================

async function listar() {

    try {

        const resposta = await fetch(
            URL_API + "/admin/produto/listar",
            { credentials: "include" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {

            mostrarAviso(
                dados.mensagem || "Erro ao listar produtos."
            );

            return;
        }

        // Limpa a tabela
        listaProdutos.innerHTML = "";

        if (dados.produtos.length === 0) {

            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 6;
            celula.textContent = "Nenhum produto cadastrado.";

            linha.appendChild(celula);
            listaProdutos.appendChild(linha);

            return;
        }

        // Cria uma linha para cada produto
        dados.produtos.forEach(function(produto) {

            const linha = document.createElement("tr");

            linha.dataset.id = produto.id_produto;

            const valores = [
                produto.id_produto,
                produto.nome_produto,
                produto.nome_sabor,
                produto.nome_categoria,
                Number(produto.preco).toLocaleString(
                    "pt-BR",
                    {
                        style: "currency",
                        currency: "BRL"
                    }
                ),
                produto.disponivel
                    ? "Disponível"
                    : "Indisponível"
            ];

            // Cria as células sem utilizar HTML dos dados
            valores.forEach(function(valor, indice) {

                const celula = document.createElement("td");

                celula.textContent = valor;

                if (indice === 5) {

                    celula.className = produto.disponivel
                        ? "status-disponivel"
                        : "status-indisponivel";
                }

                linha.appendChild(celula);
            });

            // Seleciona o produto ao clicar
            linha.onclick = function() {

                if (oQueEstaFazendo !== "" || salvando) {
                    return;
                }

                preencherCampos(produto);
            };

            listaProdutos.appendChild(linha);
        });

        destacarProduto();

    } catch (erro) {

        console.log("Erro ao listar produtos:", erro);
        mostrarAviso("Erro ao conectar ao servidor.");
    }
}

// ==========================================
// PROCURAR PRODUTO
// ==========================================

async function procure() {

    const id = Number(campoId.value);

    if (!Number.isInteger(id) || id <= 0) {

        mostrarAviso("Informe um código válido.");
        return;
    }

    try {

        const resposta = await fetch(
            URL_API + "/admin/produto/" + id,
            { credentials: "include" }
        );

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            preencherCampos(dados.produto);

        } else {

            limparCampos();
            bloquearAtributos(true);
            destacarProduto();

            mostrarAviso(
                dados.mensagem || "Produto não encontrado."
            );
        }

    } catch (erro) {

        console.log("Erro ao procurar produto:", erro);
        mostrarAviso("Erro ao conectar ao servidor.");
    }
}

// ==========================================
// INSERIR PRODUTO
// ==========================================

function inserir() {

    limparCampos();

    oQueEstaFazendo = "inserir";

    bloquearAtributos(false);
    visibilidadeDosBotoes(true);

    destacarProduto();

    // No cadastro, libera as fotos mesmo antes de existir um ID.
    // As imagens serão enviadas após o banco gerar o ID ao salvar.
    areaImagens.hidden = false;
    galeriaImagens.replaceChildren();
    mensagemImagens.textContent = "Escolha as fotos do novo produto. Elas serão salvas junto com o cadastro.";
    atualizarEdicaoImagens();

    mostrarAviso("Preencha os dados e escolha as fotos; depois clique em Salvar.");

    campoNome.focus();
}

// ==========================================
// ALTERAR PRODUTO
// ==========================================

function alterar() {

    if (produtoSelecionado === null) {

        mostrarAviso("Primeiro procure ou selecione um produto.");
        return;
    }

    oQueEstaFazendo = "alterar";

    bloquearAtributos(false);
    visibilidadeDosBotoes(true);

    mostrarAviso("Altere os dados e as fotos; clique em Salvar para confirmar tudo.");
    atualizarEdicaoImagens();

    campoNome.focus();
}

// ==========================================
// EXCLUIR PRODUTO
// ==========================================

async function excluir() {

    if (produtoSelecionado === null) {

        mostrarAviso("Primeiro procure ou selecione um produto.");
        return;
    }

    const confirmou = await LilaAvisos.confirmar(
        "Deseja realmente excluir este produto?"
    );

    if (!confirmou) {
        return;
    }

    oQueEstaFazendo = "excluir";

    salvar();
}

// ==========================================
// SALVAR OPERAÇÃO
// ==========================================

async function salvar() {

    if (oQueEstaFazendo === "" || salvando) {
        return;
    }

    const operacao = oQueEstaFazendo;

    // Dados enviados ao backend
    const produto = {
        nome_produto: campoNome.value.trim(),
        descricao: campoDescricao.value.trim(),
        preco: campoPreco.value,
        id_categoria: campoCategoria.value,
        id_sabor: campoSabor.value,
        disponivel: campoDisponivel.value === "true"
    };

    // Validação do formulário
    if (operacao !== "excluir") {

        if (!produto.nome_produto) {

            mostrarAviso("Informe o nome do produto.");
            return;
        }

        if (produto.preco === "" ||
            !Number.isFinite(Number(produto.preco)) ||
            Number(produto.preco) <= 0) {

            mostrarAviso("Informe um preço válido.");
            return;
        }

        if (!produto.id_categoria || !produto.id_sabor) {

            mostrarAviso("Selecione a categoria e o sabor.");
            return;
        }
    }

    let endereco = URL_API + "/admin/produto";
    let metodo = "POST";

    if (operacao === "alterar") {

        endereco += "/" + produtoSelecionado;
        metodo = "PUT";

    } else if (operacao === "excluir") {

        endereco += "/" + produtoSelecionado;
        metodo = "DELETE";
    }

    salvando = true;

    btnSalvar.disabled = true;
    btnCancelar.disabled = true;
    btnExcluir.disabled = true;

    try {

        const resposta = await fetch(endereco, {

            method: metodo,

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            body: operacao === "excluir"
                ? undefined
                : JSON.stringify(produto)
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            // Depois de salvar os dados, confirma as alterações das fotos.
            let resultadoFotos = "";
            if (operacao === "alterar") {
                resultadoFotos = await confirmarEdicaoImagens(produtoSelecionado);
            } else if (operacao === "inserir") {
                // O POST devolve o produto cadastrado com seu ID real.
                const novoId = dados.produto && dados.produto.id_produto;
                if (fotosParaEnviar.length) {
                    if (novoId) {
                        resultadoFotos = await confirmarEdicaoImagens(novoId);
                    } else {
                        resultadoFotos = "Atenção: produto cadastrado, mas o servidor não retornou o ID para enviar as fotos.";
                    }
                }
            }
            cancelar();
            await listar();
            mostrarAviso(dados.mensagem + (resultadoFotos ? " " + resultadoFotos : ""));

        } else {

            mostrarAviso(
                dados.mensagem || "Não foi possível salvar."
            );
        }

    } catch (erro) {

        console.log("Erro ao salvar produto:", erro);

        mostrarAviso("Erro ao conectar ao servidor.");

    } finally {

        salvando = false;

        btnSalvar.disabled = false;
        btnCancelar.disabled = false;
        btnExcluir.disabled = false;

        if (operacao === "excluir") {

            oQueEstaFazendo = "";
        }
    }
}

// ==========================================
// CANCELAR
// ==========================================

function cancelar() {

    descartarEdicaoImagens();
    oQueEstaFazendo = "";

    limparCampos();

    bloquearAtributos(true);
    visibilidadeDosBotoes(false);

    mostrarAviso("");
    destacarProduto();
}

// ==========================================
// VERIFICAR ACESSO
// ==========================================

async function verificarAcesso() {

    try {

        const resposta = await fetch(
            URL_API + "/admin/verificar",
            { credentials: "include" }
        );

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            conteudo.hidden = false;
            avisoAcesso.hidden = true;

            cancelar();

            // Carrega categorias e sabores
            await carregarOpcoes();

            // Carrega os produtos
            await listar();

        } else if (resposta.status === 401) {

            window.location.href = "../../login/login.html";

        } else {

            avisoAcesso.textContent =
                "Você não possui permissão para acessar esta página.";
        }

    } catch (erro) {

        console.log("Erro ao iniciar gerenciamento:", erro);

        if (conteudo.hidden) {

            avisoAcesso.textContent =
                "Não foi possível conectar ao servidor.";

        } else {

            mostrarAviso(
                "Erro ao carregar categorias, sabores ou produtos."
            );
        }
    }
}

// ==========================================
// GALERIA DE IMAGENS DO PRODUTO
// ==========================================

// Esconde a galeria quando não há produto selecionado
function limparGaleria() {
    carregamentoImagens++;
    areaImagens.hidden = true;
    arquivosImagens.value = "";
    galeriaImagens.replaceChildren();
    mensagemImagens.textContent = "";
    descartarEdicaoImagens();
}

// Busca as imagens do produto selecionado
async function carregarImagens() {
    const id = produtoSelecionado;
    if (!id) {
        limparGaleria();
        return;
    }

    const numeroConsulta = ++carregamentoImagens;
    areaImagens.hidden = false;
    galeriaImagens.replaceChildren();
    mensagemImagens.textContent = "Carregando imagens...";

    try {
        const resposta = await fetch(
            URL_API + "/admin/produto/" + id + "/imagens",
            { credentials: "include" }
        );
        const dados = await resposta.json();

        // Impede que uma resposta antiga apareça em outro produto
        if (numeroConsulta !== carregamentoImagens || id !== produtoSelecionado) return;

        if (!resposta.ok || !dados.sucesso) {
            mensagemImagens.textContent = dados.mensagem || "Erro ao carregar imagens.";
            return;
        }

        mensagemImagens.textContent = dados.imagens.length
            ? dados.imagens.length + " imagem(ns) cadastrada(s)."
            : "Este produto ainda não tem imagens enviadas.";

        dados.imagens.forEach(function(caminho) {
            const cartao = document.createElement("div");
            cartao.className = "cartao-imagem";

            const foto = document.createElement("img");
            foto.src = caminho;
            foto.alt = "Foto do produto " + id;
            foto.loading = "lazy";

            const botao = document.createElement("button");
            botao.type = "button";
            botao.textContent = "Excluir foto";
            botao.onclick = function() {
                excluirImagem(id, caminho);
            };
            botao.disabled = !["alterar", "inserir"].includes(oQueEstaFazendo) || salvando;
            if (fotosParaExcluir.includes(caminho)) {
                cartao.style.opacity = "0.4";
                botao.textContent = "Desfazer exclusão";
            }

            cartao.appendChild(foto);
            cartao.appendChild(botao);
            galeriaImagens.appendChild(cartao);
        });
        mostrarPrevias();
    } catch (erro) {
        if (numeroConsulta === carregamentoImagens) {
            console.log("Erro ao carregar imagens:", erro);
            mensagemImagens.textContent = "Erro ao conectar ao servidor.";
        }
    }
}

// Seleciona fotos para enviar quando clicar em Salvar.
function enviarImagens() {
    if (oQueEstaFazendo !== "alterar" && oQueEstaFazendo !== "inserir") return;
    const arquivos = Array.from(arquivosImagens.files);
    if (!arquivos.length) {
        mensagemImagens.textContent = "Selecione pelo menos uma foto.";
        return;
    }
    if (fotosParaEnviar.length + arquivos.length > 10 || arquivos.some(function(f) {
        return f.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(f.type);
    })) {
        mensagemImagens.textContent = "Escolha até 10 fotos JPG, JPEG ou PNG (5 MB cada).";
        return;
    }
    fotosParaEnviar.push(...arquivos);
    arquivosImagens.value = "";
    areaImagens.hidden = false;
    mostrarPrevias();
    mensagemImagens.textContent = fotosParaEnviar.length +
        " foto(s) aguardando Salvar. Cancelar descarta a seleção.";
}

// Marca ou desmarca uma foto para exclusão; não apaga imediatamente.
function excluirImagem(id, caminho) {
    if (oQueEstaFazendo !== "alterar" || id !== produtoSelecionado) return;
    if (fotosParaExcluir.includes(caminho)) {
        fotosParaExcluir = fotosParaExcluir.filter(function(foto) {
            return foto !== caminho;
        });
    } else {
        fotosParaExcluir.push(caminho);
    }
    carregarImagens();
}

// Executa os uploads e exclusões apenas após o PUT do produto dar certo.
async function confirmarEdicaoImagens(id) {
    let falhas = 0;
    if (fotosParaEnviar.length) {
        const formulario = new FormData();
        fotosParaEnviar.forEach(function(arquivo) {
            formulario.append("imagens", arquivo);
        });
        try {
            const resposta = await fetch(URL_API + "/admin/produto/" + id + "/imagens", {
                method: "POST", credentials: "include", body: formulario
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados.sucesso) falhas++;
        } catch (erro) {
            console.log("Erro no envio das imagens:", erro);
            falhas++;
        }
    }
    for (const caminho of fotosParaExcluir) {
        const nome = caminho.split("/").pop();
        try {
            const resposta = await fetch(
                URL_API + "/admin/produto/" + id + "/imagens/" + encodeURIComponent(nome),
                { method: "DELETE", credentials: "include" }
            );
            const dados = await resposta.json();
            if (!resposta.ok || !dados.sucesso) falhas++;
        } catch (erro) {
            console.log("Erro ao excluir foto:", erro);
            falhas++;
        }
    }
    return falhas
        ? "Atenção: os dados foram salvos, mas " + falhas + " operação(ões) com fotos falharam."
        : "Alterações das fotos concluídas.";
}

btnEnviarImagens.onclick = enviarImagens;
atualizarEdicaoImagens();

// ==========================================
// CONFIGURAR BOTÕES
// ==========================================

btnProcurar.onclick = procure;
btnInserir.onclick = inserir;
btnAlterar.onclick = alterar;
btnExcluir.onclick = excluir;
btnSalvar.onclick = salvar;
btnCancelar.onclick = cancelar;
btnAtualizar.onclick = listar;

// Inicia a página
window.onload = verificarAcesso;
