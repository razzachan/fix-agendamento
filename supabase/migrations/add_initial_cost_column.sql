-- Adicionar coluna initial_cost na tabela service_orders
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar a coluna initial_cost
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS initial_cost DECIMAL(10,2) DEFAULT 0;

-- 2. Comentário para documentação
COMMENT ON COLUMN service_orders.initial_cost IS 'Valor inicial pago (sinal para coleta diagnóstico)';
COMMENT ON COLUMN service_orders.final_cost IS 'Valor final total do serviço (inicial + adicional)';

-- 3. Migrar dados existentes para coleta diagnóstico
-- Para ordens de coleta diagnóstico existentes, definir initial_cost baseado no final_cost
UPDATE service_orders 
SET initial_cost = CASE 
  WHEN service_attendance_type = 'coleta_diagnostico' AND final_cost > 0 THEN 
    LEAST(final_cost, 350.00) -- Usar o menor valor entre final_cost e R$ 350,00
  ELSE 0
END
WHERE initial_cost IS NULL OR initial_cost = 0;

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_service_orders_initial_cost ON service_orders(initial_cost);

-- 5. Verificar os dados migrados
SELECT 
  service_attendance_type,
  COUNT(*) as total_orders,
  AVG(initial_cost) as avg_initial_cost,
  AVG(final_cost) as avg_final_cost
FROM service_orders 
GROUP BY service_attendance_type
ORDER BY service_attendance_type;
