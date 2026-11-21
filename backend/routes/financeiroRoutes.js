const express = require('express');
const router = express.Router();
const pool = require('../database');
router.use(require('../middlewares/autenticacao'));
router.use(require('../middlewares/administrador'));

router.get('/resumo', async (req, res) => {
  const ano = Number(req.query.ano);
  const mes = req.query.mes ? Number(req.query.mes) : null;
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 ||
      (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12))) {
    return res.status(400).json({ mensagem: 'Período inválido.' });
  }
  const inicio = `${ano}-${String(mes || 1).padStart(2, '0')}-01`;
  const fim = mes === null ? `${ano + 1}-01-01` :
    mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  try {
    // Recebimentos na data da confirmação, independentemente da data da encomenda.
    // Reembolsos realizados são abatidos na data efetiva da devolução.
    const [movimentos, gastos, unidades, produtos, cancelados] = await Promise.all([
      pool.query(`
        SELECT tipo, mes, SUM(valor)::numeric AS valor, COUNT(*)::int AS quantidade
        FROM (
          SELECT 'receita' AS tipo, EXTRACT(MONTH FROM confirmado_em)::int AS mes,
                 total AS valor
          FROM pedido_encomenda
          WHERE pagamento_status='Confirmado'
            AND confirmado_em >= $1::date AND confirmado_em < $2::date
          UNION ALL
          SELECT 'reembolso' AS tipo, EXTRACT(MONTH FROM reembolsado_em)::int AS mes,
                 COALESCE(valor_reembolso, total) AS valor
          FROM pedido_encomenda
          WHERE reembolso_status='Realizado'
            AND reembolsado_em >= $1::date AND reembolsado_em < $2::date
        ) movimentos GROUP BY tipo, mes`, [inicio, fim]),
      pool.query(`SELECT EXTRACT(MONTH FROM data_despesa)::int AS mes,
                    categoria, SUM(valor)::numeric AS valor
                  FROM despesa WHERE data_despesa >= $1::date AND data_despesa < $2::date
                  GROUP BY mes, categoria`, [inicio, fim]),
      pool.query(`SELECT COALESCE(SUM(i.quantidade),0)::int AS unidades
                  FROM item_encomenda i JOIN pedido_encomenda p ON p.id_pedido=i.id_pedido
                  WHERE p.pagamento_status='Confirmado' AND p.status <> 'Cancelado'
                    AND p.confirmado_em >= $1::date AND p.confirmado_em < $2::date`,
                 [inicio, fim]),
      pool.query(`SELECT pr.nome_produto AS produto,
                    COALESCE(s.nome_sabor,'Sem sabor') AS sabor,
                    SUM(i.quantidade)::int AS quantidade
                  FROM item_encomenda i
                  JOIN pedido_encomenda p ON p.id_pedido=i.id_pedido
                  JOIN produto pr ON pr.id_produto=i.id_produto
                  LEFT JOIN sabor s ON s.id_sabor=pr.id_sabor
                  WHERE p.pagamento_status='Confirmado' AND p.status <> 'Cancelado'
                    AND p.confirmado_em >= $1::date AND p.confirmado_em < $2::date
                  GROUP BY pr.nome_produto,s.nome_sabor
                  ORDER BY quantidade DESC LIMIT 12`, [inicio, fim]),
      pool.query(`SELECT COUNT(DISTINCT p.id_pedido)::int AS pedidos, COALESCE(SUM(i.quantidade),0)::int AS unidades
                  FROM pedido_encomenda p
                  LEFT JOIN item_encomenda i ON i.id_pedido=p.id_pedido
                  WHERE p.pagamento_status='Confirmado' AND p.status='Cancelado'
                    AND p.confirmado_em >= $1::date AND p.confirmado_em < $2::date`, [inicio, fim])
    ]);
    const meses = Array.from({length:12},(_,i)=>({
      mes:i+1, receitas:0, reembolsos:0, despesas:0, resultado:0
    }));
    const categorias = {};
    let vendas = 0;
    for (const r of movimentos.rows) {
      const alvo = meses[Number(r.mes)-1];
      alvo[r.tipo==='receita'?'receitas':'reembolsos'] += Number(r.valor);
      if (r.tipo==='receita') vendas += Number(r.quantidade);
    }
    for (const d of gastos.rows) {
      meses[Number(d.mes)-1].despesas += Number(d.valor);
      categorias[d.categoria] = (categorias[d.categoria] || 0) + Number(d.valor);
    }
    for (const m of meses) {
      m.resultado = m.receitas - m.reembolsos - m.despesas;
    }
    const selecionados = mes ? [meses[mes-1]] : meses;
    const somar = campo => Math.round(selecionados.reduce((s,m)=>s+m[campo],0)*100)/100;
    res.json({
      periodo:{ano,mes}, vendas, unidades:Number(unidades.rows[0].unidades),
      pedidosCancelados:Number(cancelados.rows[0].pedidos), unidadesCanceladas:Number(cancelados.rows[0].unidades),
      receitas:somar('receitas'), reembolsos:somar('reembolsos'),
      despesas:somar('despesas'), resultado:somar('resultado'),
      meses:selecionados,
      categorias:Object.entries(categorias).map(([nome,valor])=>({nome,valor})),
      produtos:produtos.rows
    });
  } catch (erro) {
    console.error('Relatório financeiro:',erro);
    res.status(500).json({mensagem:'Não foi possível consultar o financeiro. Confira as migrações do banco.'});
  }
});
module.exports = router;
