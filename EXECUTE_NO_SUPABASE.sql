-- =====================================================
-- 🚀 EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Sistema de Estoque Móvel - EletroFix Hub Pro
-- =====================================================

-- 1. TABELA: technician_stock_items
CREATE TABLE IF NOT EXISTS technician_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  weight_kg DECIMAL(8,3),
  dimensions VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA: technician_stock
CREATE TABLE IF NOT EXISTS technician_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  current_quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  max_quantity INTEGER NOT NULL DEFAULT 0,
  location_in_vehicle VARCHAR(100),
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(technician_id, item_id)
);

-- 3. TABELA: technician_stock_movements
CREATE TABLE IF NOT EXISTS technician_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  movement_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason VARCHAR(500),
  service_order_id UUID REFERENCES service_orders(id),
  location VARCHAR(200),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA: technician_stock_requests
CREATE TABLE IF NOT EXISTS technician_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  requested_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  reason VARCHAR(500),
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMP,
  notes TEXT
);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_technician_stock_technician_id ON technician_stock(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_stock_item_id ON technician_stock(item_id);

-- 6. VIEW PRINCIPAL
CREATE OR REPLACE VIEW v_technician_stock_current AS
SELECT 
    ts.technician_id,
    u.email as technician_email,
    tsi.code,
    tsi.name,
    tsi.category,
    ts.current_quantity,
    ts.min_quantity,
    ts.max_quantity,
    ts.location_in_vehicle,
    tsi.unit_cost,
    tsi.sale_price,
    (ts.current_quantity * tsi.sale_price) as total_value,
    CASE 
        WHEN ts.current_quantity = 0 THEN 'out_of_stock'
        WHEN ts.current_quantity <= ts.min_quantity THEN 'low_stock'
        WHEN ts.current_quantity >= ts.max_quantity THEN 'full_stock'
        ELSE 'normal'
    END as stock_status,
    ts.last_updated
FROM technician_stock ts
JOIN technician_stock_items tsi ON ts.item_id = tsi.id
JOIN auth.users u ON ts.technician_id = u.id
WHERE tsi.is_active = true;

-- 7. RLS POLICIES
ALTER TABLE technician_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver itens de estoque" ON technician_stock_items FOR SELECT USING (true);
CREATE POLICY "Técnicos veem apenas seu estoque" ON technician_stock FOR ALL USING (auth.uid() = technician_id);
CREATE POLICY "Técnicos veem apenas suas movimentações" ON technician_stock_movements FOR ALL USING (auth.uid() = technician_id OR auth.uid() = created_by);
CREATE POLICY "Técnicos veem apenas suas solicitações" ON technician_stock_requests FOR ALL USING (auth.uid() = technician_id);

-- 8. DADOS INICIAIS
INSERT INTO technician_stock_items (code, name, description, category, unit_cost, sale_price, weight_kg, dimensions) VALUES
('FUS15A', 'Fusível 15A', 'Fusível cerâmico 15A para proteção', 'fusivel', 3.50, 8.50, 0.010, '2x1x1cm'),
('FUS20A', 'Fusível 20A', 'Fusível cerâmico 20A para proteção', 'fusivel', 4.00, 9.00, 0.012, '2x1x1cm'),
('RES220-1500', 'Resistência 220V 1500W', 'Resistência para forno elétrico 220V 1500W', 'resistencia', 25.00, 45.90, 0.300, '15x5x3cm'),
('RES220-2000', 'Resistência 220V 2000W', 'Resistência para forno elétrico 220V 2000W', 'resistencia', 30.00, 55.90, 0.350, '18x5x3cm'),
('TERM-UNIV', 'Termostato Universal', 'Termostato universal para fornos', 'termostato', 45.00, 89.90, 0.150, '8x6x4cm'),
('CABO-PP-2X25', 'Cabo PP 2x2,5mm', 'Cabo flexível PP 2x2,5mm por metro', 'cabo', 8.50, 15.90, 0.080, '100cm'),
('CABO-PP-3X25', 'Cabo PP 3x2,5mm', 'Cabo flexível PP 3x2,5mm por metro', 'cabo', 12.00, 22.90, 0.120, '100cm'),
('CHAVE-FENDA-6', 'Chave Fenda 6mm', 'Chave de fenda 6mm cabo isolado', 'ferramenta', 15.00, 25.00, 0.200, '25x3x2cm'),
('CHAVE-PHILLIPS-2', 'Chave Phillips #2', 'Chave Phillips #2 cabo isolado', 'ferramenta', 18.00, 28.00, 0.180, '25x3x2cm'),
('MULTIMETRO-BASIC', 'Multímetro Básico', 'Multímetro digital básico', 'ferramenta', 85.00, 150.00, 0.400, '15x8x5cm')
ON CONFLICT (code) DO NOTHING;

-- 9. ESTOQUE INICIAL PARA PEDRO SANTOS
-- Buscar ID do Pedro Santos e criar estoque inicial
DO $$
DECLARE
    pedro_id UUID;
    item_record RECORD;
BEGIN
    -- Buscar ID do Pedro Santos (técnico logado)
    SELECT id INTO pedro_id FROM auth.users 
    WHERE email ILIKE '%pedro%' OR raw_user_meta_data->>'name' ILIKE '%Pedro%' 
    LIMIT 1;
    
    IF pedro_id IS NOT NULL THEN
        -- Adicionar estoque inicial para Pedro
        FOR item_record IN SELECT id, code FROM technician_stock_items LOOP
            INSERT INTO technician_stock (technician_id, item_id, current_quantity, min_quantity, max_quantity, location_in_vehicle)
            VALUES (
                pedro_id, 
                item_record.id, 
                CASE 
                    WHEN item_record.code LIKE 'FUS%' THEN 10
                    WHEN item_record.code LIKE 'RES%' THEN 3
                    WHEN item_record.code LIKE 'TERM%' THEN 2
                    WHEN item_record.code LIKE 'CABO%' THEN 50
                    WHEN item_record.code LIKE 'CHAVE%' THEN 1
                    WHEN item_record.code LIKE 'MULTI%' THEN 1
                    ELSE 5
                END,
                CASE 
                    WHEN item_record.code LIKE 'FUS%' THEN 5
                    WHEN item_record.code LIKE 'RES%' THEN 1
                    WHEN item_record.code LIKE 'TERM%' THEN 1
                    WHEN item_record.code LIKE 'CABO%' THEN 20
                    WHEN item_record.code LIKE 'CHAVE%' THEN 1
                    WHEN item_record.code LIKE 'MULTI%' THEN 1
                    ELSE 2
                END,
                CASE 
                    WHEN item_record.code LIKE 'FUS%' THEN 20
                    WHEN item_record.code LIKE 'RES%' THEN 5
                    WHEN item_record.code LIKE 'TERM%' THEN 3
                    WHEN item_record.code LIKE 'CABO%' THEN 100
                    WHEN item_record.code LIKE 'CHAVE%' THEN 2
                    WHEN item_record.code LIKE 'MULTI%' THEN 1
                    ELSE 10
                END,
                CASE 
                    WHEN item_record.code LIKE 'FUS%' THEN 'Gaveta A'
                    WHEN item_record.code LIKE 'RES%' THEN 'Prateleira 1'
                    WHEN item_record.code LIKE 'TERM%' THEN 'Prateleira 1'
                    WHEN item_record.code LIKE 'CABO%' THEN 'Gaveta B'
                    WHEN item_record.code LIKE 'CHAVE%' THEN 'Caixa Ferramentas'
                    WHEN item_record.code LIKE 'MULTI%' THEN 'Caixa Ferramentas'
                    ELSE 'Gaveta C'
                END
            ) ON CONFLICT (technician_id, item_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Estoque inicial criado para técnico Pedro Santos (ID: %)', pedro_id;
    ELSE
        RAISE NOTICE 'Técnico Pedro Santos não encontrado. Verifique o email/nome do usuário.';
    END IF;
END $$;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO!
-- Após executar, atualize a página do sistema
-- =====================================================
