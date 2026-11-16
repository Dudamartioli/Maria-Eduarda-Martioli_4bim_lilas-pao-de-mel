
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
    ["Todos", "Todos"], ["Aguardando pagamento", "Aguardando pagamento"],
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
    const botaoEditarManual=elemento("button","✏️ Alterar dados e produtos");
    botaoEditarManual.disabled = !podeEditarPedidoManual(pedido);
    botaoEditarManual.title = botaoEditarManual.disabled ? "Pedido com pagamento, Pix ou estoque reservado não pode ser editado." : "Abrir formulário de alteração";
    botaoEditarManual.type="button";
    botaoEditarManual.onclick=()=>editarPedidoManual(pedido.id_pedido);
    card.append(botaoEditarManual);
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
    if (pedido.status === "Aguardando pagamento" && pedido.pagamento_status === "Pendente") {

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


// Formulário de cadastro e alteração manual.
const secaoCadastro=document.createElement('section');
secaoCadastro.className='cadastro-manual';
secaoCadastro.innerHTML=`<div class="cadastro-topo"><h2>🍯 Cadastrar ou alterar pedido</h2></div>
<form id="formManual"><div class="campos-manual">
<label>ID (para alteração)>
    <input
        name="id"
        type="number"
        min="1"
        placeholder="Digite o ID do pedido"
    >
</label><button type="button" id="buscarIdManual" class="buscar-id-manual">Buscar pedido pelo ID</button><label>Cliente<select name="id_usuario" required></select></label>
<label>Modalidade<select name="modalidade"><option value="retirada">Retirada</option><option value="entrega">Entrega</option></select></label>
<label>Data desejada<input name="data_desejada" type="date" required></label>
<label>Horário<input name="horario_desejado" type="time" required></label>
<label>Cidade<input name="cidade" maxlength="60"></label>
<label>Bairro<input name="bairro" maxlength="100"></label>
<label>Rua<input name="rua" maxlength="150"></label>
<label>Número<input name="numero" maxlength="30"></label>
<label>CEP<input name="cep" maxlength="9"></label>
<label>Complemento<input name="complemento" maxlength="300"></label>
<label>Referência<input name="referencia" maxlength="300"></label>
<label>Frete (R$)<input name="frete" type="number" min="0" step="0.01" value="0"></label>
<label class="campo-largo">Observação<textarea name="observacao" maxlength="300" rows="2"></textarea></label>
</div><h3>Produtos e sabores</h3><div id="itensManual"></div>
<button type="button" id="adicionarItemManual">+ Adicionar produto</button>
<div class="total-manual" id="totalManual">Total: R$ 0,00</div>
<div class="acoes-manual"><button type="button" id="inserirManual">Inserir</button><button type="button" id="alterarManual">Alterar</button><button type="submit" id="salvarManual" class="salvar-manual">Salvar</button><button type="button" id="cancelarManual">Cancelar</button></div>
<p id="avisoManual" role="status"></p></form>`;
const painelExistente=document.querySelector('.painel-pedidos');
painelExistente.before(secaoCadastro);
const formManual=document.getElementById('formManual');

const campoDataManual = formManual.elements.namedItem("data_desejada");

function dataLocalMaisDias(dias) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + dias);

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function atualizarCalendarioManual() {
    const linhas = [
        ...document.querySelectorAll(
            "#itensManual .linha-item-manual"
        )
    ];

    let quantidadeTotal = 0;
    let possuiMini = false;
    let estoqueInsuficiente = false;

    for (const linha of linhas) {
        const id = Number(linha.querySelector("select").value);
        const quantidade = Number(linha.querySelector("input").value);

        if (!id || !Number.isInteger(quantidade) || quantidade < 1) {
            continue;
        }

        const produto = opcoesManuais.produtos.find(
            p => Number(p.id_produto) === id
        );

        if (!produto) continue;

        quantidadeTotal += quantidade;

        if (!String(produto.nome_categoria)
            .toLowerCase().includes("normal")) {
            possuiMini = true;
        }

        // Verifica o estoque de cada produto e sabor.
        const quantidadeMesmoProduto = linhas.reduce((total, outra) => {
            if (Number(outra.querySelector("select").value) !== id) {
                return total;
            }
            return total + (Number(outra.querySelector("input").value) || 0);
        }, 0);

        if (
            produto.estoque_pronto == null ||
            quantidadeMesmoProduto > Number(produto.estoque_pronto)
        ) {
            estoqueInsuficiente = true;
        }
    }

    const diasMinimos =
        quantidadeTotal > 20 || possuiMini || estoqueInsuficiente
            ? 7
            : 1;

    campoDataManual.min = dataLocalMaisDias(diasMinimos);

    // Não apaga a data durante a edição: sinaliza a data inválida.
    const dataInvalida =
        campoDataManual.value &&
        campoDataManual.value < campoDataManual.min;

    campoDataManual.setCustomValidity(
        dataInvalida
            ? `A data mínima para esses produtos é ${campoDataManual.min}.`
            : ""
    );

    campoDataManual.title =
        `Primeira data possível: ${campoDataManual.min}`;

    return !dataInvalida;
}

campoDataManual.addEventListener("change", atualizarCalendarioManual);

const itensManual=document.getElementById('itensManual');
let opcoesManuais={usuarios:[],produtos:[]};
const avisoManual=document.getElementById('avisoManual');
const campoManual=(nome)=>formManual.elements.namedItem(nome);
function podeEditarPedidoManual(pedido) {
 return pedido.status === 'Aguardando pagamento' &&
        pedido.pagamento_status === 'Pendente' &&
        !pedido.pix_copia_cola && !pedido.comprovante_caminho &&
        !(pedido.itens || []).some(i => Number(i.quantidade_reservada) > 0);
}
function bloquearCamposManuais() {
 const editando = modoManual === 'inserir' || modoManual === 'alterar';
 formManual.querySelectorAll('input, select, textarea').forEach(campo => {
   if (campo.name === 'id') {
     campo.disabled = false;
     campo.readOnly = editando;
   } else campo.disabled = !editando;
 });
 itensManual.querySelectorAll('button').forEach(botao => botao.disabled = !editando);
 document.getElementById('adicionarItemManual').disabled = !editando;
 botaoSalvarManual.disabled = !editando;
}

let modoManual = null;
const botaoSalvarManual = document.getElementById('salvarManual');
function definirModoManual(modo) {
 modoManual = modo;
 botaoSalvarManual.disabled = !modo;
 botaoSalvarManual.textContent = modo === 'inserir' ? 'Salvar novo pedido' : modo === 'alterar' ? 'Salvar alterações' : 'Salvar';
 document.getElementById('inserirManual').classList.toggle('ativo', modo === 'inserir');
 document.getElementById('alterarManual').classList.toggle('ativo', modo === 'alterar');
 bloquearCamposManuais();
}
definirModoManual(null);
function calcularManual(){
 let subtotal=0;
 itensManual.querySelectorAll('.linha-item-manual').forEach(l=>{
   const produto=opcoesManuais.produtos.find(p=>String(p.id_produto)===l.querySelector('select').value);
   subtotal+=(Number(produto?.preco)||0)*(Number(l.querySelector('input').value)||0);
 });
 const frete=campoManual('modalidade').value==='retirada'?0:Number(campoManual('frete').value)||0;
 document.getElementById('totalManual').textContent=`Subtotal: ${moeda(subtotal)} · Frete: ${moeda(frete)} · Total: ${moeda(subtotal+frete)}`;
 atualizarCalendarioManual();
}
function adicionarLinhaManual(id='',quantidade=1){
 const linha=document.createElement('div');linha.className='linha-item-manual';
 const select=document.createElement('select');select.required=true;
 select.append(new Option('Selecione um produto e sabor',''));
opcoesManuais.produtos.forEach(p => {
    const disponivel = p.disponivel === true || p.disponivel === 'true' || p.disponivel === 't' || p.disponivel === 1 || p.disponivel === '1';

    const nome = `${p.nome_produto} — ${p.nome_sabor || 'Sem sabor'}`;

    const texto = disponivel
        ? `${nome} (${moeda(p.preco)})`
        : `${nome} — INDISPONÍVEL`;

    const opcao = new Option(texto, p.id_produto);

    // Impede selecionar produtos indisponíveis.
    opcao.disabled = !disponivel;

    select.append(opcao);
}); select.value=String(id);
 // Ao editar, mantém o item antigo visível mesmo se ficou indisponível.
 if (id && ![...select.options].some(o => o.value === String(id))) {
     select.append(new Option(`Produto #${id} (não está mais no catálogo)`, String(id)));
     select.value = String(id);
 }
 const qtd=document.createElement('input');qtd.type='number';qtd.min='1';qtd.max='10000';qtd.required=true;qtd.value=quantidade;
 const remover=document.createElement('button');remover.type='button';remover.textContent='Remover';remover.onclick=()=>{linha.remove();calcularManual()};
 select.onchange=calcularManual;qtd.oninput=calcularManual;
 linha.append(select,qtd,remover);itensManual.append(linha);calcularManual();bloquearCamposManuais();
}
async function carregarOpcoesManuais(){
 const d=await requisicao('/pagamentos-admin/pedidos-cadastro/opcoes');opcoesManuais=d;
 const sel=campoManual('id_usuario');sel.replaceChildren(new Option('Selecione o cliente',''));
 d.usuarios.forEach(u=>sel.append(new Option(`${u.nome} (${u.email})`,u.id_usuario)));
}
function limparManual(){formManual.reset();campoManual('id').value='';itensManual.replaceChildren();adicionarLinhaManual();avisoManual.textContent='';campoManual('frete').value='0';calcularManual();}
document.getElementById('inserirManual').onclick=()=>{limparManual();definirModoManual('inserir');avisoManual.textContent='Novo pedido: preencha os dados e clique em Salvar.';};
document.getElementById('alterarManual').onclick=async()=>{
 const id=Number(campoManual('id').value);
 if(!Number.isSafeInteger(id)||id<1){avisoManual.textContent='Digite o ID e clique em Buscar antes de alterar.';campoManual('id').focus();return;}
 await editarPedidoManual(id);
};
document.getElementById('cancelarManual').onclick=()=>{limparManual();definirModoManual(null);};
document.getElementById('buscarIdManual').onclick=async()=>{
 const id=Number(campoManual('id').value);
 if(!Number.isSafeInteger(id)||id<1){avisoManual.textContent='Digite um ID válido para buscar.';campoManual('id').focus();return;}
 await editarPedidoManual(id, false);
};
document.getElementById('adicionarItemManual').onclick=()=>adicionarLinhaManual();
campoManual('modalidade').onchange=()=>{if(campoManual('modalidade').value==='retirada')campoManual('frete').value=0;calcularManual()};
campoManual('frete').oninput=calcularManual;
async function editarPedidoManual(id, permitirEdicao = true){
 try{
  await carregarOpcoesManuais();
  const {pedido}=await requisicao(`/pagamentos-admin/pedidos/${id}`);
  if (permitirEdicao && !podeEditarPedidoManual(pedido)) throw Error('Este pedido possui pagamento, Pix ou estoque reservado, ou já está em produção. Não pode ser editado por este formulário.');
  limparManual();
  for(const nome of ['id_usuario','modalidade','cidade','cep','rua','numero','complemento','bairro','referencia','data_desejada','horario_desejado','observacao','frete']){
   const valor=pedido[nome];campoManual(nome).value=valor==null?'':nome==='data_desejada'?String(valor).slice(0,10):nome==='horario_desejado'?String(valor).slice(0,5):valor;
  }
  campoManual('id').value=pedido.id_pedido;
  itensManual.replaceChildren();(pedido.itens||[]).forEach(i=>adicionarLinhaManual(i.id_produto,i.quantidade));
  calcularManual();definirModoManual(permitirEdicao ? 'alterar' : null);
  avisoManual.textContent = permitirEdicao ? 'Edição liberada. Faça as alterações e clique em Salvar.' : 'Pedido encontrado. Clique em Alterar para liberar os campos, se permitido.';
  secaoCadastro.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){alert(e.message)}
}
formManual.onsubmit=async e=>{
 e.preventDefault();avisoManual.textContent='Salvando...';
 try{
  const id=campoManual('id').value;
  if (!modoManual) throw new Error('Clique em Inserir ou Alterar antes de salvar.');
  if (modoManual === 'alterar' && !id) throw new Error('Busque um pedido antes de alterar.');
  if (!atualizarCalendarioManual()) {
    campoDataManual.reportValidity();
    throw new Error("A data escolhida não respeita o prazo do pedido.");
}
  const d=Object.fromEntries(new FormData(formManual).entries());
  d.itens=[...itensManual.querySelectorAll('.linha-item-manual')].map(l=>({id_produto:Number(l.querySelector('select').value),quantidade:Number(l.querySelector('input').value)}));
  if(!d.itens.length)throw Error('Adicione pelo menos um produto.');
  if(d.modalidade==='retirada')d.frete=0;
  const alterando = modoManual === 'alterar';
  const resp=await requisicao(alterando?`/pagamentos-admin/pedidos-cadastro/${id}`:'/pagamentos-admin/pedidos-cadastro',{method:alterando?'PUT':'POST',body:JSON.stringify(d)});
  avisoManual.textContent=resp.mensagem;const pedidoId=resp.id_pedido;
  limparManual();definirModoManual(null);avisoManual.textContent=resp.mensagem;
  await carregar();await procurar(pedidoId);
 }catch(erro){avisoManual.textContent=erro.message}
};
carregarOpcoesManuais().then(()=>{limparManual();definirModoManual(null);}).catch(e=>{avisoManual.textContent=e.message});


/* ==========================================
   EXIBIR ENDEREÇO SOMENTE PARA ENTREGA
   ========================================== */

(function () {
    const camposEndereco = [
        "Cidade",
        "Bairro",
        "Rua",
        "Número",
        "CEP",
        "Complemento",
        "Referência",
        "Frete (R$)"
    ];

    function atualizarCamposEntrega() {
        const cadastro = document.querySelector(".cadastro-manual");

        if (!cadastro) return;

        const selectModalidade = [...cadastro.querySelectorAll("select")]
            .find(select =>
                [...select.options].some(option =>
                    /^(entrega|retirada)$/i.test(option.value.trim())
                )
            );

        if (!selectModalidade) return;

        const entrega =
            selectModalidade.value.trim().toLowerCase() === "entrega";

        cadastro.querySelectorAll(".campos-manual label")
            .forEach(label => {
                const texto = label.textContent
                    .replace(/\s+/g, " ")
                    .trim();

                const ehEndereco = camposEndereco.some(campo =>
                    texto.toLowerCase().startsWith(campo.toLowerCase())
                );

                if (!ehEndereco) return;

                label.classList.toggle(
                    "campo-endereco-oculto",
                    !entrega
                );

                label.querySelectorAll("input, select, textarea")
                    .forEach(campo => {
                        if (!entrega) {
                            campo.required = false;
                        }
                    });
            });
    }

    document.addEventListener("change", evento => {
        if (evento.target.matches(".cadastro-manual select")) {
            atualizarCamposEntrega();
        }
    });

    const observador = new MutationObserver(atualizarCamposEntrega);

    observador.observe(document.body, {
        childList: true,
        subtree: true
    });

    atualizarCamposEntrega();
})();
