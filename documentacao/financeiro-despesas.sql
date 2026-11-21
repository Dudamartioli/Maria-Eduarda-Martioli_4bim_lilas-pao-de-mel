CREATE TABLE IF NOT EXISTS despesa (
 id_despesa INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 descricao VARCHAR(180) NOT NULL,
 categoria VARCHAR(70) NOT NULL,
 valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
 data_despesa DATE NOT NULL,
 observacao TEXT,
 data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_despesa_data ON despesa(data_despesa);
