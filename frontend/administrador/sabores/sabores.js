
/* ==========================================
   LILA'S - CRUD DE SABORES
   MODELO CANDY SHOP
   ========================================== */

// Endereço do backend
const URL_API = window.location.origin;

// ==========================================
// ELEMENTOS DO FORMULÁRIO
// ==========================================

// Campo do código
const campoId = document.getElementById("id_sabor");

// Campo do nome
const campoNome = document.getElementById("nome_sabor");

// Campo da descrição
const campoDescricao = document.getElementById("descricao");

// Mensagem do formulário
const mensagem = document.getElementById("mensagem");

// Corpo da tabela
const listaSabores = document.getElementById("listaSabores");

// Conteúdo protegido
const conteudo = document.getElementById("conteudo");

// Mensagem de acesso
const avisoAcesso = document.getElementById("avisoAcesso");

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

// Grupos de botões
const botoesPrincipais =
    document.getElementById("botoesPrincipais");

const botoesConfirmacao =
    document.getElementById("botoesConfirmacao");

// ==========================================
// VARIÁVEIS DE CONTROLE
// ==========================================

// Guarda a operação atual
let oQueEstaFazendo = "";

// Guarda o código do sabor selecionado
let saborSelecionado = null;


// ==========================================
// MOSTRAR AVISO
// ==========================================

function mostrarAviso(texto) {

    // Mostra a mensagem na tela
    mensagem.textContent = texto;
}


// ==========================================
// BLOQUEAR ATRIBUTOS
// ==========================================

function bloquearAtributos(bloquear) {

    // Bloqueia ou libera os campos
    campoNome.disabled = bloquear;
    campoDescricao.disabled = bloquear;
}


// ==========================================
// VISIBILIDADE DOS BOTÕES
// ==========================================

function visibilidadeDosBotoes(editando) {

    // Esconde os botões principais durante a edição
    botoesPrincipais.hidden = editando;

    // Mostra Salvar e Cancelar durante a edição
    botoesConfirmacao.hidden = !editando;

    // Bloqueia a pesquisa durante a edição
    campoId.disabled = editando;
    btnProcurar.disabled = editando;
    btnAtualizar.disabled = editando;
}


// ==========================================
// LIMPAR CAMPOS
// ==========================================

function limparCampos() {

    // Limpa os campos
    campoId.value = "";
    campoNome.value = "";
    campoDescricao.value = "";

    // Limpa a seleção
    saborSelecionado = null;
}


// ==========================================
// PREENCHER CAMPOS
// ==========================================

function preencherCampos(sabor) {

    // Preenche os dados encontrados
    campoId.value = sabor.id_sabor;
    campoNome.value = sabor.nome_sabor;
    campoDescricao.value = sabor.descricao || "";

    // Guarda o código selecionado
    saborSelecionado = Number(sabor.id_sabor);

    // Bloqueia os campos até clicar em Alterar
    bloquearAtributos(true);

    // Mostra a mensagem
    mostrarAviso("Sabor encontrado.");

    // Destaca a linha na tabela
    destacarSabor();
}


// ==========================================
// DESTACAR SABOR
// ==========================================

function destacarSabor() {

    // Recupera as linhas da tabela
    const linhas = listaSabores.querySelectorAll("tr");

    // Percorre todas as linhas
    linhas.forEach(function(linha) {

        // Destaca somente o sabor selecionado
        linha.classList.toggle(
            "selecionada",
            Number(linha.dataset.id) === saborSelecionado
        );
    });
}


// ==========================================
// LISTAR SABORES
// ==========================================

async function listar() {

    try {

        // Busca os sabores no backend
        const resposta = await fetch(
            URL_API + "/admin/sabor/listar",
            {
                credentials: "include"
            }
        );

        // Recebe o JSON
        const dados = await resposta.json();

        // Verifica se a listagem funcionou
        if (!resposta.ok || !dados.sucesso) {

            mostrarAviso(
                dados.mensagem || "Erro ao listar sabores."
            );

            return;
        }

        // Limpa a tabela
        listaSabores.innerHTML = "";

        // Verifica se existem sabores
        if (dados.sabores.length === 0) {

            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 3;
            celula.textContent = "Nenhum sabor cadastrado.";

            linha.appendChild(celula);
            listaSabores.appendChild(linha);

            return;
        }

        // Percorre os sabores
        dados.sabores.forEach(function(sabor) {

            // Cria uma linha
            const linha = document.createElement("tr");

            // Guarda o ID da linha
            linha.dataset.id = sabor.id_sabor;

            // Cria as células
            const celulaId = document.createElement("td");
            const celulaNome = document.createElement("td");
            const celulaDescricao = document.createElement("td");

            // Preenche as células
            celulaId.textContent = sabor.id_sabor;
            celulaNome.textContent = sabor.nome_sabor;
            celulaDescricao.textContent =
                sabor.descricao || "-";

            // Adiciona as células à linha
            linha.appendChild(celulaId);
            linha.appendChild(celulaNome);
            linha.appendChild(celulaDescricao);

            // Ao clicar, seleciona o sabor
            linha.onclick = function() {

                // Não permite trocar durante uma operação
                if (oQueEstaFazendo !== "") {
                    return;
                }

                preencherCampos(sabor);
            };

            // Adiciona a linha à tabela
            listaSabores.appendChild(linha);
        });

        // Atualiza o destaque
        destacarSabor();

    } catch (erro) {

        console.log("Erro ao listar sabores:", erro);

        mostrarAviso("Erro ao conectar ao servidor.");
    }
}


// ==========================================
// PROCURAR SABOR
// ==========================================

async function procure() {

    // Recebe o código digitado
    const id = campoId.value.trim();

    // Valida o código
    if (!id || !Number.isInteger(Number(id)) ||
        Number(id) <= 0) {

        mostrarAviso("Informe um código válido.");
        return;
    }

    try {

        // Busca o sabor pelo código
        const resposta = await fetch(
            URL_API + "/admin/sabor/" + id,
            {
                credentials: "include"
            }
        );

        // Recebe a resposta
        const dados = await resposta.json();

        // Verifica se encontrou
        if (resposta.ok && dados.sucesso) {

            preencherCampos(dados.sabor);

        } else {

            // Limpa os dados anteriores
            campoNome.value = "";
            campoDescricao.value = "";
            saborSelecionado = null;

            destacarSabor();

            mostrarAviso(
                dados.mensagem || "Sabor não encontrado."
            );
        }

    } catch (erro) {

        console.log("Erro ao procurar sabor:", erro);

        mostrarAviso("Erro ao conectar ao servidor.");
    }
}


// ==========================================
// INSERIR SABOR
// ==========================================

function inserir() {

    // Limpa o formulário
    limparCampos();

    // Define a operação
    oQueEstaFazendo = "inserir";

    // Libera os campos
    bloquearAtributos(false);

    // Mostra Salvar e Cancelar
    visibilidadeDosBotoes(true);

    // Orienta o usuário
    mostrarAviso("Preencha os dados do novo sabor.");

    // Posiciona o cursor no nome
    campoNome.focus();
}


// ==========================================
// ALTERAR SABOR
// ==========================================

function alterar() {

    // Exige que um sabor esteja selecionado
    if (saborSelecionado === null) {

        mostrarAviso("Primeiro procure ou selecione um sabor.");
        return;
    }

    // Define a operação
    oQueEstaFazendo = "alterar";

    // Libera os campos
    bloquearAtributos(false);

    // Mostra Salvar e Cancelar
    visibilidadeDosBotoes(true);

    // Orienta o usuário
    mostrarAviso("Altere os dados e clique em Salvar.");

    // Posiciona o cursor no nome
    campoNome.focus();
}


// ==========================================
// EXCLUIR SABOR
// ==========================================

function excluir() {

    // Exige que um sabor esteja selecionado
    if (saborSelecionado === null) {

        mostrarAviso("Primeiro procure ou selecione um sabor.");
        return;
    }

    // Confirma a exclusão
    const confirmou = confirm(
        "Deseja realmente excluir este sabor?"
    );

    // Cancela se o usuário desistir
    if (!confirmou) {
        return;
    }

    // Define a operação
    oQueEstaFazendo = "excluir";

    // Executa a exclusão
    salvar();
}


// ==========================================
// SALVAR OPERAÇÃO
// ==========================================

async function salvar() {

    // Verifica se existe uma operação
    if (oQueEstaFazendo === "") {
        return;
    }

    // Guarda a operação atual
    const operacao = oQueEstaFazendo;

    // Recebe os dados do formulário
    const sabor = {
        nome_sabor: campoNome.value.trim(),
        descricao: campoDescricao.value.trim()
    };

    // Valida o nome, exceto na exclusão
    if (operacao !== "excluir" && !sabor.nome_sabor) {

        mostrarAviso("Informe o nome do sabor.");
        return;
    }

    // Define o endereço padrão
    let endereco = URL_API + "/admin/sabor";

    // Define o método padrão
    let metodo = "POST";

    // Configura alteração
    if (operacao === "alterar") {

        endereco += "/" + saborSelecionado;
        metodo = "PUT";

    // Configura exclusão
    } else if (operacao === "excluir") {

        endereco += "/" + saborSelecionado;
        metodo = "DELETE";
    }

    // Impede cliques repetidos
    btnSalvar.disabled = true;
    btnExcluir.disabled = true;

    try {

        // Envia a operação ao backend
        const resposta = await fetch(endereco, {

            method: metodo,

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            // DELETE não precisa enviar dados
            body: operacao === "excluir"
                ? undefined
                : JSON.stringify(sabor)
        });

        // Recebe o resultado
        const dados = await resposta.json();

        // Verifica se funcionou
        if (resposta.ok && dados.sucesso) {

            // Limpa o formulário
            cancelar();

            // Atualiza a tabela
            await listar();

            // Mostra a mensagem de sucesso
            mostrarAviso(dados.mensagem);

        } else {

            // Mostra o erro enviado pelo backend
            mostrarAviso(
                dados.mensagem || "Não foi possível salvar."
            );
        }

    } catch (erro) {

        console.log("Erro ao salvar sabor:", erro);

        mostrarAviso("Erro ao conectar ao servidor.");

    } finally {

        // Libera os botões
        btnSalvar.disabled = false;
        btnExcluir.disabled = false;

        // Encerra a operação de exclusão
        if (operacao === "excluir") {

            oQueEstaFazendo = "";
        }
    }
}


// ==========================================
// CANCELAR OPERAÇÃO
// ==========================================

function cancelar() {

    // Limpa a operação
    oQueEstaFazendo = "";

    // Limpa os campos
    limparCampos();

    // Bloqueia os atributos
    bloquearAtributos(true);

    // Mostra os botões principais
    visibilidadeDosBotoes(false);

    // Limpa a mensagem
    mostrarAviso("");

    // Remove o destaque da tabela
    destacarSabor();
}


// ==========================================
// VERIFICAR ACESSO ADMINISTRATIVO
// ==========================================

async function verificarAcesso() {

    try {

        // Consulta a permissão no backend
        const resposta = await fetch(
            URL_API + "/admin/verificar",
            {
                credentials: "include"
            }
        );

        // Recebe a resposta
        const dados = await resposta.json();

        // Verifica se é administrador
        if (resposta.ok && dados.sucesso) {

            // Mostra o conteúdo
            conteudo.hidden = false;

            // Esconde a mensagem de carregamento
            avisoAcesso.hidden = true;

            // Prepara os campos
            cancelar();

            // Carrega os sabores
            await listar();

        } else if (resposta.status === 401) {

            // Usuário não está logado
            window.location.href = "../../login/login.html";

        } else {

            // Usuário não tem permissão
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

// Pesquisa
btnProcurar.onclick = procure;

// Inserção
btnInserir.onclick = inserir;

// Alteração
btnAlterar.onclick = alterar;

// Exclusão
btnExcluir.onclick = excluir;

// Salvar
btnSalvar.onclick = salvar;

// Cancelar
btnCancelar.onclick = cancelar;

// Atualizar listagem
btnAtualizar.onclick = listar;

// Inicia a página
window.onload = verificarAcesso;
