const express = require('express');
const router = express.Router();
const pool = require('../database');
router.use(require('../middlewares/autenticacao'));
router.use(require('../middlewares/administrador'));
function periodo(q) {
 const ano = Number(q.ano), mes = q.mes === undefined || q.mes === '' ? null : Number(q.mes);
 if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 || (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12))) return null;
 const inicio = `${ano}-${String(mes || 1).padStart(2,'0')}-01`;
 const fim = mes === null ? `${ano+1}-01-01` : mes === 12 ? `${ano+1}-01-01` : `${ano}-${String(mes+1).padStart(2,'0')}-01`;
 return [inicio,fim];
}
function validar(b) {
 const nome=String(b.nome_despesa||'').trim(),descricao=String(b.descricao||'').trim(),categoria=String(b.categoria||'').trim();
 const qtd=Number(b.quantidade),unit=Number(b.valor_unitario),total=Number(b.valor),data=String(b.data_despesa||'');
 const pedido=b.id_pedido===''||b.id_pedido==null?null:Number(b.id_pedido);
 if(!nome||nome.length>180||descricao.length>180||!categoria||categoria.length>70||!Number.isFinite(qtd)||qtd<=0||!Number.isFinite(unit)||unit<0||!Number.isFinite(total)||total<0||Math.abs(Math.round(qtd*unit*100)/100-total)>0.02||!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(Date.parse(data+'T00:00:00Z'))||new Date(data+'T00:00:00Z').toISOString().slice(0,10)!==data||String(b.observacao||'').length>3000||(pedido!==null&&(!Number.isSafeInteger(pedido)||pedido<1)))return null;
 return [nome,descricao,categoria,qtd,unit,Math.round(total*100)/100,data,String(b.observacao||'').trim(),pedido];
}
router.get('/vendas',async(req,res)=>{try{const r=await pool.query(`SELECT id_pedido,numero_venda_ano,EXTRACT(YEAR FROM confirmado_em)::integer AS ano FROM pedido_encomenda WHERE numero_venda_ano IS NOT NULL ORDER BY confirmado_em DESC LIMIT 1000`);res.json(r.rows);}catch(e){console.error(e);res.status(500).json({mensagem:'Erro ao carregar vendas.'});}});
router.get('/',async(req,res)=>{
 const p=periodo(req.query);if(!p)return res.status(400).json({mensagem:'Período inválido.'});
 try{const r=await pool.query(`SELECT d.*,to_char(d.data_despesa,'YYYY-MM-DD') AS data_despesa,p.numero_venda_ano,EXTRACT(YEAR FROM p.confirmado_em)::integer AS ano_venda FROM despesa d LEFT JOIN pedido_encomenda p ON p.id_pedido=d.id_pedido WHERE d.data_despesa >= $1 AND d.data_despesa < $2 ORDER BY d.data_despesa DESC,d.id_despesa DESC`,p);res.json({despesas:r.rows,total:r.rows.reduce((a,d)=>a+Number(d.valor),0)});}catch(e){console.error(e);res.status(500).json({mensagem:'Erro ao consultar despesas. Execute a migração SQL.'});}
});
router.post('/',async(req,res)=>{const d=validar(req.body);if(!d)return res.status(400).json({mensagem:'Dados inválidos.'});try{const r=await pool.query(`INSERT INTO despesa(nome_despesa,descricao,categoria,quantidade,valor_unitario,valor,data_despesa,observacao,id_pedido) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_despesa`,d);res.status(201).json({id:r.rows[0].id_despesa});}catch(e){console.error(e);res.status(500).json({mensagem:'Erro ao cadastrar despesa.'});}});
router.put('/:id',async(req,res)=>{if(!/^\d+$/.test(req.params.id))return res.status(400).json({mensagem:'ID inválido.'});const d=validar(req.body);if(!d)return res.status(400).json({mensagem:'Dados inválidos.'});try{const r=await pool.query(`UPDATE despesa SET nome_despesa=$1,descricao=$2,categoria=$3,quantidade=$4,valor_unitario=$5,valor=$6,data_despesa=$7,observacao=$8,id_pedido=$9 WHERE id_despesa=$10 RETURNING id_despesa`,[...d,req.params.id]);if(!r.rowCount)return res.status(404).json({mensagem:'Despesa não encontrada.'});res.json({sucesso:true});}catch(e){console.error(e);res.status(500).json({mensagem:'Erro ao alterar despesa.'});}});
router.delete('/:id',async(req,res)=>{
 if(!/^\d+$/.test(req.params.id))return res.status(400).json({mensagem:'ID inválido.'});
 try{const r=await pool.query('DELETE FROM despesa WHERE id_despesa=$1 RETURNING id_despesa',[req.params.id]);if(!r.rowCount)return res.status(404).json({mensagem:'Despesa não encontrada.'});res.json({sucesso:true});}catch(e){console.error(e);res.status(500).json({mensagem:'Erro ao excluir.'});}
});
module.exports=router;
