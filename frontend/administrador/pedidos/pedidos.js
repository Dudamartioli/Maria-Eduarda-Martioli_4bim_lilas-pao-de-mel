
/* =====================================================
   LILA'S - GERENCIAMENTO DE PEDIDOS
   ===================================================== */

const API = "http://localhost:3001";

const lista = document.getElementById("lista");

// Formatar valores em reais.

// Formatar valores monetários.
// Não mostrar R$ 0,00 quando o valor estiver ausente.
function moeda(valor) {

    if (valor === null || valor === undefined || valor === "") {
        return "Valor não registrado";
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "Valor inválido";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// Criar elementos com texto seguro.
function elemento(tag, texto) {
    const el = document.createElement(tag);
    el.textContent = texto;
    return el;
}

// Comunicação com o backend.
async function requisicao(caminho, opcoes = {}) {

    const resposta = await fetch(API + caminho, {
        ...opcoes,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401 || resposta.status === 403) {
        location.href = "../../login/login.html";
        throw new Error("Acesso não autorizado.");
    }

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Erro na operação.");
    }

    return dados;
}

// Criar área de busca.
const painelBusca = document.createElement("div");
painelBusca.className = "busca-pedido";

const campoId = document.createElement("input");
campoId.type = "number";
campoId.min = "1";
campoId.placeholder = "Digite o ID do pedido";

const botaoProcurar = elemento("button", "Procurar");
const botaoListar = elemento("button", "Listar todos");

painelBusca.append(campoId, botaoProcurar, botaoListar);
lista.before(painelBusca);

// Filtros da listagem (não alteram dados no banco).
const barraFiltros = document.createElement("div");
barraFiltros.className = "filtros-pedidos";
const grupos = [
    ["Todos", "Todos"], ["Pendentes", "Aguardando pagamento"],
    ["Confirmados", "Confirmado"], ["Em produção", "Em produção"],
    ["Prontos", "Pronto"], ["Finalizados", "Concluído"],
    ["Cancelados", "Cancelado"]
];
let filtroAtual = "Todos";
let pedidosCarregados = [];
const botoesFiltro = new Map();
for (const [rotulo, status] of grupos) {
    const botao = elemento("button", rotulo);
    botao.type = "button";
    botao.addEventListener("click", () => {
        filtroAtual = status;
        exibirPedidosFiltrados();
    });
    botoesFiltro.set(status, botao);
    barraFiltros.append(botao);
}
lista.before(barraFiltros);

function classeStatus(status) {
    const classes = {
        "Aguardando pagamento":"pendente", "Confirmado":"confirmado",
        "Em produção":"producao", "Pronto":"pronto",
        "Concluído":"concluido", "Cancelado":"cancelado"
    };
    return classes[status] || "outro";
}
function seloStatus(status) {
    const selo = elemento("span", status || "Não informado");
    selo.className = "selo-status status-" + classeStatus(status);
    return selo;
}
function exibirPedidosFiltrados() {
    lista.replaceChildren();
    for (const [status, botao] of botoesFiltro) {
        botao.classList.toggle("ativo", status === filtroAtual);
        botao.setAttribute("aria-pressed", String(status === filtroAtual));
    }
    const filtrados = pedidosCarregados.filter(p => filtroAtual === "Todos" || p.status === filtroAtual);
    if (!filtrados.length) {
        lista.append(elemento("p", "Nenhum pedido encontrado neste filtro."));
        return;
    }
    for (const pedido of filtrados) mostrarResumo(pedido);
}


// Carregar todos os pedidos.
async function carregar() {

    lista.textContent = "Carregando pedidos...";

    try {

        const dados = await requisicao(
            "/pagamentos-admin/pedidos"
        );

        pedidosCarregados = dados.pedidos;
        exibirPedidosFiltrados();

    } catch (erro) {
        lista.textContent = erro.message;
    }
}

// Mostrar resumo de cada pedido.
function mostrarResumo(pedido) {
    const card = document.createElement("article");
    card.className = "pedido-card pedido-" + classeStatus(pedido.status);
    const cabecalho = document.createElement("div");
    cabecalho.className = "pedido-cabecalho";
    cabecalho.append(elemento("h3", `Pedido #${pedido.id_pedido}`), seloStatus(pedido.status));
    card.append(cabecalho);
    const informacoes = document.createElement("div");
    informacoes.className = "pedido-informacoes";
    informacoes.append(
        elemento("p", `Cliente: ${pedido.cliente_nome}`),
        elemento("p", `Pagamento: ${pedido.pagamento_status || "Não informado"}`),
        elemento("p", `Total: ${moeda(pedido.total)}`)
    );
    card.append(informacoes);
    if (pedido.status === "Cancelado") {
        card.append(elemento("p", "⛔ PEDIDO CANCELADO — NÃO PRODUZIR"));
    }
    const botao = elemento("button", "Ver detalhes e produtos");
    botao.onclick = () => procurar(pedido.id_pedido);
    card.append(botao);
    lista.append(card);
}

// Procurar pedido pelo ID.
async function procurar(id) {

    if (!id || Number(id) <= 0) {
        alert("Informe um ID válido.");
        return;
    }

    try {

        const dados = await requisicao(
            `/pagamentos-admin/pedidos/${id}`
        );

        mostrarDetalhes(dados.pedido);

    } catch (erro) {
        alert(erro.message);
    }
}

// Mostrar todos os detalhes do pedido.
function mostrarDetalhes(pedido) {

    lista.replaceChildren();

    const card = document.createElement("article");
    card.className = "pedido-card pedido-detalhe pedido-" + classeStatus(pedido.status);
    const destaque = document.createElement("div");
    destaque.className = "pedido-cabecalho";
    destaque.append(elemento("h2", `Pedido #${pedido.id_pedido}`), seloStatus(pedido.status));
    card.append(destaque);
    if (pedido.status === "Cancelado") card.append(elemento("p", "⛔ PEDIDO CANCELADO — NÃO PRODUZIR"));

    card.append(
        elemento("h2", `Pedido #${pedido.id_pedido}`),
        elemento("p", `Cliente: ${pedido.cliente_nome}`),
        elemento("p", `E-mail: ${pedido.cliente_email || "-"}`),
        elemento("p", `Telefone: ${pedido.cliente_telefone || "-"}`),
        elemento("p", `Modalidade: ${pedido.modalidade}`),
        elemento("p", `Cidade: ${pedido.cidade || "-"}`),
        elemento("p", `Bairro: ${pedido.bairro || "-"}`),
        elemento("p", `Rua: ${pedido.rua || "-"}`),
        elemento("p", `Número: ${pedido.numero || "-"}`),
        elemento("p", `Entrega: ${String(pedido.data_desejada).slice(0, 10)}`),
        elemento("p", `Horário: ${pedido.horario_desejado}`),
        elemento("p", `Observações: ${pedido.observacao || "-"}`),
        elemento("h3", "Produtos do pedido")
    );

    
// Produtos organizados em cartões, com quantidade e sabor em destaque.
const areaProdutos = document.createElement("section");
areaProdutos.className = "produtos-producao";
for (const item of pedido.itens || []) {
    const produto = document.createElement("div");
    produto.className = "produto-producao";
    const detalhes = document.createElement("div");
    detalhes.append(
        elemento("strong", item.produto_nome || "Produto"),
        elemento("p", `Sabor: ${item.sabor_nome || "Não informado"}`),
        elemento("small", `${moeda(item.preco_unitario)} por unidade · Subtotal: ${moeda(item.subtotal)}`)
    );
    const quantidade = elemento("span", `${item.quantidade} un.`);
    quantidade.className = "quantidade-producao";
    produto.append(detalhes, quantidade);
    areaProdutos.append(produto);
}
card.append(areaProdutos);

    card.append(
        elemento("h3", "Resumo financeiro"),
        elemento("p", `Subtotal: ${moeda(pedido.subtotal)}`),
        elemento("p", `Desconto: ${moeda(pedido.desconto)}`),
        elemento("p", `Frete: ${moeda(pedido.frete)}`),
        elemento("h3", `Total: ${moeda(pedido.total)}`),
        elemento("p", `Pagamento: ${pedido.pagamento_status}`),
        elemento("p", `Andamento: ${pedido.status}`)
    );

    // Comprovante enviado pelo cliente, sem confirmar Pix automaticamente.
    const areaComprovante = document.createElement("section");
    areaComprovante.className = "area-comprovante-admin";
    areaComprovante.append(elemento("h3", "Comprovante de pagamento Pix"));

    if (pedido.comprovante_caminho) {
        const ver = elemento("button", "📄 Ver comprovante Pix");
        ver.type = "button";
        ver.addEventListener("click", async () => {
            // Abrir aba durante o clique para não sofrer bloqueio de pop-up.
            const aba = window.open("", "_blank");
            try {
                const resposta = await fetch(
                    `${API}/pagamentos-admin/pedidos/${pedido.id_pedido}/comprovante`,
                    { credentials: "include" }
                );
                if (!resposta.ok) throw new Error("Não foi possível abrir o comprovante.");
                const blob = await resposta.blob();
                const url = URL.createObjectURL(blob);
                if (aba) {
                    aba.location.href = url;
                    aba.addEventListener("load", () => {
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                    }, { once: true });
                } else {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `comprovante-pedido-${pedido.id_pedido}`;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                }
            } catch (erro) {
                if (aba) aba.close();
                alert(erro.message);
            }
        });
        areaComprovante.append(
            ver,
            elemento("p", "Confira o recebimento no aplicativo bancário antes de confirmar o Pix.")
        );
    } else {
        areaComprovante.append(
            elemento("p", "O cliente ainda não enviou um comprovante.")
        );
    }
    card.append(areaComprovante);

    // Confirmar Pix somente após conferir no banco.
    if (pedido.status === "Aguardando pagamento") {

        const confirmar = elemento(
            "button",
            "Recebi o Pix — Confirmar pedido"
        );

        confirmar.onclick = async () => {

            const resposta = confirm(
                `Você conferiu no aplicativo bancário o recebimento de ${moeda(pedido.total)} referente ao pedido #${pedido.id_pedido}?`
            );

            if (!resposta) return;

            try {

                const dados = await requisicao(
                    `/pagamentos-admin/pedidos/${pedido.id_pedido}/confirmar-pix`,
                    { method: "PATCH" }
                );

                alert(dados.mensagem);
                procurar(pedido.id_pedido);

            } catch (erro) {
                alert(erro.message);
            }
        };

        card.append(confirmar);
    }

    // Atualizar o andamento do pedido.
    const proximos = {
        "Confirmado": "Em produção",
        "Em produção": "Pronto",
        "Pronto": "Concluído"
    };

    const proximoStatus = proximos[pedido.status];

    if (proximoStatus && pedido.pagamento_status === "Confirmado") {

        const atualizar = elemento(
            "button",
            `Atualizar para: ${proximoStatus}`
        );

        atualizar.onclick = async () => {

            if (!confirm(`Alterar o pedido para ${proximoStatus}?`)) {
                return;
            }

            try {

                const dados = await requisicao(
                    `/pagamentos-admin/pedidos/${pedido.id_pedido}/status`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            status: proximoStatus
                        })
                    }
                );

                alert(dados.mensagem);
                procurar(pedido.id_pedido);

            } catch (erro) {
                alert(erro.message);
            }
        };

        card.append(atualizar);
    }

    // WhatsApp apenas abre a conversa.
    // Nunca confirma o pagamento.
    const telefone = String(
        pedido.cliente_telefone || ""
    ).replace(/\D/g, "");

    if (telefone.length >= 10 && telefone.length <= 13) {

        const whatsapp = elemento(
            "button",
            "Enviar atualização pelo WhatsApp"
        );

        whatsapp.onclick = () => {

            const numero = telefone.startsWith("55")
                ? telefone
                : "55" + telefone;

            const mensagem =
                `Olá! 🍯 Seu pedido #${pedido.id_pedido} ` +
                `na Lila's está com status: ${pedido.status}.`;

            window.open(
                `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`,
                "_blank",
                "noopener"
            );
        };

        card.append(whatsapp);
    }


// ==========================================
// CANCELAR PEDIDO
// ==========================================

if (
    pedido.status !== "Cancelado" &&
    pedido.status !== "Concluído"
) {

    const cancelar = elemento(
        "button",
        "Cancelar pedido"
    );

    cancelar.className = "botao-cancelar";

    cancelar.onclick = async () => {

        const motivo = prompt(
            "Informe o motivo do cancelamento:"
        );

        if (motivo === null) return;

        if (motivo.trim().length < 5) {
            alert("Informe um motivo com pelo menos 5 caracteres.");
            return;
        }

        const pago = pedido.pagamento_status === "Confirmado";

        const mensagem = pago
            ? "Este pedido já foi pago. Ao cancelar, será registrado um REEMBOLSO PENDENTE. Deseja continuar?"
            : "Deseja realmente cancelar este pedido?";

        if (!confirm(mensagem)) return;

        try {

            const dados = await requisicao(
                `/pagamentos-admin/pedidos/${pedido.id_pedido}/cancelar`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        motivo: motivo.trim()
                    })
                }
            );

            alert(dados.mensagem);

            // Atualizar os detalhes.
            await procurar(pedido.id_pedido);

        } catch (erro) {
            alert(erro.message);
        }
    };

    card.append(cancelar);
}


// ==========================================
// REGISTRAR REEMBOLSO REALIZADO
// ==========================================

if (
    pedido.status === "Cancelado" &&
    pedido.reembolso_status === "Pendente"
) {

    card.append(
        elemento(
            "p",
            `Reembolso pendente: ${moeda(pedido.valor_reembolso)}`
        )
    );

    const reembolsar = elemento(
        "button",
        "Marcar reembolso como realizado"
    );

    reembolsar.onclick = async () => {

        const confirmou = confirm(
            "Você já devolveu o dinheiro ao cliente? " +
            "Este botão NÃO realiza uma transferência Pix."
        );

        if (!confirmou) return;

        try {

            const dados = await requisicao(
                `/pagamentos-admin/pedidos/${pedido.id_pedido}/reembolso`,
                {
                    method: "PATCH"
                }
            );

            alert(dados.mensagem);
            await procurar(pedido.id_pedido);

        } catch (erro) {
            alert(erro.message);
        }
    };

    card.append(reembolsar);
}

if (pedido.reembolso_status === "Realizado") {
    card.append(
        elemento("p", "Reembolso realizado.")
    );
}

    const voltar = elemento("button", "Voltar à listagem");
    voltar.onclick = carregar;

    card.append(voltar);
    lista.append(card);
}

// Eventos dos botões.
botaoProcurar.onclick = () => procurar(campoId.value);
botaoListar.onclick = carregar;

// Carregar ao abrir a página.
carregar();


// =====================================================
// BOTÃO ATUALIZAR LISTA DE PEDIDOS
// =====================================================

// Localiza o botão de atualização.
const btnAtualizarPedidos = document.getElementById(
    "btnAtualizarPedidos"
);

// Verifica se o botão existe.
if (btnAtualizarPedidos) {

    // Executa quando a administradora clica.
    btnAtualizarPedidos.addEventListener("click", async () => {

        // Impede vários cliques durante a atualização.
        btnAtualizarPedidos.disabled = true;

        // Mostra que a lista está sendo atualizada.
        btnAtualizarPedidos.textContent = "↻ Atualizando...";

        try {

            // Busca novamente os pedidos no backend.
            await carregar();

        } finally {

            // Restaura o botão.
            btnAtualizarPedidos.disabled = false;

            btnAtualizarPedidos.textContent = "↻ Atualizar lista";
        }

    });
}
