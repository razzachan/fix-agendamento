-- Adicionar coluna scheduled_time à tabela service_orders se ela não existir
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS scheduled_time TIME;
