//para guardar temporariamente os itens. Isso permite manter o carrinho mesmo depois de atualizar a página, sem exigir login.

// Armazena somente IDs e quantidades; preços são consultados no servidor.
// Não guarda senhas, tokens ou dados pessoais.
const LilaCarrinho = (() => {
    const CHAVE = "lilas_carrinho_v1";
    function listar() {
        try {
            const dados = JSON.parse(localStorage.getItem(CHAVE) || "[]");
            if (!Array.isArray(dados)) return [];
            return dados.filter(x => Number.isSafeInteger(x.id_produto) && x.id_produto > 0 &&
                Number.isSafeInteger(x.quantidade) && x.quantidade >= 1 && x.quantidade <= 999);
        } catch { return []; }
    }
    function salvar(itens) { localStorage.setItem(CHAVE, JSON.stringify(itens)); }
    function adicionar(id, quantidade) {
        id = Number(id); quantidade = Number(quantidade);
        if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(quantidade) || quantidade < 1) throw Error("Item inválido.");
        const itens = listar(); const item = itens.find(x => x.id_produto === id);
        if (item) { if (item.quantidade + quantidade > 999) throw Error("Limite de 999 unidades por produto."); item.quantidade += quantidade; }
        else { if (quantidade > 999) throw Error("Limite de 999 unidades por produto."); itens.push({id_produto:id,quantidade}); }
        salvar(itens);
    }
    function alterar(id, quantidade) {
        id = Number(id); quantidade = Number(quantidade);
        if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 999) throw Error("Quantidade inválida.");
        const itens = listar(); const item = itens.find(x => x.id_produto === id);
        if (item) {item.quantidade = quantidade; salvar(itens);}
    }
    function remover(id) { salvar(listar().filter(x => x.id_produto !== Number(id))); }
    return {listar, adicionar, alterar, remover};
})();
