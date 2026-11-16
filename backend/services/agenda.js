// Agenda: motivos privados nunca são retornados pela consulta pública.
const pool = require('../database');
async function verificarAgenda(data, diasMinimos, db = pool) {
  const r = await db.query(`SELECT data, tipo FROM agenda_bloqueio WHERE data BETWEEN $1::date - ($2::int * INTERVAL '1 day') AND $1::date ORDER BY data`, [data, diasMinimos]);
  const bloqueios = r.rows.map(x => ({ data: String(x.data instanceof Date ? x.data.toISOString().slice(0,10) : x.data).slice(0,10), tipo:x.tipo }));
  const entrega = bloqueios.find(x=>x.data===data && ['entrega','ambos'].includes(x.tipo));
  if(entrega) throw new Error('A data escolhida está indisponível para entregas e retiradas. Escolha outra data.');
  // Antecedência: dias de produção necessários, sem contar a data de entrega.
  // Para encomendas rápidas com estoque pronto, não exigir dia de produção.
  if(diasMinimos > 1) {
    let disponiveis=0;
    const cursor=new Date(data+'T12:00:00Z');
    for(let i=0;i<diasMinimos;i++) {
      cursor.setUTCDate(cursor.getUTCDate()-1);
      const dia=cursor.toISOString().slice(0,10);
      if(!bloqueios.some(x=>x.data===dia && ['producao','ambos'].includes(x.tipo))) disponiveis++;
    }
    if(disponiveis<diasMinimos) throw new Error('Há dias de produção bloqueados no prazo desta encomenda. Escolha uma data posterior.');
  }
}
module.exports = {verificarAgenda};
