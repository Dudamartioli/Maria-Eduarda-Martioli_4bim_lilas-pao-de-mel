const $ = (id) => document.getElementById(id);
const moeda = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
let clientes = [];
async function api(caminho) {
  const resposta = await fetch("/admin/" + caminho, { credentials: "include" });
  const dados = await resposta.json();
  if (!resposta.ok || !dados.sucesso)
    throw Error(dados.mensagem || "Falha na consulta.");
  return dados;
}
function celulas(linha, valores) {
  valores.forEach((valor) => {
    const td = linha.insertCell();
    td.textContent = valor;
  });
}
function selecionado() {
  return clientes.find((c) => String(c.id_usuario) === $("cliente").value);
}
function ordenar() {
  const campo = $("criterio").value;
  return [...clientes].sort(
    (a, b) =>
      Number(b[campo]) - Number(a[campo]) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
function mostrarRanking() {
  const tbody = $("ranking");
  tbody.replaceChildren();
  ordenar().forEach((c, i) => {
    const tr = tbody.insertRow();
    celulas(tr, [
      `${i + 1}º`,
      c.nome,
      c.pedidos_finalizados,
      moeda(c.total_gasto),
      c.unidades,
    ]);
    tr.title = "Clique para ver os pedidos";
    tr.addEventListener("click", () => {
      $("cliente").value = c.id_usuario;
      atualizar();
    });
  });
  if (!clientes.length) {
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 5;
    td.textContent = "Nenhum cliente encontrado.";
  }
}
async function atualizar() {
  const c = selecionado();
  const dados = c ? [c] : clientes;
  for (const [campo, id] of [
    ["pedidos_finalizados", "pedidos"],
    ["total_gasto", "gasto"],
    ["unidades", "unidades"],
    ["em_andamento", "andamento"],
  ]) {
    const soma = dados.reduce((n, item) => n + Number(item[campo] || 0), 0);
    $(id).textContent = campo === "total_gasto" ? moeda(soma) : soma;
  }
  $("secaoPedidos").hidden = !c;
  if (!c) return;
  $("nomeCliente").textContent = c.nome;
  const tbody = $("historico");
  tbody.replaceChildren();
  try {
    const qs = new URLSearchParams();
    if ($("ano").value) qs.set("ano", $("ano").value);
    const resultado = await api(
      `historico-clientes/${c.id_usuario}/pedidos?${qs}`,
    );
    if (selecionado()?.id_usuario !== c.id_usuario) return;
    resultado.pedidos.forEach((p) => {
      const tr = tbody.insertRow();
      celulas(tr, [
        `#${p.id_pedido}`,
        new Date(p.criado_em).toLocaleDateString("pt-BR"),
        p.unidades,
        moeda(p.total),
        p.status,
      ]);
    });
    if (!resultado.pedidos.length) {
      const tr = tbody.insertRow();
      const td = tr.insertCell();
      td.colSpan = 5;
      td.textContent = "Nenhum pedido neste período.";
    }
  } catch (e) {
    tbody.replaceChildren();
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 5;
    td.textContent = e.message;
  }
}
async function carregar() {
  const anterior = $("cliente").value;
  const qs = new URLSearchParams();
  if ($("ano").value) qs.set("ano", $("ano").value);
  const dados = await api("historico-clientes?" + qs);
  clientes = dados.clientes;
  const select = $("cliente");
  select.replaceChildren();
  select.add(new Option("Todos os clientes", ""));
  clientes.forEach((c) =>
    select.add(new Option(`${c.nome} (ID ${c.id_usuario})`, c.id_usuario)),
  );
  if (clientes.some((c) => String(c.id_usuario) === anterior))
    select.value = anterior;
  mostrarRanking();
  await atualizar();
}
async function iniciar() {
  try {
    await api("verificar");
    const anoAtual = new Date().getFullYear();
    for (let ano = anoAtual; ano >= 2020; ano--)
      $("ano").add(new Option(ano, ano));
    $("conteudo").hidden = false;
    $("aviso").hidden = true;
    await carregar();
    $("ano").addEventListener("change", () =>
      carregar().catch((e) => LilaAvisos.alerta(e.message)),
    );
    $("cliente").addEventListener("change", () => atualizar());
    $("criterio").addEventListener("change", mostrarRanking);
  } catch (e) {
    $("aviso").textContent =
      "Acesso não autorizado ou erro ao carregar: " + e.message;
  }
}
iniciar();
