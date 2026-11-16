
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

SELECT id_usuario, nome, email, tipo_usuario
FROM usuario;

UPDATE usuario
SET tipo_usuario = 'admin'
WHERE email = 'lilas.paodemel@exemplo.com';

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
