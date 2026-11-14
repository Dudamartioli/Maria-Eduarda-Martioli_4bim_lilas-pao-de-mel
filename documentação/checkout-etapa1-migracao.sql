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
