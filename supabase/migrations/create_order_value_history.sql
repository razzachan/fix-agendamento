-- Criar tabela para histórico de mudanças de valor das ordens de serviço
CREATE TABLE IF NOT EXISTS order_value_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  previous_value DECIMAL(10,2),
  new_value DECIMAL(10,2) NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_value_history_service_order_id ON order_value_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_order_value_history_changed_at ON order_value_history(changed_at DESC);

-- Adicionar comentários
COMMENT ON TABLE order_value_history IS 'Histórico de mudanças de valor das ordens de serviço';
COMMENT ON COLUMN order_value_history.service_order_id IS 'ID da ordem de serviço';
COMMENT ON COLUMN order_value_history.previous_value IS 'Valor anterior (pode ser NULL se for o primeiro valor)';
COMMENT ON COLUMN order_value_history.new_value IS 'Novo valor definido';
COMMENT ON COLUMN order_value_history.change_reason IS 'Motivo da alteração do valor';
COMMENT ON COLUMN order_value_history.changed_by IS 'Nome do usuário que fez a alteração';
COMMENT ON COLUMN order_value_history.changed_at IS 'Data e hora da alteração';

-- Habilitar RLS (Row Level Security)
ALTER TABLE order_value_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "order_value_history_select_policy" ON order_value_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "order_value_history_insert_policy" ON order_value_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização apenas para admins (se necessário)
CREATE POLICY "order_value_history_update_policy" ON order_value_history
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão apenas para admins (se necessário)
CREATE POLICY "order_value_history_delete_policy" ON order_value_history
  FOR DELETE USING (auth.role() = 'authenticated');
