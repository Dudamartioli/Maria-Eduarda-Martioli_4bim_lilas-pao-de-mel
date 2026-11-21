-- Execute uma vez no PostgreSQL, após o esquema atual.
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS numero_venda_ano INTEGER;
CREATE TABLE IF NOT EXISTS numeracao_venda (ano INTEGER PRIMARY KEY, ultimo_numero INTEGER NOT NULL DEFAULT 0);
-- Atribui números a vendas antigas confirmadas, em ordem cronológica.
WITH numeradas AS (SELECT id_pedido, EXTRACT(YEAR FROM confirmado_em)::integer ano, ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM confirmado_em) ORDER BY confirmado_em,id_pedido)::integer numero FROM pedido_encomenda WHERE confirmado_em IS NOT NULL AND pagamento_status='Confirmado'),
 atualizadas AS (UPDATE pedido_encomenda p SET numero_venda_ano=n.numero FROM numeradas n WHERE p.id_pedido=n.id_pedido AND p.numero_venda_ano IS NULL RETURNING p.id_pedido)
SELECT count(*) FROM atualizadas;
INSERT INTO numeracao_venda(ano,ultimo_numero) SELECT EXTRACT(YEAR FROM confirmado_em)::integer,MAX(numero_venda_ano) FROM pedido_encomenda WHERE numero_venda_ano IS NOT NULL AND confirmado_em IS NOT NULL GROUP BY 1 ON CONFLICT(ano) DO UPDATE SET ultimo_numero=GREATEST(numeracao_venda.ultimo_numero,EXCLUDED.ultimo_numero);
ALTER TABLE despesa ADD COLUMN IF NOT EXISTS id_pedido INTEGER REFERENCES pedido_encomenda(id_pedido) ON DELETE SET NULL;
ALTER TABLE despesa ADD COLUMN IF NOT EXISTS nome_despesa VARCHAR(180);
ALTER TABLE despesa ADD COLUMN IF NOT EXISTS quantidade NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK(quantidade>0);
ALTER TABLE despesa ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(14,4);
UPDATE despesa SET nome_despesa=descricao WHERE nome_despesa IS NULL;
UPDATE despesa SET valor_unitario=valor WHERE valor_unitario IS NULL;
CREATE TABLE IF NOT EXISTS reserva_configuracao(id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id=1),ativa BOOLEAN NOT NULL DEFAULT FALSE,tipo VARCHAR(12) NOT NULL DEFAULT 'percentual' CHECK(tipo IN ('percentual','fixo')),valor NUMERIC(12,2) NOT NULL DEFAULT 10 CHECK(valor>=0),atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO reserva_configuracao(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS reserva_movimentacao(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,id_pedido INTEGER REFERENCES pedido_encomenda(id_pedido) ON DELETE RESTRICT,tipo VARCHAR(12) NOT NULL CHECK(tipo IN ('entrada','saida')),origem VARCHAR(12) NOT NULL CHECK(origem IN ('automatica','manual')),valor NUMERIC(12,2) NOT NULL CHECK(valor>0),motivo VARCHAR(300),criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS uq_reserva_auto_pedido ON reserva_movimentacao(id_pedido) WHERE origem='automatica';
