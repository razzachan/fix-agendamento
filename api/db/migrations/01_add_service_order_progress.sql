-- Adicionar novos campos à tabela service_orders
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS last_progress_id UUID;

-- Criar tabela de progresso de ordens de serviço
CREATE TABLE IF NOT EXISTS service_order_progress (
  id UUID PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT NOT NULL,
  
  -- Índices para melhorar a performance de consultas
  CONSTRAINT fk_service_order FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE
);

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_service_order_progress_service_order_id ON service_order_progress(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_progress_created_at ON service_order_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_last_progress_id ON service_orders(last_progress_id);

-- Criar função para atualizar o last_progress_id na tabela service_orders
CREATE OR REPLACE FUNCTION update_service_order_last_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_orders
  SET last_progress_id = NEW.id
  WHERE id = NEW.service_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente o last_progress_id
DROP TRIGGER IF EXISTS trigger_update_service_order_last_progress ON service_order_progress;
CREATE TRIGGER trigger_update_service_order_last_progress
AFTER INSERT ON service_order_progress
FOR EACH ROW
EXECUTE FUNCTION update_service_order_last_progress();

-- Criar função para validar transições de status
CREATE OR REPLACE FUNCTION validate_service_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transition BOOLEAN := FALSE;
BEGIN
  -- Se o status não mudou, permitir a atualização
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Definir transições válidas para cada status
  CASE OLD.status
    WHEN 'pending' THEN
      valid_transition := NEW.status IN ('scheduled', 'in_progress', 'diagnosis', 'canceled');
    WHEN 'scheduled' THEN
      valid_transition := NEW.status IN ('in_progress', 'diagnosis', 'canceled');
    WHEN 'in_progress' THEN
      valid_transition := NEW.status IN ('diagnosis', 'awaiting_parts', 'awaiting_approval', 'repair', 'testing', 'completed', 'canceled', 'returned');
    WHEN 'diagnosis' THEN
      valid_transition := NEW.status IN ('awaiting_parts', 'awaiting_approval', 'repair', 'testing', 'completed', 'canceled', 'returned');
    WHEN 'awaiting_parts' THEN
      valid_transition := NEW.status IN ('repair', 'canceled', 'returned');
    WHEN 'awaiting_approval' THEN
      valid_transition := NEW.status IN ('repair', 'canceled', 'returned');
    WHEN 'repair' THEN
      valid_transition := NEW.status IN ('testing', 'completed', 'canceled');
    WHEN 'testing' THEN
      valid_transition := NEW.status IN ('repair', 'completed', 'canceled');
    WHEN 'completed' THEN
      valid_transition := NEW.status IN ('delivered', 'returned');
    WHEN 'delivered' THEN
      valid_transition := FALSE;
    WHEN 'canceled' THEN
      valid_transition := FALSE;
    WHEN 'returned' THEN
      valid_transition := FALSE;
    ELSE
      valid_transition := FALSE;
  END CASE;
  
  -- Se a transição não for válida, lançar um erro
  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar transições de status
DROP TRIGGER IF EXISTS trigger_validate_service_order_status_transition ON service_orders;
CREATE TRIGGER trigger_validate_service_order_status_transition
BEFORE UPDATE OF status ON service_orders
FOR EACH ROW
EXECUTE FUNCTION validate_service_order_status_transition();

-- Adicionar comentários às tabelas e colunas para documentação
COMMENT ON TABLE service_order_progress IS 'Histórico de progresso das ordens de serviço';
COMMENT ON COLUMN service_order_progress.id IS 'Identificador único do registro de progresso';
COMMENT ON COLUMN service_order_progress.service_order_id IS 'Referência à ordem de serviço';
COMMENT ON COLUMN service_order_progress.status IS 'Status da ordem de serviço neste ponto do progresso';
COMMENT ON COLUMN service_order_progress.notes IS 'Notas ou observações sobre esta mudança de status';
COMMENT ON COLUMN service_order_progress.created_at IS 'Data e hora em que o registro foi criado';
COMMENT ON COLUMN service_order_progress.created_by IS 'Usuário ou sistema que criou o registro';

COMMENT ON COLUMN service_orders.cancellation_reason IS 'Motivo do cancelamento da ordem de serviço';
COMMENT ON COLUMN service_orders.last_progress_id IS 'Referência ao último registro de progresso';
