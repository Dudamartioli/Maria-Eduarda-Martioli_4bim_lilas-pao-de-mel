const $ = id => document.getElementById(id);
const moeda = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
$('mes').innerHTML = meses.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
const hoje = new Date(); $('ano').value=hoje.getFullYear(); $('mes').value=hoje.getMonth()+1;
function svgEl(nome,attrs={}) { const e=document.createElementNS('http://www.w3.org/2000/svg',nome); for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v)); return e; }
function graficoBarras(id, dados, series, formatar=moeda) {
 const alvo=$(id); alvo.replaceChildren();
 if(!dados.length || dados.every(d=>series.every(s=>Number(d[s.campo])===0))) {alvo.textContent='Nenhum dado neste período.';return;}
 const largura=Math.max(620,dados.length*76), altura=320, esquerda=75, direita=20, topo=25, baixo=65;
 const svg=svgEl('svg',{viewBox:`0 0 ${largura} ${altura}`,role:'img','aria-label':alvo.getAttribute('aria-label')||'Gráfico'});
 const valores=dados.flatMap(d=>series.map(s=>Number(d[s.campo])||0));
 const min=Math.min(0,...valores), max=Math.max(0,...valores), intervalo=max-min||1;
 const y=v=>topo+(max-v)/intervalo*(altura-topo-baixo);
 for(let i=0;i<=4;i++) {const v=min+intervalo*i/4, yy=y(v);svg.appendChild(svgEl('line',{x1:esquerda,y1:yy,x2:largura-direita,y2:yy,stroke:'#d7bb89','stroke-dasharray':'4 5'})); const t=svgEl('text',{x:esquerda-9,y:yy+4,'text-anchor':'end','font-size':11,fill:'#6a4b37'});t.textContent=Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(v);svg.appendChild(t);}
 const area=largura-esquerda-direita, grupo=area/dados.length, passo=Math.min(24,(grupo-12)/series.length);
 dados.forEach((d,i)=>{const centro=esquerda+grupo*(i+.5); const titulo=svgEl('text',{x:centro,y:altura-30,'text-anchor':'middle','font-size':12,fill:'#5c3a2e'});titulo.textContent=d.rotulo.length>15?d.rotulo.slice(0,14)+'…':d.rotulo;svg.appendChild(titulo);
 series.forEach((s,j)=>{const valor=Number(d[s.campo])||0;const x=centro+(j-(series.length-1)/2)*passo-passo*.39;const rect=svgEl('rect',{x,y:Math.min(y(valor),y(0)),width:passo*.78,height:Math.max(1,Math.abs(y(valor)-y(0))),rx:3,fill:s.cor});const tip=svgEl('title');tip.textContent=`${d.rotulo} — ${s.nome}: ${formatar(valor)}`;rect.appendChild(tip);svg.appendChild(rect);});});
 alvo.appendChild(svg);
 const legenda=document.createElement('div');legenda.className='legenda';series.forEach(s=>{const item=document.createElement('span');const ponto=document.createElement('i');ponto.style.background=s.cor;item.append(ponto,document.createTextNode(s.nome));legenda.appendChild(item);});alvo.appendChild(legenda);
}
async function carregar(){ $('aviso').textContent='Carregando dados reais do PostgreSQL…';const params=new URLSearchParams({ano:$('ano').value});if($('tipo').value==='mensal')params.set('mes',$('mes').value);
 try{const resp=await fetch('/financeiro/resumo?'+params,{credentials:'include'});const d=await resp.json();if(!resp.ok)throw Error(d.mensagem||'Falha ao consultar.');
 for(const campo of ['receitas','despesas','reembolsos','resultado'])$(campo).textContent=moeda(d[campo]);$('vendas').textContent=d.vendas;$('unidades').textContent=d.unidades;$('pedidosCancelados').textContent=d.pedidosCancelados;$('unidadesCanceladas').textContent=d.unidadesCanceladas;
 const serie=[{campo:'receitas',nome:'Receitas',cor:'#bc782d'},{campo:'despesas',nome:'Despesas',cor:'#9a5545'},{campo:'resultado',nome:'Resultado',cor:'#5c3a2e'}];
 graficoBarras('graficoPrincipal',d.meses.map(m=>({...m,rotulo:meses[m.mes-1].slice(0,3)})),serie);
 graficoBarras('graficoCategorias',d.categorias.map(c=>({rotulo:c.nome,valor:c.valor})),[{campo:'valor',nome:'Gastos',cor:'#b77b3f'}]);
 graficoBarras('graficoProdutos',d.produtos.map(p=>({rotulo:p.produto+' / '+p.sabor,quantidade:p.quantidade})),[{campo:'quantidade',nome:'Unidades',cor:'#5c3a2e'}],v=>`${v} unidades`);
 $('aviso').textContent='Dados atualizados.';
 }catch(e){$('aviso').textContent=e.message;for(const id of ['graficoPrincipal','graficoCategorias','graficoProdutos'])$(id).replaceChildren();}}
$('tipo').onchange=()=>{$('campoMes').hidden=$('tipo').value==='anual';carregar();};$('consultar').onclick=carregar;carregar();
