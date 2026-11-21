CREATE TABLE IF NOT EXISTS mensagem_promocional (
 id_mensagem SERIAL PRIMARY KEY,
 titulo VARCHAR(120) NOT NULL,
 descricao TEXT NOT NULL,
 texto_botao VARCHAR(60) NOT NULL DEFAULT 'Aproveitar agora',
 destino VARCHAR(30) NOT NULL DEFAULT 'produtos' CHECK (destino IN ('produtos','carrinho','login')),
 id_cupom INTEGER REFERENCES cupom(id_cupom) ON DELETE SET NULL,
 frequencia VARCHAR(20) NOT NULL DEFAULT 'primeira' CHECK (frequencia IN ('primeira','sessao','sempre')),
 prioridade INTEGER NOT NULL DEFAULT 0,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
