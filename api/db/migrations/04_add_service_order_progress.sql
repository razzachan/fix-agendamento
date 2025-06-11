-- Criar tabela para rastrear o progresso das ordens de serviço
CREATE TABLE IF NOT EXISTS service_order_progress (
  id UUID PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  
  CONSTRAINT fk_service_order FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);
