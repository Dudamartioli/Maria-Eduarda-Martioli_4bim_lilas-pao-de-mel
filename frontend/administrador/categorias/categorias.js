
/* ==========================================
   LILA'S - CRUD DE CATEGORIAS
   ========================================== */

// Endereço do backend
const URL_API = window.location.origin;

// Elementos do formulário
const campoId = document.getElementById("id_categoria");
const campoNome = document.getElementById("nome_categoria");
const campoDescricao = document.getElementById("descricao");

// Elementos da página
const mensagem = document.getElementById("mensagem");
const listaCategorias = document.getElementById("listaCategorias");
const conteudo = document.getElementById("conteudo");
const avisoAcesso = document.getElementById("avisoAcesso");

// Botões
const btnProcurar = document.getElementById("btnProcurar");
const btnInserir = document.getElementById("btnInserir");
const btnAlterar = document.getElementById("btnAlterar");
const btnExcluir = document.getElementById("btnExcluir");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const btnAtualizar = document.getElementById("btnAtualizar");

// Grupos de botões
const botoesPrincipais =
    document.getElementById("botoesPrincipais");

const botoesConfirmacao =
    document.getElementById("botoesConfirmacao");

// Controla a operação atual
let oQueEstaFazendo = "";

// Guarda o ID da categoria encontrada
let categoriaSelecionada = null;

// ==========================================
// MOSTRAR MENSAGEM
// ==========================================

function mostrarAviso(texto) {

    mensagem.textContent = texto;
}

// ==========================================
// BLOQUEAR OU LIBERAR CAMPOS
// ==========================================

function bloquearAtributos(bloquear) {

    campoNome.disabled = bloquear;
    campoDescricao.disabled = bloquear;
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
}

// ==========================================
// LIMPAR CAMPOS
// ==========================================

function limparCampos() {

    campoId.value = "";
    campoNome.value = "";
    campoDescricao.value = "";

    categoriaSelecionada = null;
}

// ==========================================
// PREENCHER CAMPOS
// ==========================================

function preencherCampos(categoria) {

    campoId.value = categoria.id_categoria;
    campoNome.value = categoria.nome_categoria;
    campoDescricao.value = categoria.descricao || "";

    categoriaSelecionada = categoria.id_categoria;

    bloquearAtributos(true);
    mostrarAviso("Categoria encontrada.");

    // Destaca a categoria selecionada
    destacarCategoria();
}

// ==========================================
// DESTACAR CATEGORIA NA TABELA
// ==========================================

function destacarCategoria() {

    const linhas = listaCategorias.querySelectorAll("tr");

    linhas.forEach(function(linha) {

        linha.classList.toggle(
            "selecionada",
            Number(linha.dataset.id) === categoriaSelecionada
        );
    });
}

// ==========================================
// LISTAR CATEGORIAS
// ==========================================

async function listar() {

    try {

        const resposta = await fetch(
            URL_API + "/admin/categoria/listar",
            {
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {

            mostrarAviso(
                dados.mensagem || "Erro ao listar categorias."
            );

            return;
        }

        // Limpa a tabela antes de preencher
        listaCategorias.innerHTML = "";

        // Verifica se existem categorias
        if (dados.categorias.length === 0) {

            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 3;
            celula.textContent = "Nenhuma categoria cadastrada.";

            linha.appendChild(celula);
            listaCategorias.appendChild(linha);

            return;
        }

        // Percorre as categorias recebidas
        dados.categorias.forEach(function(categoria) {

            const linha = document.createElement("tr");

            linha.dataset.id = categoria.id_categoria;

            // Cria as três células
            const celulaId = document.createElement("td");
            const celulaNome = document.createElement("td");
            const celulaDescricao = document.createElement("td");

            // Insere os valores como texto
            celulaId.textContent = categoria.id_categoria;
            celulaNome.textContent = categoria.nome_categoria;
            celulaDescricao.textContent =
                categoria.descricao || "-";

            // Adiciona as células à linha
            linha.appendChild(celulaId);
            linha.appendChild(celulaNome);
            linha.appendChild(celulaDescricao);

            // Ao clicar, preenche o formulário
            linha.onclick = function() {

                if (oQueEstaFazendo !== "") {
                    return;
                }

                preencherCampos(categoria);
            };

            // Adiciona a linha à tabela
            listaCategorias.appendChild(linha);
        });

        destacarCategoria();

    } catch (erro) {

        console.log("Erro ao listar:", erro);
        mostrarAviso("Erro ao conectar ao servidor.");
    }
}

// ==========================================
// PROCURAR CATEGORIA
// ==========================================

async function procure() {

    const id = campoId.value.trim();

    if (!id || Number(id) <= 0) {

        mostrarAviso("Informe um código válido.");
        return;
    }

    try {

        const resposta = await fetch(
            URL_API + "/admin/categoria/" + id,
            {
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            preencherCampos(dados.categoria);

        } else {

            campoNome.value = "";
            campoDescricao.value = "";
            categoriaSelecionada = null;

            destacarCategoria();

            mostrarAviso(dados.mensagem);
        }

    } catch (erro) {

        console.log("Erro ao procurar:", erro);
        mostrarAviso("Erro ao conectar ao servidor.");
    }
}

// ==========================================
// INSERIR CATEGORIA
// ==========================================

function inserir() {

    limparCampos();

    oQueEstaFazendo = "inserir";

    bloquearAtributos(false);
    visibilidadeDosBotoes(true);

    mostrarAviso("Preencha os dados da nova categoria.");

    campoNome.focus();
}

// ==========================================
// ALTERAR CATEGORIA
// ==========================================

function alterar() {

    if (categoriaSelecionada === null) {

        mostrarAviso("Primeiro procure uma categoria.");
        return;
    }

    oQueEstaFazendo = "alterar";

    bloquearAtributos(false);
    visibilidadeDosBotoes(true);

    mostrarAviso("Altere os dados e clique em Salvar.");

    campoNome.focus();
}

// ==========================================
// EXCLUIR CATEGORIA
// ==========================================

function excluir() {

    if (categoriaSelecionada === null) {

        mostrarAviso("Primeiro procure uma categoria.");
        return;
    }

    const confirmou = confirm(
        "Deseja realmente excluir esta categoria?"
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

    if (oQueEstaFazendo === "") {
        return;
    }

    const operacao = oQueEstaFazendo;

    // Dados que serão enviados ao backend
    const categoria = {
        nome_categoria: campoNome.value.trim(),
        descricao: campoDescricao.value.trim()
    };

    // Valida o nome nas operações de inserção e alteração
    if (operacao !== "excluir" && !categoria.nome_categoria) {

        mostrarAviso("Informe o nome da categoria.");
        return;
    }

    // Define o endereço e o método da requisição
    let endereco = URL_API + "/admin/categoria";
    let metodo = "POST";

    if (operacao === "alterar") {

        endereco += "/" + categoriaSelecionada;
        metodo = "PUT";

    } else if (operacao === "excluir") {

        endereco += "/" + categoriaSelecionada;
        metodo = "DELETE";
    }

    // Impede cliques repetidos durante a operação
    btnSalvar.disabled = true;

    try {

        const resposta = await fetch(endereco, {

            method: metodo,

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            body: operacao === "excluir"
                ? undefined
                : JSON.stringify(categoria)
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            // Volta ao estado inicial
            cancelar();

            // Atualiza a tabela
            await listar();

            // Mostra o resultado
            mostrarAviso(dados.mensagem);

        } else {

            mostrarAviso(
                dados.mensagem || "Não foi possível salvar."
            );
        }

    } catch (erro) {

        console.log("Erro ao salvar:", erro);
        mostrarAviso("Erro ao conectar ao servidor.");

    } finally {

        btnSalvar.disabled = false;

        // Se a exclusão falhar, volta ao estado normal
        if (operacao === "excluir") {

            oQueEstaFazendo = "";
        }
    }
}

// ==========================================
// CANCELAR OPERAÇÃO
// ==========================================

function cancelar() {

    oQueEstaFazendo = "";

    limparCampos();

    bloquearAtributos(true);
    visibilidadeDosBotoes(false);

    mostrarAviso("");
    destacarCategoria();
}

// ==========================================
// VERIFICAR ACESSO ADMINISTRATIVO
// ==========================================

async function verificarAcesso() {

    try {

        const resposta = await fetch(
            URL_API + "/admin/verificar",
            {
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {

            // Libera a página para o administrador
            conteudo.hidden = false;
            avisoAcesso.hidden = true;

            // Prepara o formulário
            cancelar();

            // Carrega as categorias
            await listar();

        } else if (resposta.status === 401) {

            window.location.href = "../../login/login.html";

        } else {

            avisoAcesso.textContent =
                "Você não possui permissão para acessar esta página.";
        }

    } catch (erro) {

        console.log("Erro ao verificar acesso:", erro);

        avisoAcesso.textContent =
            "Não foi possível conectar ao servidor.";
    }
}

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
