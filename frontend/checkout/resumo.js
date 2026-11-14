
// =============================================
// RESUMO DO PEDIDO - LILA'S
// =============================================

const API_RESUMO = "http://localhost:3001";

// Recuperar ID enviado na URL.
const parametros = new URLSearchParams(
    window.location.search
);

const idPedido = Number(
    parametros.get("id")
);

// Buscar elemento pelo ID.
const elemento = id =>
    document.getElementById(id);

// Formatar valores em reais.
function moeda(numero) {
    return Number(numero).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}

// Formatar data sem alterar o fuso horário.
function formatarData(data) {

    if (!data) return "Não informada";

    const partes = String(data)
        .slice(0, 10)
        .split("-");

    if (partes.length !== 3) return data;

    return [
        partes[2],
        partes[1],
        partes[0]
    ].join("/");
}

// Criar linhas de produtos com segurança.
function mostrarProdutos(itens) {

    const lista = elemento("listaProdutos");

    lista.replaceChildren();

    for (const item of itens) {

        const div = document.createElement("div");
        div.className = "produto";

        const nome = document.createElement("strong");

        nome.textContent =
            `${item.quantidade}× ${item.produto_nome}`;

        const detalhe = document.createElement("small");

        detalhe.textContent =
            item.sabor_nome
                ? `Sabor: ${item.sabor_nome}`
                : "Sabor não informado";

        const preco = document.createElement("small");

        preco.textContent =
            "Subtotal: " + moeda(item.subtotal);

        div.append(nome, detalhe, preco);

        lista.append(div);
    }
}

// =============================================
// CARREGAR DADOS REAIS DO POSTGRESQL
// =============================================

async function carregarResumo() {

    if (
        !Number.isSafeInteger(idPedido) ||
        idPedido <= 0
    ) {
        elemento("mensagem").textContent =
            "Pedido inválido.";
        return;
    }

    try {

        const resposta = await fetch(
            API_RESUMO +
            "/checkout/pedidos/" +
            idPedido +
            "/resumo",
            {
                credentials: "include"
            }
        );

        if (resposta.status === 401) {

            elemento("mensagem").textContent =
                "Sua sessão expirou. Faça login novamente.";

            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem ||
                "Não foi possível consultar o pedido."
            );
        }

        const pedido = dados.pedido;

        // Dados principais.
        elemento("numeroPedido").textContent =
            "#" + pedido.id_pedido;

        elemento("nomeCliente").textContent =
            pedido.cliente_nome;

        elemento("status").textContent =
            pedido.status;

        // Produtos.
        mostrarProdutos(pedido.itens || []);

        // Modalidade.
        const entrega =
            pedido.modalidade === "entrega";

        elemento("modalidade").textContent =
            entrega ? "Entrega" : "Retirada";

        elemento("dataPedido").textContent =
            formatarData(pedido.data_desejada);

        elemento("horarioPedido").textContent =
            String(pedido.horario_desejado || "")
                .slice(0, 5) || "Não informado";

        // Endereço somente para entrega.
        if (entrega) {

            elemento("areaEndereco").hidden = false;

            const endereco = [
                pedido.rua,
                pedido.numero,
                pedido.complemento,
                pedido.bairro,
                pedido.cidade,
                pedido.cep
            ].filter(Boolean).join(", ");

            elemento("enderecoPedido").textContent =
                endereco || "Não informado";
        }

        // Valores do banco.
        elemento("subtotal").textContent =
            moeda(pedido.subtotal);

        elemento("desconto").textContent =
            moeda(pedido.desconto);

        elemento("frete").textContent =
            moeda(pedido.frete);

        elemento("total").textContent =
            moeda(pedido.total);

        // Comprovante.
        elemento("comprovanteStatus").textContent =
            pedido.comprovante_enviado
                ? "✓ Comprovante recebido para conferência."
                : "Nenhum comprovante anexado.";

        elemento("conteudo").hidden = false;

        elemento("mensagem").textContent = "";

    } catch (erro) {

        console.error(erro);

        elemento("mensagem").textContent =
            erro.message;
    }
}

carregarResumo();
