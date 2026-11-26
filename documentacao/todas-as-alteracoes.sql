
-- ==========================================
-- LILA'S - PAO DE MEL
-- BANCO DE DADOS - DW1 4 BIMESTRE
-- ==========================================


-- ==========================================
-- EXCLUSAO DAS TABELAS
-- ==========================================

-- Apaga as tabelas caso ja existam
-- A ordem respeita as chaves estrangeiras

DROP TABLE IF EXISTS pagamento;
DROP TABLE IF EXISTS item_pedido;
DROP TABLE IF EXISTS pedido;
DROP TABLE IF EXISTS produto;
DROP TABLE IF EXISTS sabor;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS usuario;


-- ==========================================
-- 1. TABELA USUARIO
-- ==========================================

-- Guarda os clientes e a administradora
-- Tambem sera utilizada para o login

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    tipo_usuario VARCHAR(20) NOT NULL
        CHECK (tipo_usuario IN ('admin', 'cliente')),
    data_cadastro DATE DEFAULT CURRENT_DATE
);


-- ==========================================
-- 2. TABELA CATEGORIA
-- ==========================================

-- Separa os paes de mel normais dos minis
-- Tabela independente

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(60) NOT NULL UNIQUE,
    descricao VARCHAR(200)
);


-- ==========================================
-- 3. TABELA SABOR
-- ==========================================

-- Armazena os sabores dos paes de mel
-- Tabela independente

CREATE TABLE sabor (
    id_sabor SERIAL PRIMARY KEY,
    nome_sabor VARCHAR(80) NOT NULL UNIQUE,
    descricao VARCHAR(200)
);


-- ==========================================
-- 4. TABELA PRODUTO
-- ==========================================

-- Cada produto pertence a uma categoria
-- Cada produto possui um sabor
-- Relacionamentos 1:N

CREATE TABLE produto (
    id_produto SERIAL PRIMARY KEY,
    nome_produto VARCHAR(100) NOT NULL,
    descricao VARCHAR(200),
    preco NUMERIC(10,2) NOT NULL
        CHECK (preco > 0),
    imagem VARCHAR(255),
    disponivel BOOLEAN DEFAULT TRUE,
    id_categoria INTEGER NOT NULL
        REFERENCES categoria(id_categoria),
    id_sabor INTEGER NOT NULL
        REFERENCES sabor(id_sabor),

    UNIQUE (nome_produto, id_sabor)
);


-- ==========================================
-- 5. TABELA PEDIDO
-- ==========================================

-- Um usuario pode realizar varios pedidos
-- Relacionamento 1:N

CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL
        REFERENCES usuario(id_usuario),
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_entrega DATE,
    status VARCHAR(30) DEFAULT 'Pendente'
        CHECK (status IN (
            'Pendente',
            'Em producao',
            'Pronto',
            'Entregue',
            'Cancelado'
        )),
    valor_total NUMERIC(10,2) DEFAULT 0
        CHECK (valor_total >= 0),
    observacao VARCHAR(300)
);


-- ==========================================
-- 6. TABELA ITEM_PEDIDO
-- ==========================================

-- Relaciona os produtos com os pedidos
-- Resolve o relacionamento N:N

CREATE TABLE item_pedido (
    id_item SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL
        REFERENCES pedido(id_pedido),
    id_produto INTEGER NOT NULL
        REFERENCES produto(id_produto),
    quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL
        CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL
        CHECK (subtotal >= 0)
);


-- ==========================================
-- 7. TABELA PAGAMENTO
-- ==========================================

-- Cada pedido possui no maximo um pagamento
-- Relacionamento 1:1

CREATE TABLE pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL UNIQUE
        REFERENCES pedido(id_pedido),
    forma_pagamento VARCHAR(30)
        CHECK (forma_pagamento IN (
            'Pix',
            'Dinheiro',
            'Cartao'
        )),
    status_pagamento VARCHAR(20) DEFAULT 'Pendente'
        CHECK (status_pagamento IN (
            'Pendente',
            'Pago',
            'Cancelado'
        ))
);


-- ==========================================
-- CARGA INICIAL - CATEGORIAS
-- ==========================================

INSERT INTO categoria (nome_categoria, descricao)
VALUES
('Normal', 'Paes de mel de tamanho normal'),
('Mini', 'Mini paes de mel para festas e eventos');


-- ==========================================
-- CARGA INICIAL - SABORES
-- ==========================================

INSERT INTO sabor (nome_sabor, descricao)
VALUES
('Tradicional', 'Pao de mel com recheio tradicional'),
('Prestigio', 'Pao de mel com recheio de coco'),
('Brigadeiro de Leite Ninho', 'Pao de mel com recheio de brigadeiro de leite Ninho');


-- ==========================================
-- CARGA INICIAL - PRODUTOS
-- ==========================================

-- PAO DE MEL NORMAL - R$ 8,00

INSERT INTO produto
(nome_produto, descricao, preco, id_categoria, id_sabor)
VALUES
('Pão de mel normal', 'Pao de mel normal tradicional', 8.00, 1, 1),
('Pão de mel normal', 'Pao de mel normal de prestigio', 8.00, 1, 2),
('Pão de mel normal', 'Pao de mel normal de leite Ninho', 8.00, 1, 3);


-- MINI CLASSICO - R$ 6,00

INSERT INTO produto
(nome_produto, descricao, preco, id_categoria, id_sabor)
VALUES
('Mini clássico', 'Mini classico tradicional', 6.00, 2, 1),
('Mini clássico', 'Mini classico de prestigio', 6.00, 2, 2),
('Mini clássico', 'Mini classico de leite Ninho', 6.00, 2, 3);


-- MINI REFINADO - R$ 7,00

INSERT INTO produto
(nome_produto, descricao, preco, id_categoria, id_sabor)
VALUES
('Mini refinado', 'Mini refinado tradicional', 7.00, 2, 1),
('Mini refinado', 'Mini refinado de prestigio', 7.00, 2, 2),
('Mini refinado', 'Mini refinado de leite Ninho', 7.00, 2, 3);


-- MINI NO PALITO - R$ 6,50

INSERT INTO produto
(nome_produto, descricao, preco, id_categoria, id_sabor)
VALUES
('Mini no palito', 'Mini no palito tradicional', 6.50, 2, 1),
('Mini no palito', 'Mini no palito de prestigio', 6.50, 2, 2),
('Mini no palito', 'Mini no palito de leite Ninho', 6.50, 2, 3);


-- ==========================================
-- CONSULTAS PARA VERIFICAR OS DADOS
-- ==========================================

SELECT * FROM usuario;

SELECT * FROM categoria;

SELECT * FROM sabor;

SELECT * FROM produto;

SELECT * FROM pedido;

SELECT * FROM item_pedido;

SELECT * FROM pagamento;


-- Mostra os produtos com categoria e sabor

SELECT
    produto.id_produto,
    produto.nome_produto,
    categoria.nome_categoria,
    sabor.nome_sabor,
    produto.preco
FROM produto
INNER JOIN categoria
    ON produto.id_categoria = categoria.id_categoria
INNER JOIN sabor
    ON produto.id_sabor = sabor.id_sabor
ORDER BY produto.id_produto;




CREATE TABLE recuperacao_senha (

    id_recuperacao SERIAL PRIMARY KEY,

    id_usuario INTEGER NOT NULL,

    token_hash VARCHAR(64) NOT NULL UNIQUE,

    data_expiracao TIMESTAMP NOT NULL,

    utilizado BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE

);


UPDATE usuario
SET tipo_usuario = 'admin'
WHERE email = 'lilas.paodemel@gmail.com';

SELECT id_usuario, nome, email, tipo_usuario
FROM usuario;

-- Remove a restrição antiga dos tipos de usuário,
-- caso ela tenha o nome padrão do PostgreSQL.
ALTER TABLE usuario
DROP CONSTRAINT IF EXISTS usuario_tipo_usuario_check;

-- Cria a nova restrição com os três tipos permitidos.
ALTER TABLE usuario
ADD CONSTRAINT usuario_tipo_usuario_check
CHECK (tipo_usuario IN ('cliente', 'admin', 'ambos'));

UPDATE usuario
SET tipo_usuario = 'ambos'
WHERE email = 'corinthiansdudaduda@gmail.com';

SELECT id_usuario, nome, email, tipo_usuario
FROM usuario;

SELECT
    id_usuario,
    nome,
    email,
    tipo_usuario
FROM usuario
ORDER BY id_usuario;

-- EXECUTE APENAS ESTE ARQUIVO no DBeaver. NÃO execute o SQL antigo com DROP TABLE.
-- Tabelas novas, sem apagar ou alterar os CRUDs existentes.
CREATE TABLE IF NOT EXISTS pedido_encomenda (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modalidade VARCHAR(10) NOT NULL CHECK (modalidade IN ('entrega','retirada')),
    cidade VARCHAR(60), cep VARCHAR(9), rua VARCHAR(150), numero VARCHAR(30),
    complemento VARCHAR(300), bairro VARCHAR(100), referencia VARCHAR(300),
    data_desejada DATE NOT NULL, horario_desejado TIME NOT NULL,
    observacao VARCHAR(300), subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status = 'Pendente')
);
CREATE TABLE IF NOT EXISTS item_encomenda (
    id_item SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedido_encomenda(id_pedido),
    id_produto INTEGER NOT NULL REFERENCES produto(id_produto),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('pedido_encomenda', 'item_encomenda');

-- LILA'S: execute no DBeaver somente uma vez. Não apaga produtos existentes.
ALTER TABLE produto ADD COLUMN IF NOT EXISTS estoque_pronto INTEGER NOT NULL DEFAULT 0;
ALTER TABLE produto DROP CONSTRAINT IF EXISTS produto_estoque_pronto_check;
ALTER TABLE produto ADD CONSTRAINT produto_estoque_pronto_check CHECK (estoque_pronto >= 0);
-- O estoque começa em zero por segurança. Cadastre as quantidades reais dos grandes no CRUD.
-- Minis não usam estoque pronto; ficam sempre sujeitos à antecedência de 7 dias.

-- Execute no DBeaver conectado ao banco da Lila's. Sem DROP TABLE.
BEGIN;
CREATE TABLE IF NOT EXISTS cupom (
 id_cupom SERIAL PRIMARY KEY, codigo VARCHAR(30) NOT NULL UNIQUE,
 tipo VARCHAR(12) NOT NULL CHECK(tipo IN ('percentual','fixo')),
 valor NUMERIC(10,2) NOT NULL CHECK(valor>0),
 validade DATE, limite_usos INTEGER CHECK(limite_usos>0),
 usos INTEGER NOT NULL DEFAULT 0 CHECK(usos>=0), ativo BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS frete NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30);
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT;
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS pagamento_status VARCHAR(30) NOT NULL DEFAULT 'Pendente';
ALTER TABLE pedido_encomenda ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMPTZ;
-- A tabela antiga permitia somente status Pendente.
ALTER TABLE pedido_encomenda DROP CONSTRAINT IF EXISTS pedido_encomenda_status_check;
ALTER TABLE pedido_encomenda ADD CONSTRAINT pedido_encomenda_status_check CHECK(status IN ('Pendente','Aguardando pagamento','Confirmado','Em produção','Pronto','Concluído','Cancelado'));
COMMIT;


-- Consultar os valores registrados nos pedidos.
SELECT
    id_pedido,
    subtotal,
    desconto,
    frete,
    total,
    status,
    pagamento_status
FROM pedido_encomenda
ORDER BY id_pedido;


-- Conferir os valores dos produtos de cada pedido.
SELECT
    i.id_pedido,
    pr.nome_produto,
    s.nome_sabor,
    i.quantidade,
    i.preco_unitario,
    i.subtotal
FROM item_encomenda i
JOIN produto pr
    ON pr.id_produto = i.id_produto
LEFT JOIN sabor s
    ON s.id_sabor = pr.id_sabor
ORDER BY i.id_pedido, i.id_item;


BEGIN;

-- Informações do cancelamento.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;

ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Situação do reembolso.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS reembolso_status VARCHAR(30)
NOT NULL DEFAULT 'Não necessário';

-- Valor que deverá ser devolvido ao cliente.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS valor_reembolso NUMERIC(12,2);

-- Data em que o reembolso foi realizado.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS reembolsado_em TIMESTAMPTZ;

-- Quantidade de estoque pronto reservada por item.
ALTER TABLE item_encomenda
ADD COLUMN IF NOT EXISTS quantidade_reservada INTEGER
NOT NULL DEFAULT 0;

-- Impedir reservas negativas.
ALTER TABLE item_encomenda
ADD CONSTRAINT item_reserva_nao_negativa
CHECK (quantidade_reservada >= 0);

COMMIT;



SELECT
    id_pedido,
    id_produto,
    quantidade,
    quantidade_reservada
FROM item_encomenda
ORDER BY id_pedido DESC;

SELECT
    id_pedido,
    id_produto,
    quantidade,
    quantidade_reservada
FROM item_encomenda
ORDER BY id_pedido DESC;



-- LILA'S - FINALIZAÇÃO DO PAGAMENTO

BEGIN;

-- Data em que o cliente finalizou a etapa do Pix.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS pagamento_finalizado_em TIMESTAMPTZ;

-- Caminho do comprovante enviado.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS comprovante_caminho TEXT;

-- Data de envio do comprovante.
ALTER TABLE pedido_encomenda
ADD COLUMN IF NOT EXISTS comprovante_enviado_em TIMESTAMPTZ;

COMMIT;

-- Execute uma única vez no DBeaver, no banco da Lila's.
CREATE TABLE IF NOT EXISTS frete_bairro (
 id_frete SERIAL PRIMARY KEY,
 cidade VARCHAR(100) NOT NULL,
 bairro VARCHAR(100) NOT NULL,
 valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
 disponivel BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT frete_bairro_unico UNIQUE (cidade, bairro),
 CONSTRAINT frete_cidade_valida CHECK (cidade IN ('Campo Mourão','Goioerê'))
);
-- Cadastre os preços reais pelo painel; nenhum preço é criado automaticamente.


-- Execute UMA VEZ no DBeaver, no banco da Lila's.
-- Descrição geral única por nome de produto, compartilhada por todos os sabores.
CREATE TABLE IF NOT EXISTS descricao_tipo (
    nome_produto VARCHAR(100) PRIMARY KEY,
    descricao_geral VARCHAR(500) NOT NULL DEFAULT ''
);

-- Depois, edite a descrição geral no CRUD de Produtos.
-- Ao editar um sabor, o texto geral será compartilhado com os outros sabores do mesmo nome.

UPDATE pedido
SET status = 'Aguardando pagamento'
WHERE status = 'Pendente';

-- Execute uma única vez no DBeaver antes de iniciar a agenda.
CREATE TABLE IF NOT EXISTS agenda_bloqueio (
 data DATE PRIMARY KEY,
 tipo VARCHAR(12) NOT NULL CHECK(tipo IN ('producao','entrega','ambos')),
 motivo VARCHAR(500) NOT NULL DEFAULT '',
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


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


-- LILA'S - LIMPEZA DE TODOS OS PEDIDOS DE TESTE
-- Execute no DBeaver conectado ao banco correto, com autocommit desativado.
-- IMPORTANTE: confira o resultado e execute COMMIT manualmente; em caso de erro, ROLLBACK.
-- As cópias de segurança ficam no schema public com prefixo backup_teste_20261116_.
-- Se já existirem tabelas com esses nomes, o script para sem apagar nada.
BEGIN;

-- Conferência inicial
SELECT 'pedido_encomenda' AS tabela, count(*) AS registros FROM pedido_encomenda;
SELECT 'item_encomenda' AS tabela, count(*) AS registros FROM item_encomenda;

-- Backup das tabelas atuais, inclusive valores financeiros e comprovantes referenciados.
CREATE TABLE backup_teste_20261116_pedido_encomenda AS TABLE pedido_encomenda;
CREATE TABLE backup_teste_20261116_item_encomenda AS TABLE item_encomenda;

-- Tabelas do modelo antigo: só cria backup e limpa se existirem.
DO $$
BEGIN
  IF to_regclass('public.pedido') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE backup_teste_20261116_pedido AS TABLE public.pedido';
  END IF;
  IF to_regclass('public.item_pedido') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE backup_teste_20261116_item_pedido AS TABLE public.item_pedido';
  END IF;
  IF to_regclass('public.pagamento') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE backup_teste_20261116_pagamento AS TABLE public.pagamento';
  END IF;
END $$;

-- Segurança: detectar outras tabelas que referenciam pedidos, evitando exclusão incompleta.
-- Se houver vínculos adicionais não previstos, a exclusão será bloqueada e deverá ser revisada.
DO $$
DECLARE v_dependencias text;
BEGIN
 SELECT string_agg(format('%I.%I -> %I', ns.nspname, cl.relname, parent.relname), ', ')
 INTO v_dependencias
 FROM pg_constraint fk
 JOIN pg_class cl ON cl.oid=fk.conrelid
 JOIN pg_namespace ns ON ns.oid=cl.relnamespace
 JOIN pg_class parent ON parent.oid=fk.confrelid
 WHERE fk.contype='f'
   AND parent.oid IN (to_regclass('public.pedido_encomenda'),to_regclass('public.item_encomenda'),to_regclass('public.pedido'),to_regclass('public.item_pedido'),to_regclass('public.pagamento'))
   AND cl.oid NOT IN (to_regclass('public.pedido_encomenda'),to_regclass('public.item_encomenda'),to_regclass('public.pedido'),to_regclass('public.item_pedido'),to_regclass('public.pagamento'));
 IF v_dependencias IS NOT NULL THEN
   RAISE EXCEPTION 'Há outras tabelas relacionadas: %. Revise antes de limpar.', v_dependencias;
 END IF;
END $$;

DELETE FROM item_encomenda;
DELETE FROM pedido_encomenda;
DO $$
BEGIN
 IF to_regclass('public.pagamento') IS NOT NULL THEN EXECUTE 'DELETE FROM public.pagamento'; END IF;
 IF to_regclass('public.item_pedido') IS NOT NULL THEN EXECUTE 'DELETE FROM public.item_pedido'; END IF;
 IF to_regclass('public.pedido') IS NOT NULL THEN EXECUTE 'DELETE FROM public.pedido'; END IF;
END $$;

-- Conferência final: ambos devem retornar zero.
SELECT 'pedido_encomenda' AS tabela, count(*) AS restantes FROM pedido_encomenda
UNION ALL SELECT 'item_encomenda', count(*) FROM item_encomenda;

-- Se tudo estiver correto, execute COMMIT; em caso de dúvida, ROLLBACK.
COMMIT;

SELECT
    COUNT(*) AS total_pedidos,
    COALESCE(SUM(total), 0) AS receita_total
FROM pedido_encomenda
WHERE pagamento_status = 'Confirmado';

SELECT
    current_database() AS banco,
    current_schema() AS esquema,
    inet_server_addr() AS servidor,
    inet_server_port() AS porta,
    COUNT(*) AS pedidos
FROM pedido_encomenda
GROUP BY 1, 2, 3, 4;

SELECT
    current_database() AS banco,
    current_schema() AS esquema,
    COUNT(*) AS total_pedidos
FROM public.pedido_encomenda;

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

SELECT COUNT(*) AS total_pedidos
FROM public.pedido_encomenda;

ROLLBACK;

-- Executar uma única vez no PostgreSQL antes de iniciar o backend atualizado.
ALTER TABLE cupom
  ADD COLUMN IF NOT EXISTS valor_minimo_pedido NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (valor_minimo_pedido >= 0);

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

ALTER TABLE usuario
ALTER COLUMN senha_hash DROP NOT NULL;
