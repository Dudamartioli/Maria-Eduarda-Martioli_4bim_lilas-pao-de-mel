BEGIN;
ALTER TABLE categoria ADD COLUMN IF NOT EXISTS regra_producao VARCHAR(12) CHECK (regra_producao IN ('estoque','encomenda'));
UPDATE categoria SET regra_producao = CASE WHEN lower(nome_categoria) ~ 'normal|grande' THEN 'estoque' ELSE 'encomenda' END WHERE regra_producao IS NULL;
ALTER TABLE categoria ALTER COLUMN regra_producao SET DEFAULT 'encomenda', ALTER COLUMN regra_producao SET NOT NULL;
COMMIT;
