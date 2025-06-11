-- =====================================================
-- SISTEMA DE ESTOQUE MÓVEL PARA TÉCNICOS
-- EletroFix Hub Pro - Junho 2025
-- =====================================================

-- 1. TABELA: technician_stock_items
-- Cadastro de itens que os técnicos podem carregar
CREATE TABLE IF NOT EXISTS technician_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'fusivel', 'resistencia', 'termostato', 'cabo', 'ferramenta'
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  weight_kg DECIMAL(8,3), -- peso para cálculo de capacidade da van
  dimensions VARCHAR(100), -- dimensões para organização
  supplier VARCHAR(200),
  supplier_code VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA: technician_stock
-- Estoque atual de cada técnico
CREATE TABLE IF NOT EXISTS technician_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  current_quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0, -- estoque mínimo para alerta
  max_quantity INTEGER NOT NULL DEFAULT 0, -- capacidade máxima da van
  location_in_vehicle VARCHAR(100), -- 'gaveta-a', 'prateleira-1', 'porta-lateral'
  last_updated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(technician_id, item_id)
);

-- 3. TABELA: technician_stock_movements
-- Histórico de movimentações do estoque
CREATE TABLE IF NOT EXISTS technician_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason VARCHAR(500),
  service_order_id UUID REFERENCES service_orders(id), -- se foi usado em uma OS
  location VARCHAR(200), -- onde aconteceu a movimentação
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA: technician_stock_requests
-- Solicitações de reposição de estoque
CREATE TABLE IF NOT EXISTS technician_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES technician_stock_items(id),
  requested_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  reason VARCHAR(500),
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'delivered', 'cancelled'
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMP,
  notes TEXT
);

-- 5. TABELA: technician_vehicles
-- Informações dos veículos dos técnicos
CREATE TABLE IF NOT EXISTS technician_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  vehicle_type VARCHAR(50) NOT NULL, -- 'van', 'pickup', 'carro', 'moto'
  brand VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  plate VARCHAR(20),
  max_weight_kg DECIMAL(8,2),
  storage_capacity_m3 DECIMAL(8,3),
  storage_layout TEXT, -- JSON com layout das gavetas/prateleiras
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_technician_stock_technician_id ON technician_stock(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_stock_item_id ON technician_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_technician_stock_movements_technician_id ON technician_stock_movements(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_stock_movements_created_at ON technician_stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_technician_stock_requests_technician_id ON technician_stock_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_stock_requests_status ON technician_stock_requests(status);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_technician_stock_items_updated_at 
    BEFORE UPDATE ON technician_stock_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS (MOCK DATA)
-- =====================================================

-- Itens básicos que técnicos costumam carregar
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

-- Exemplo de veículo para técnico
-- (Será inserido quando o técnico cadastrar seu veículo)

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para estoque atual com informações dos itens
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

-- View para alertas de estoque baixo
CREATE OR REPLACE VIEW v_technician_stock_alerts AS
SELECT 
    technician_id,
    technician_email,
    code,
    name,
    category,
    current_quantity,
    min_quantity,
    (min_quantity - current_quantity) as quantity_needed,
    stock_status,
    last_updated
FROM v_technician_stock_current
WHERE stock_status IN ('out_of_stock', 'low_stock')
ORDER BY 
    CASE stock_status 
        WHEN 'out_of_stock' THEN 1 
        WHEN 'low_stock' THEN 2 
    END,
    last_updated DESC;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE technician_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_vehicles ENABLE ROW LEVEL SECURITY;

-- Políticas para technician_stock_items (todos podem ver)
CREATE POLICY "Todos podem ver itens de estoque" ON technician_stock_items
    FOR SELECT USING (true);

-- Políticas para technician_stock (técnicos veem apenas seu estoque)
CREATE POLICY "Técnicos veem apenas seu estoque" ON technician_stock
    FOR ALL USING (auth.uid() = technician_id);

-- Políticas para technician_stock_movements (técnicos veem apenas suas movimentações)
CREATE POLICY "Técnicos veem apenas suas movimentações" ON technician_stock_movements
    FOR ALL USING (auth.uid() = technician_id OR auth.uid() = created_by);

-- Políticas para technician_stock_requests (técnicos veem apenas suas solicitações)
CREATE POLICY "Técnicos veem apenas suas solicitações" ON technician_stock_requests
    FOR ALL USING (auth.uid() = technician_id);

-- Políticas para technician_vehicles (técnicos veem apenas seus veículos)
CREATE POLICY "Técnicos veem apenas seus veículos" ON technician_vehicles
    FOR ALL USING (auth.uid() = technician_id);

-- Admins podem ver tudo
CREATE POLICY "Admins podem ver tudo - stock" ON technician_stock
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins podem ver tudo - movements" ON technician_stock_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins podem ver tudo - requests" ON technician_stock_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'role' = 'admin'
        )
    );

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON TABLE technician_stock_items IS 'Catálogo de itens que técnicos podem carregar em seus veículos';
COMMENT ON TABLE technician_stock IS 'Estoque atual de cada técnico por item';
COMMENT ON TABLE technician_stock_movements IS 'Histórico de todas as movimentações de estoque';
COMMENT ON TABLE technician_stock_requests IS 'Solicitações de reposição de estoque dos técnicos';
COMMENT ON TABLE technician_vehicles IS 'Informações dos veículos dos técnicos para gestão de capacidade';
