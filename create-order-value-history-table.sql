-- Script para criar a tabela order_value_history no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS order_value_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL,
  previous_value DECIMAL(10,2),
  new_value DECIMAL(10,2) NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar foreign key constraint (se a tabela service_orders existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_orders') THEN
    ALTER TABLE order_value_history 
    ADD CONSTRAINT fk_order_value_history_service_order 
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_order_value_history_service_order_id 
ON order_value_history(service_order_id);

CREATE INDEX IF NOT EXISTS idx_order_value_history_changed_at 
ON order_value_history(changed_at DESC);

-- 4. Habilitar RLS
ALTER TABLE order_value_history ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de segurança
CREATE POLICY "order_value_history_select_policy" ON order_value_history
  FOR SELECT USING (true);

CREATE POLICY "order_value_history_insert_policy" ON order_value_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_value_history_update_policy" ON order_value_history
  FOR UPDATE USING (true);

CREATE POLICY "order_value_history_delete_policy" ON order_value_history
  FOR DELETE USING (true);

-- 6. Verificar se a tabela foi criada
SELECT 'Tabela order_value_history criada com sucesso!' as status;

-- 7. Mostrar estrutura da tabela
\d order_value_history;
