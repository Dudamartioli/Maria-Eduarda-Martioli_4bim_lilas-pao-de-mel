/* LILA'S - CRUD DE USUÁRIOS (padrão Candy Shop) */
// O backend já está montado em /admin e protege todas as rotas.
const URL_API = window.location.origin;
const id = document.getElementById('id_usuario');
const nome = document.getElementById('nome');
const email = document.getElementById('email');
const telefone = document.getElementById('telefone');
const tipo = document.getElementById('tipo_usuario');
const senha = document.getElementById('senha');
const areaSenha = document.getElementById('areaSenha');
const mensagem = document.getElementById('mensagem');
const acoesIniciais = document.getElementById('acoesIniciais');
const acoesEdicao = document.getElementById('acoesEdicao');
const btnExcluir = document.getElementById('btnExcluir');
const lista = document.getElementById('listaUsuarios');
let modo = 'consulta'; // consulta, inserir ou alterar
let usuarioCarregado = null;

// Todas as requisições levam o cookie de sessão do login.
async function requisicao(caminho, opcoes = {}) {
    const resposta = await fetch(URL_API + caminho, { credentials: 'include', ...opcoes });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.sucesso) throw new Error(dados.mensagem || 'Não foi possível completar a operação.');
    return dados;
}
function informar(texto) { mensagem.textContent = texto; if (texto) LilaAvisos.alerta(texto); }
function limpar() {
    id.value = ''; nome.value = ''; email.value = ''; telefone.value = '';
    tipo.value = 'cliente'; senha.value = ''; usuarioCarregado = null;
}
// Controla campos e botões de acordo com a operação.
function definirModo(novoModo) {
    modo = novoModo;
    const editando = modo !== 'consulta';
    [nome,email,telefone,tipo].forEach(campo => campo.disabled = !editando);
    id.disabled = editando;
    document.getElementById('btnBuscar').disabled = editando;
    acoesIniciais.hidden = editando;
    acoesEdicao.hidden = !editando;
    areaSenha.hidden = modo !== 'inserir';
    senha.disabled = modo !== 'inserir';
    btnExcluir.disabled = modo !== 'alterar';
}
function preencher(usuario) {
    id.value = usuario.id_usuario;
    nome.value = usuario.nome || '';
    email.value = usuario.email || '';
    telefone.value = usuario.telefone || '';
    tipo.value = usuario.tipo_usuario;
    usuarioCarregado = usuario;
}
// Antes de mostrar a página, verifica o login e a permissão de admin.
async function verificarAcesso() {
    try {
        await requisicao('/usuario/verificar');
        await requisicao('/admin/verificar');
        document.getElementById('conteudo').hidden = false;
        document.getElementById('avisoAcesso').hidden = true;
        await listar();
    } catch (erro) {
        document.getElementById('avisoAcesso').textContent = 'Acesso não autorizado ou servidor indisponível. Entre como administrador.';
    }
}
async function listar() {
    try {
        const dados = await requisicao('/admin/usuario/listar');
        lista.replaceChildren();
        if (!dados.usuarios.length) {
            const linha = lista.insertRow();
            const celula = linha.insertCell(); celula.colSpan = 4;
            celula.textContent = 'Nenhum usuário cadastrado.';
        }
        dados.usuarios.forEach(usuario => {
            const linha = lista.insertRow();
            [usuario.id_usuario, usuario.nome, usuario.email, usuario.tipo_usuario].forEach(valor => {
                linha.insertCell().textContent = valor;
            });
            linha.addEventListener('click', () => {
                if (modo !== 'consulta') return;
                preencher(usuario); informar('Usuário selecionado. Clique em Alterar para editar.');
            });
        });
    } catch (erro) { informar(erro.message); }
}
async function buscar() {
    if (!id.value || Number(id.value) < 1) return informar('Informe um ID válido.');
    try {
        const dados = await requisicao('/admin/usuario/' + encodeURIComponent(id.value));
        preencher(dados.usuario); informar('Usuário encontrado.');
    } catch (erro) { usuarioCarregado = null; informar(erro.message); }
}
function inserir() { limpar(); definirModo('inserir'); informar('Preencha os dados do novo usuário.'); }
function alterar() {
    if (!usuarioCarregado || String(usuarioCarregado.id_usuario) !== id.value) return informar('Busque ou selecione um usuário antes de alterar.');
    definirModo('alterar'); informar('Altere os campos e clique em Salvar.');
}
function cancelar() { limpar(); definirModo('consulta'); informar('Operação cancelada.'); }
async function salvar() {
    if (!nome.value.trim() || !email.value.trim()) return informar('Preencha nome e e-mail.');
    if (modo === 'inserir' && senha.value.length < 6) return informar('A senha inicial precisa ter pelo menos 6 caracteres.');
    const corpo = { nome: nome.value.trim(), email: email.value.trim(), telefone: telefone.value.trim(), tipo_usuario: tipo.value };
    if (modo === 'inserir') corpo.senha = senha.value;
    const caminho = modo === 'inserir' ? '/admin/usuario' : '/admin/usuario/' + id.value;
    const metodo = modo === 'inserir' ? 'POST' : 'PUT';
    if (modo === 'consulta') return;
    try {
        const dados = await requisicao(caminho, { method: metodo, headers: {'Content-Type':'application/json'}, body: JSON.stringify(corpo) });
        definirModo('consulta'); preencher(dados.usuario); informar(dados.mensagem || 'Salvo com sucesso.');
        await listar();
    } catch (erro) { informar(erro.message); }
}
async function excluir() {
    if (modo !== 'alterar' || !usuarioCarregado) return;
    if (!await LilaAvisos.confirmar('Tem certeza que deseja excluir o usuário ' + usuarioCarregado.nome + '?')) return;
    try {
        const dados = await requisicao('/admin/usuario/' + id.value, {method:'DELETE'});
        limpar(); definirModo('consulta'); informar(dados.mensagem || 'Usuário excluído.');
        await listar();
    } catch (erro) { informar(erro.message); }
}
// Eventos dos botões.
document.getElementById('btnBuscar').addEventListener('click', buscar);
document.getElementById('btnInserir').addEventListener('click', inserir);
document.getElementById('btnAlterar').addEventListener('click', alterar);
document.getElementById('btnCancelar').addEventListener('click', cancelar);
document.getElementById('btnSalvar').addEventListener('click', salvar);
document.getElementById('btnExcluir').addEventListener('click', excluir);
document.getElementById('btnAtualizar').addEventListener('click', listar);
id.addEventListener('input', () => { usuarioCarregado = null; });
definirModo('consulta');
verificarAcesso();
