const API = "http://localhost:3001";
const form = document.getElementById("formCheckout");
const mensagem = document.getElementById("mensagem");
const endereco = document.getElementById("endereco");
const botao = document.getElementById("enviar");
let itens = [];
let idPedidoPix = null;
let comprovanteJaEnviado = false;
const valor = n => Number(n).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const campo = id => document.getElementById(id).value.trim();

// O calendário apresenta a primeira data permitida; o backend valida novamente.
function hojeParana() {
    const partes = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const p = Object.fromEntries(partes.map(x => [x.type,x.value]));
    return new Date(Date.UTC(+p.year,+p.month-1,+p.day));
}
function definirMinimo(dias) {
    const minimo = hojeParana();
    minimo.setUTCDate(minimo.getUTCDate() + dias);
    document.getElementById("data").min = minimo.toISOString().slice(0,10);
    const data = document.getElementById("data");
    if (data.value && data.value < data.min) data.value = "";
    document.getElementById("regraPrazo").textContent = dias === 1
        ? "Seu carrinho contém somente pães de mel grandes, com estoque suficiente em todos os sabores: escolha uma data a partir de amanhã, conforme a agenda."
        : "Seu carrinho exige produção por encomenda: escolha uma data com pelo menos 7 dias de antecedência.";
}
definirMinimo(7);

function atualizarModalidade() {
    const entrega = form.elements.modalidade.value === "entrega";
    endereco.hidden = !entrega;
    for (const id of ["cidade","cep","rua","numero","bairro"]) document.getElementById(id).required = entrega;
}
form.querySelectorAll('input[name="modalidade"]').forEach(r => r.addEventListener("change", atualizarModalidade));
atualizarModalidade();

async function iniciar() {
    try {
        const sessao = await fetch(API + "/usuario/verificar", {credentials:"include"});
        if (sessao.status === 401) {
            sessionStorage.setItem("lilas_voltar_checkout", "1");
            location.href = "../login/login.html";
            return;
        }
        if (!sessao.ok) throw new Error("Não foi possível verificar sua sessão.");
        const resposta = await fetch(API + "/produto/listar");
        const dados = await resposta.json();
        if (!resposta.ok || !dados.sucesso || !Array.isArray(dados.produtos)) throw new Error("Não foi possível consultar os produtos.");
        const carrinho = LilaCarrinho.listar();
        const produtos = new Map(dados.produtos.map(p => [Number(p.id_produto),p]));
        if (!carrinho.length) throw new Error("Seu carrinho está vazio.");
        let total = 0;
        let contemMini = false;
        const produtosSemEstoque = [];
        const resumo = document.getElementById("resumo");
        for (const item of carrinho) {
            const p = produtos.get(item.id_produto);
            if (!p || p.disponivel === false) throw new Error("Há produtos indisponíveis no carrinho.");
            itens.push({id_produto:item.id_produto, quantidade:item.quantidade});
            if (!String(p.nome_categoria || "").toLowerCase().includes("normal")) contemMini = true;
            const disponivel = Math.max(0, Number(p.estoque_pronto || 0));
            if (String(p.nome_categoria || "").toLowerCase().includes("normal") && disponivel < item.quantidade) {
                produtosSemEstoque.push({
                    produto: p.nome_produto,
                    sabor: p.nome_sabor || "Sem sabor informado",
                    solicitado: item.quantidade,
                    disponivel,
                    faltando: item.quantidade - disponivel
                });
            }
            const subtotal = Number(p.preco)*item.quantidade;
            total += subtotal;
            const linha = document.createElement("div"); linha.className="item";
            const nome = document.createElement("span");
            nome.textContent = `${item.quantidade}× ${p.nome_produto} — ${p.nome_sabor || ""}`;
            const preco = document.createElement("span"); preco.textContent=valor(subtotal);
            linha.append(nome,preco); resumo.append(linha);
        }
        definirMinimo(!contemMini && produtosSemEstoque.length === 0 ? 1 : 7);
        if (!contemMini && produtosSemEstoque.length > 0) {
            const aviso = document.createElement("div");
            aviso.className = "aviso-estoque";
            const titulo = document.createElement("p");
            titulo.textContent = "⚠️ Estoque insuficiente para amanhã nos seguintes sabores:";
            aviso.append(titulo);

            for (const falta of produtosSemEstoque) {
                const detalhe = document.createElement("p");
                detalhe.textContent = `${falta.produto} — ${falta.sabor}: você pediu ${falta.solicitado} unidade(s), temos ${falta.disponivel} disponível(is) e faltam ${falta.faltando}.`;
                aviso.append(detalhe);
            }

            const orientacao = document.createElement("p");
            orientacao.textContent = "Para receber a partir de amanhã, volte ao carrinho e reduza as quantidades indicadas (conforme a agenda). Ou mantenha seu pedido completo e escolha uma data com pelo menos 7 dias de antecedência.";
            aviso.append(orientacao);
            resumo.append(aviso);
        }
        document.getElementById("subtotal").textContent = "Subtotal estimado: " + valor(total);
    } catch (erro) { mensagem.textContent=erro.message; botao.disabled=true; }
}

form.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!itens.length) return;
    botao.disabled=true; mensagem.textContent="Preparando pagamento Pix...";
    const entrega = form.elements.modalidade.value === "entrega";
    const corpo = {
        itens, modalidade: entrega ? "entrega":"retirada", data_desejada:campo("data"),
        horario_desejado:campo("horario"), observacao:campo("observacao"),
        cidade:entrega?campo("cidade"):null, cep:entrega?campo("cep"):null,
        rua:entrega?campo("rua"):null, numero:entrega?campo("numero"):null,
        complemento:entrega?campo("complemento"):null, bairro:entrega?campo("bairro"):null,
        referencia:entrega?campo("referencia"):null, cupom:campo("cupom")
    };
    try {
        const resposta=await fetch(API+"/checkout/solicitar",{method:"POST",credentials:"include",
            headers:{"Content-Type":"application/json"},body:JSON.stringify(corpo)});
        const dados=await resposta.json();
        if (!resposta.ok || !dados.sucesso) throw new Error(dados.mensagem || "Erro ao enviar solicitação.");
        // Só limpa o carrinho depois da confirmação de gravação pelo servidor.

        // Guardar o pedido criado no banco.
        idPedidoPix = Number(dados.id_pedido);

        // Habilitar a finalização somente após criar o pedido.
        document.getElementById(
            "btnFinalizarPagamento"
        ).disabled = false;

        sessionStorage.setItem("lilas_pedido_pix_pendente", String(idPedidoPix));
        sessionStorage.setItem("lilas_carrinho_do_pedido", JSON.stringify(LilaCarrinho.listar()));
        form.hidden=true;
        mensagem.textContent=`Pedido #${dados.id_pedido} registrado! Aguardando pagamento e conferência manual pela Lila's.`;
        document.getElementById('pixArea').hidden=false;
        document.getElementById('pixTotal').textContent=valor(dados.total);
        document.getElementById('pixFrete').textContent=valor(dados.frete);
        document.getElementById('pixDesconto').textContent=valor(dados.desconto);
        document.getElementById('pixCodigo').value=dados.pix_copia_cola;
        // A biblioteca QRCode é carregada no HTML; o texto Pix também pode ser copiado.
        if(window.QRCode){
            const area=document.getElementById('pixQr'); area.innerHTML='';
            new QRCode(area,{text:dados.pix_copia_cola,width:220,height:220});
        } else { document.getElementById('pixQr').textContent='QR indisponível. Use Pix Copia e Cola.'; }
        mensagem.scrollIntoView({behavior:"smooth"});
    } catch (erro) {mensagem.textContent=erro.message;botao.disabled=false;}
});
// Restaurar o Pix do pedido já criado quando o cliente volta ao checkout.
async function recuperarPedidoPendente() {
    const id = Number(sessionStorage.getItem("lilas_pedido_pix_pendente"));
    if (!Number.isSafeInteger(id) || id <= 0) return false;
    try {
        const resposta = await fetch(`${API}/checkout/pedidos/${id}/pix`, {
            credentials: "include"
        });
        if (!resposta.ok) {
            if ([404, 409].includes(resposta.status)) {
                sessionStorage.removeItem("lilas_pedido_pix_pendente");
                sessionStorage.removeItem("lilas_carrinho_do_pedido");
            }
            return false;
        }
        const dados = await resposta.json();
        if (!dados.sucesso) return false;
        idPedidoPix = id;
        form.hidden = true;
        document.getElementById("pixArea").hidden = false;
        document.getElementById("pixTotal").textContent = valor(dados.total);
        document.getElementById("pixFrete").textContent = valor(dados.frete);
        document.getElementById("pixDesconto").textContent = valor(dados.desconto);
        document.getElementById("pixCodigo").value = dados.pix_copia_cola;
        const area = document.getElementById("pixQr");
        area.replaceChildren();
        if (window.QRCode) {
            new QRCode(area, { text: dados.pix_copia_cola, width: 220, height: 220 });
        } else {
            area.textContent = "QR indisponível. Use Pix Copia e Cola.";
        }
        document.getElementById("btnFinalizarPagamento").disabled = false;
        mensagem.textContent = `Pedido #${id} já registrado. Continue o Pix existente para evitar pedidos duplicados.`;
        return true;
    } catch (erro) {
        console.error("Erro ao recuperar Pix:", erro);
        return false;
    }
}

async function iniciarCheckout() {
    // Verificar sessão e carregar produtos normalmente.
    await iniciar();
    // Se já existe um Pix pendente, recuperar sem gerar novo pedido.
    await recuperarPedidoPendente();
}
iniciarCheckout();

// Copia o código Pix e informa o resultado sem usar alert nativo.
document.getElementById("btnCopiarPix")?.addEventListener("click", async () => {
    const codigo = document.getElementById("pixCodigo").value;
    const feedback = document.getElementById("pixFeedback");
    if (!codigo) { feedback.textContent = "O código Pix ainda não está disponível."; return; }
    try {
        await navigator.clipboard.writeText(codigo);
        feedback.textContent = "✓ Código Pix copiado!";
    } catch (erro) {
        document.getElementById("pixCodigo").focus();
        document.getElementById("pixCodigo").select();
        feedback.textContent = "Selecione e copie o código manualmente (Ctrl + C).";
    }
});


// =============================================
// COMPROVANTE DE PAGAMENTO
// =============================================

const comprovanteInput =
    document.getElementById("comprovantePix");

const comprovanteNome =
    document.getElementById("comprovanteNome");

const comprovanteFeedback =
    document.getElementById("comprovanteFeedback");

comprovanteInput.addEventListener("change", () => {

    const arquivo = comprovanteInput.files[0];

    comprovanteFeedback.textContent = "";

    if (!arquivo) {
        comprovanteNome.textContent =
            "Nenhum arquivo selecionado";
        return;
    }

    // Limite de 5 MB.
    const tamanhoMaximo = 5 * 1024 * 1024;

    const extensoesPermitidas = [
        "pdf",
        "jpg",
        "jpeg",
        "png"
    ];

    const extensao = arquivo.name
        .split(".")
        .pop()
        .toLowerCase();

    if (
        !extensoesPermitidas.includes(extensao) ||
        arquivo.size > tamanhoMaximo
    ) {

        comprovanteInput.value = "";

        comprovanteNome.textContent =
            "Nenhum arquivo selecionado";

        comprovanteFeedback.textContent =
            "Selecione um PDF, JPG ou PNG de até 5 MB.";

        return;
    }

    comprovanteNome.textContent = arquivo.name;

    comprovanteFeedback.textContent =
        "✓ Arquivo selecionado. O envio será " +
        "habilitado na próxima etapa.";
});


// =============================================
// FINALIZAR PAGAMENTO PIX
// =============================================

const btnFinalizarPagamento =
    document.getElementById("btnFinalizarPagamento");

btnFinalizarPagamento.addEventListener(
    "click",
    async () => {

        if (!idPedidoPix) {
            comprovanteFeedback.textContent =
                "Nenhum pedido foi registrado.";
            return;
        }

        const arquivo = comprovanteInput.files[0];

        // Impedir cliques repetidos.
        btnFinalizarPagamento.disabled = true;

        btnFinalizarPagamento.textContent =
            "Finalizando pagamento...";

        comprovanteFeedback.textContent = "";

        try {

            // =====================================
            // 1. ENVIAR COMPROVANTE, SE EXISTIR
            // =====================================

            if (arquivo && !comprovanteJaEnviado) {

                const dadosArquivo = new FormData();

                dadosArquivo.append(
                    "comprovante",
                    arquivo
                );

                const respostaUpload = await fetch(
                    API +
                    "/checkout/pedidos/" +
                    idPedidoPix +
                    "/comprovante",
                    {
                        method: "POST",
                        credentials: "include",
                        body: dadosArquivo
                    }
                );

                const resultadoUpload =
                    await respostaUpload.json();

                if (
                    !respostaUpload.ok ||
                    !resultadoUpload.sucesso
                ) {
                    throw new Error(
                        resultadoUpload.mensagem ||
                        "Não foi possível enviar o comprovante."
                    );
                }
                comprovanteJaEnviado = true;
            }

            // =====================================
            // 2. FINALIZAR ETAPA DE PAGAMENTO
            // =====================================

            const respostaFinalizacao = await fetch(
                API +
                "/checkout/pedidos/" +
                idPedidoPix +
                "/finalizar-pagamento",
                {
                    method: "PATCH",
                    credentials: "include"
                }
            );

            const resultadoFinalizacao =
                await respostaFinalizacao.json();

            if (
                !respostaFinalizacao.ok ||
                !resultadoFinalizacao.sucesso
            ) {
                throw new Error(
                    resultadoFinalizacao.mensagem ||
                    "Não foi possível finalizar."
                );
            }

            // =====================================
            // 3. ABRIR RESUMO DO PEDIDO
            // =====================================

            // Só limpar os itens que pertencem ao pedido finalizado.
            const original = JSON.parse(
                sessionStorage.getItem("lilas_carrinho_do_pedido") || "[]"
            );
            const atual = LilaCarrinho.listar();
            if (JSON.stringify(original) === JSON.stringify(atual)) {
                LilaCarrinho.limpar();
            }
            sessionStorage.removeItem("lilas_pedido_pix_pendente");
            sessionStorage.removeItem("lilas_carrinho_do_pedido");

            window.location.href =
                "resumo.html?id=" + idPedidoPix;

        } catch (erro) {

            comprovanteFeedback.textContent =
                erro.message;

            btnFinalizarPagamento.disabled = false;

            btnFinalizarPagamento.textContent =
                "Finalizar pagamento →";
        }
    }
);

