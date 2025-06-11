-- Adicionar campos de garantia à tabela service_orders
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
ADD COLUMN IF NOT EXISTS related_warranty_order_id UUID REFERENCES service_orders(id);

-- Criar tabela para rastrear serviços realizados em garantia
CREATE TABLE IF NOT EXISTS warranty_services (
  id UUID PRIMARY KEY,
  original_order_id UUID NOT NULL REFERENCES service_orders(id),
  warranty_order_id UUID NOT NULL REFERENCES service_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  
  CONSTRAINT fk_original_order FOREIGN KEY (original_order_id) REFERENCES service_orders(id),
  CONSTRAINT fk_warranty_order FOREIGN KEY (warranty_order_id) REFERENCES service_orders(id)
);
