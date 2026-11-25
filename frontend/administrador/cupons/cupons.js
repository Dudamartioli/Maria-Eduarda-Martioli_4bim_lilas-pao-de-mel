const API = 'http://localhost:3001/pagamentos-admin';
const lista = document.getElementById('lista');
const msg = document.getElementById('msg');
const v = id => document.getElementById(id).value;
let editando = null;

async function requisitar(url, opcoes = {}) {
  const r = await fetch(url, { credentials: 'include', ...opcoes });
  if (r.status === 401 || r.status === 403) {
    location.href = '../../login/login.html';
    return null;
  }
  const dados = await r.json();
  if (!r.ok || !dados.sucesso) throw Error(dados.mensagem || `Erro HTTP ${r.status}`);
  return dados;
}
async function carregar() {
  try {
    const dados = await requisitar(API + '/cupons');
    if (!dados) return;
    lista.replaceChildren();
    for (const c of dados.cupons || []) {
      const a = document.createElement('article');
      a.append(document.createTextNode(`${c.codigo} — ${c.tipo} ${c.valor} | Mínimo: R$ ${Number(c.valor_minimo_pedido || 0).toFixed(2).replace('.', ',')} | Usos: ${c.usos} | ${c.ativo ? 'Ativo' : 'Inativo'} `));
      const e = document.createElement('button');
      e.textContent = 'Editar';
      e.onclick = () => {
        editando = c.id_cupom;
        document.getElementById('codigo').value = c.codigo;
        document.getElementById('tipo').value = c.tipo;
        document.getElementById('valor').value = c.valor;
        document.getElementById('validade').value = c.validade ? String(c.validade).slice(0, 10) : '';
        document.getElementById('limite').value = c.limite_usos || '';
        document.getElementById('minimo').value = c.valor_minimo_pedido || 0;
        msg.textContent = 'Editando cupom #' + editando;
      };
      const acoes = document.createElement('div');
      acoes.className = 'acoes-cupom';
      const alternar = document.createElement('button');
      alternar.textContent = c.ativo ? 'Desabilitar cupom' : 'Reativar cupom';
      alternar.onclick = async () => {
        if (!await LilaAvisos.confirmar(`${c.ativo ? 'Desabilitar' : 'Reativar'} o cupom ${c.codigo}?`)) return;
        try {
          const d = await requisitar(API + '/cupons/' + c.id_cupom + (c.ativo ? '/desabilitar' : '/reativar'), {method:'PATCH'});
          if (d) { msg.textContent = d.mensagem; await carregar(); }
        } catch (erro) { msg.textContent = erro.message; }
      };
      const excluir = document.createElement('button');
      excluir.textContent = 'Excluir cupom';
      excluir.onclick = async () => {
        
        try {
          const d = await requisitar(API + '/cupons/' + c.id_cupom + '/definitivo', {method:'DELETE'});
          if (d) { msg.textContent = d.mensagem; await carregar(); }
        } catch (erro) { msg.textContent = erro.message; }
      };
      acoes.append(e, alternar, excluir);
      a.append(acoes);
      lista.append(a);
    }
  } catch (erro) { msg.textContent = erro.message; }
}
document.getElementById('f').onsubmit = async ev => {
  ev.preventDefault();
  const dados = {codigo:v('codigo'),tipo:v('tipo'),valor:Number(v('valor')),validade:v('validade')||null,limite_usos:v('limite')?Number(v('limite')):null,valor_minimo_pedido:Number(v('minimo')||0),ativo:true};
  try {
    const d = await requisitar(API + '/cupons' + (editando ? '/' + editando : ''), {
      method:editando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)
    });
    if (d) {editando=null;ev.target.reset();msg.textContent='Salvo com sucesso';await carregar();}
  } catch (erro) {msg.textContent=erro.message;}
};
carregar();
