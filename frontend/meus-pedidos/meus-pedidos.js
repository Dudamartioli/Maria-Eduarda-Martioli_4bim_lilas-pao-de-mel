
/* =====================================================
   LILA'S - MEUS PEDIDOS
   Listagem e filtros de encomendas
   ===================================================== */

// Endereço do backend.
const API = "http://localhost:3001";

// Elementos da página.
const lista = document.getElementById("listaPedidos");
const mensagem = document.getElementById("mensagem");

// Botões de filtro adicionados no HTML.
const botoesFiltro = document.querySelectorAll(
    ".filtros-pedidos .filtro"
);

// Guarda os pedidos recebidos do backend.
let todosPedidos = [];

// Filtro selecionado inicialmente.
let filtroAtual = "todos";


/* =====================================================
   FORMATAÇÃO DE VALORES
   ===================================================== */

function moeda(valor) {

    if (valor === null || valor === undefined) {
        return "Valor não registrado";
    }

    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


/* =====================================================
   FORMATAÇÃO DE DATAS
   ===================================================== */

function dataBR(valor) {

    if (!valor) {
        return "Não informada";
    }

    const texto = String(valor).slice(0, 10);

    const partes = texto.split("-");

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : texto;
}


/* =====================================================
   CRIAÇÃO DE ELEMENTOS
   ===================================================== */

function texto(tag, conteudo, classe) {

    const el = document.createElement(tag);

    el.textContent = conteudo;

    if (classe) {
        el.className = classe;
    }

    return el;
}


// Cria um campo com nome e valor.
function campo(nome, valor) {

    const div = document.createElement("div");

    div.append(
        texto("small", nome),
        texto("strong", valor)
    );

    return div;
}


// Cria links para ações do pedido.
function criarLink(rotulo, endereco, classe = "") {

    const link = texto(
        "a",
        rotulo,
        "botao " + classe
    );

    link.href = endereco;

    return link;
}


/* =====================================================
   NORMALIZAÇÃO DO STATUS
   ===================================================== */

// Facilita a comparação dos status.
function normalizarStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


// Define a classe visual de cada status.
function classeStatus(status) {

    const situacao = normalizarStatus(status);

    if (situacao === "aguardando pagamento") {
        return "aguardando-pagamento";
    }

    if (situacao === "confirmado") {
        return "confirmado";
    }

    if (situacao === "em producao") {
        return "em-producao";
    }

    if (situacao === "pronto") {
        return "pronto";
    }

    if (situacao === "concluido") {
        return "concluido";
    }

    if (situacao === "cancelado") {
        return "cancelado";
    }

    return "";
}


/* =====================================================
   CRIAÇÃO DOS CARTÕES DE PEDIDOS
   ===================================================== */

function desenharPedido(p) {

    // Cartão principal.
    const card = document.createElement("article");

    card.className = "pedido";

    // Status normalizado.
    const situacao = normalizarStatus(p.status);

    // Parte superior do cartão.
    const topo = document.createElement("div");

    topo.className = "topo";

    // Cria o status com a classe correta.
    const status = texto(
        "span",
        p.status_exibicao || p.status || "Não informado",
        "status"
    );

    const classe = classeStatus(p.status);

    if (classe) {
        status.classList.add(classe);
    }

    // Número e situação do pedido.
    topo.append(
        texto("h2", `Pedido #${p.id_pedido}`),
        status
    );


    /* =================================================
       DADOS DO PEDIDO
       ================================================= */

    const detalhes = document.createElement("div");

    detalhes.className = "detalhes";

    detalhes.append(

        campo(
            "Data da encomenda",
            dataBR(p.criado_em)
        ),

        campo(
            "Entrega ou retirada",
            p.modalidade === "entrega"
                ? "Entrega"
                : "Retirada"
        ),

        campo(
            "Data solicitada",
            dataBR(p.data_desejada)
        ),

        campo(
            "Horário",
            String(
                p.horario_desejado || "Não informado"
            ).slice(0, 5)
        ),

        campo(
            "Quantidade",
            `${p.unidades} unidade(s)`
        ),

        campo(
            "Total",
            moeda(p.total)
        )

    );


    /* =================================================
       AÇÕES DO PEDIDO
       ================================================= */

    const acoes = document.createElement("div");

    acoes.className = "acoes";

    // Link para o resumo completo.
    acoes.append(
        criarLink(
            "Ver detalhes do pedido",
            `../checkout/resumo.html?id=${p.id_pedido}`
        )
    );

    // Link para o comprovante, se existir.
    if (p.comprovante_enviado) {

        acoes.append(
            criarLink(
                "Ver meu comprovante",
                `${API}/checkout/pedidos/${p.id_pedido}/comprovante`,
                "secundario"
            )
        );
    }

    // Permite retornar ao checkout quando aplicável.
    if (
        situacao === "aguardando pagamento" &&
        !p.pagamento_finalizado_em
    ) {

        acoes.append(
            criarLink(
                "Voltar ao checkout",
                "../checkout/checkout.html",
                "secundario"
            )
        );
    }


    /* =================================================
       MONTAGEM DO CARTÃO
       ================================================= */

    card.append(topo, detalhes);

    // Informações de cancelamento.
    if (situacao === "cancelado") {

        if (p.motivo_cancelamento) {

            card.append(
                texto(
                    "p",
                    `Motivo: ${p.motivo_cancelamento}`
                )
            );
        }

        // Mantém o histórico de reembolso.
        if (
            p.reembolso_status &&
            p.reembolso_status !== "Não necessário"
        ) {

            card.append(
                texto(
                    "p",
                    `Reembolso: ${p.reembolso_status} (${moeda(p.valor_reembolso)})`
                )
            );
        }
    }

    card.append(acoes);

    return card;
}



/* =====================================================
   VERIFICAÇÃO DOS FILTROS
   ===================================================== */

function pedidoPassaNoFiltro(pedido) {

    // Normaliza o status do pedido.
    const status = normalizarStatus(pedido.status);

    // Exibe todos os pedidos.
    if (filtroAtual === "todos") {
        return true;
    }

    // Pedidos em andamento.
    if (filtroAtual === "andamento") {

        return [
            "aguardando pagamento",
            "em producao",
            "pronto"
        ].includes(status);
    }

    // Pedidos confirmados.
    if (filtroAtual === "confirmados") {
        return status === "confirmado";
    }

    // Pedidos finalizados.
    if (filtroAtual === "finalizados") {
        return status === "concluido";
    }

    // Pedidos cancelados.
    if (filtroAtual === "cancelados") {
        return status === "cancelado";
    }

    return true;
}



/* =====================================================
   EXIBIÇÃO DOS PEDIDOS FILTRADOS
   ===================================================== */

function mostrarPedidos() {

    // Filtra os pedidos já carregados.
    const pedidosFiltrados = todosPedidos.filter(
        pedidoPassaNoFiltro
    );

    // Limpa a listagem anterior.
    lista.replaceChildren();

    // Caso não existam pedidos cadastrados.
    if (todosPedidos.length === 0) {

        mensagem.textContent =
            "Você ainda não realizou nenhuma encomenda.";

        return;
    }

    // Caso o filtro não encontre pedidos.
    if (pedidosFiltrados.length === 0) {

        mensagem.textContent =
            "Nenhum pedido encontrado nesta categoria.";

        return;
    }

    // Informa quantos pedidos foram encontrados.
    mensagem.textContent =
        `${pedidosFiltrados.length} pedido(s) encontrado(s).`;

    // Desenha somente os pedidos do filtro.
    for (const pedido of pedidosFiltrados) {

        lista.append(
            desenharPedido(pedido)
        );
    }
}


/* =====================================================
   CLIQUES NOS BOTÕES DE FILTRO
   ===================================================== */

for (const botao of botoesFiltro) {

    botao.addEventListener("click", () => {

        // Guarda o filtro selecionado.
        filtroAtual = botao.dataset.filtro;

        // Remove o destaque dos demais botões.
        for (const outroBotao of botoesFiltro) {

            outroBotao.classList.remove("ativo");
        }

        // Destaca o botão clicado.
        botao.classList.add("ativo");

        // Atualiza os pedidos exibidos.
        mostrarPedidos();

    });
}


/* =====================================================
   CONSULTA DOS PEDIDOS NO BACKEND
   ===================================================== */

async function carregar() {

    try {

        // Informa que a consulta começou.
        mensagem.textContent =
            "Carregando seus pedidos...";

        // Consulta os pedidos do usuário logado.
        const resposta = await fetch(
            `${API}/checkout/meus-pedidos`,
            {
                credentials: "include"
            }
        );

        // Redireciona caso a sessão tenha expirado.
        if (resposta.status === 401) {

            window.location.href =
                "../login/login.html";

            return;
        }

        // Converte a resposta em JSON.
        const dados = await resposta.json();

        // Verifica se a consulta funcionou.
        if (!resposta.ok || !dados.sucesso) {

            throw new Error(
                dados.mensagem ||
                "Erro ao consultar pedidos."
            );
        }

        // Guarda todos os pedidos recebidos.
        todosPedidos = dados.pedidos;

        // Aplica o filtro atualmente selecionado.
        mostrarPedidos();

    } catch (erro) {

        console.error(erro);

        mensagem.textContent =
            erro.message ||
            "Não foi possível carregar os pedidos.";
    }
}


/* =====================================================
   INICIALIZAÇÃO
   ===================================================== */

// Carrega os pedidos ao abrir a página.
carregar();
