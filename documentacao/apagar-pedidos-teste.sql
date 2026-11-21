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
-- COMMIT;
