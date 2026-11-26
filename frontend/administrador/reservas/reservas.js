const $ = (id) => document.getElementById(id),
  moeda = (n) =>
    Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
let dados = { movimentacoes: [] };
const aviso = (m) => ($("aviso").textContent = m);
async function req(url, op = {}) {
  const r = await fetch(url, { credentials: "include", ...op });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(j.mensagem || "Erro no servidor");
  return j;
}
const linhas = () =>
  dados.movimentacoes.map((m) => [
    new Date(m.criado_em).toLocaleString("pt-BR"),
    m.numero_venda_ano
      ? `${String(m.numero_venda_ano).padStart(4, "0")}/${m.ano_venda}`
      : "—",
    m.tipo === "entrada" ? "Depósito" : "Retirada",
    m.origem === "automatica" ? "Automática" : "Manual",
    Number(m.valor),
    m.motivo || "",
  ]);
async function carregar() {
  try {
    dados = await req("/reservas");
    $("ativa").value = String(dados.configuracao.ativa);
    $("tipo").value = dados.configuracao.tipo;
    $("valor").value = dados.configuracao.valor;
    const mov = dados.movimentacoes;
    $("saldo").textContent = moeda(dados.saldo);
    $("entradas").textContent = moeda(
      mov
        .filter((x) => x.tipo === "entrada")
        .reduce((s, x) => s + Number(x.valor), 0),
    );
    $("saidas").textContent = moeda(
      mov
        .filter((x) => x.tipo === "saida")
        .reduce((s, x) => s + Number(x.valor), 0),
    );
    $("automaticas").textContent = moeda(
      mov
        .filter((x) => x.origem === "automatica")
        .reduce((s, x) => s + Number(x.valor), 0),
    );
    $("linhas").replaceChildren();
    for (const l of linhas()) {
      const tr = document.createElement("tr");
      l.forEach((v, i) => {
        const td = document.createElement("td");
        td.textContent = i === 4 ? moeda(v) : v;
        tr.appendChild(td);
      });
      $("linhas").appendChild(tr);
    }
  } catch (e) {
    aviso(e.message);
  }
}
$("config").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await req("/reservas/configuracao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ativa: $("ativa").value === "true",
        tipo: $("tipo").value,
        valor: $("valor").value,
      }),
    });
    await carregar();
    aviso("Configuração salva.");
  } catch (e) {
    aviso(e.message);
  }
};
$("movimentar").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await req("/reservas/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: $("mov_tipo").value,
        valor: $("mov_valor").value,
        motivo: $("motivo").value,
      }),
    });
    $("movimentar").reset();
    await carregar();
    aviso("Movimentação registrada.");
  } catch (e) {
    aviso(e.message);
  }
};
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const col = ["Data", "Venda", "Tipo", "Origem", "Valor", "Motivo"];
$("pdf").onclick = () => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reservas Lila's</title><style>body{font-family:Arial}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:8px;text-align:left}</style></head><body><h1>Lila's — Reservas</h1><p>Saldo: ${moeda(dados.saldo)}</p><table><tr>${col.map((c) => `<th>${c}</th>`).join("")}</tr>${linhas()
    .map(
      (l) =>
        `<tr>${l.map((v, i) => `<td>${esc(i === 4 ? moeda(v) : v)}</td>`).join("")}</tr>`,
    )
    .join("")}</table></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    aviso("Permita pop-ups.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.addEventListener(
    "load",
    () => {
      w.focus();
      w.print();
    },
    { once: true },
  );
};
$("excel").onclick = () => {
  const todas = [col, ...linhas(), [], ["Saldo atual", Number(dados.saldo)]];
  const xml = (s) => esc(s).replace(/"/g, "&quot;");
  const rows = todas
    .map(
      (l) =>
        `<Row>${l.map((v) => `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${xml(v)}</Data></Cell>`).join("")}</Row>`,
    )
    .join("");
  const blob = new Blob(
    [
      `<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Reservas"><Table>${rows}</Table></Worksheet></Workbook>`,
    ],
    { type: "application/vnd.ms-excel" },
  );
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = "lilas-reservas.xls";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
carregar();
