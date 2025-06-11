-- =====================================================
-- MIGRAÇÃO: FUNCIONALIDADES AVANÇADAS PARA TÉCNICOS
-- =====================================================
-- Criação das tabelas para:
-- 1. Check-in/Check-out com geolocalização
-- 2. Upload de fotos do serviço
-- 3. Relatórios de produtividade pessoal
-- =====================================================

-- 1. TABELA DE CHECK-IN/CHECK-OUT
-- =====================================================
CREATE TABLE IF NOT EXISTS technician_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check-in data
    checkin_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checkin_latitude DECIMAL(10, 8) NOT NULL,
    checkin_longitude DECIMAL(11, 8) NOT NULL,
    checkin_address TEXT,
    checkin_accuracy DECIMAL(5, 2), -- Precisão do GPS em metros
    
    -- Check-out data
    checkout_timestamp TIMESTAMPTZ,
    checkout_latitude DECIMAL(10, 8),
    checkout_longitude DECIMAL(11, 8),
    checkout_address TEXT,
    checkout_accuracy DECIMAL(5, 2),
    
    -- Métricas calculadas
    total_duration_minutes INTEGER, -- Duração total em minutos
    distance_from_address_meters DECIMAL(8, 2), -- Distância do endereço oficial
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT unique_checkin_per_order UNIQUE(service_order_id, technician_id)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_technician_checkins_service_order ON technician_checkins(service_order_id);
CREATE INDEX IF NOT EXISTS idx_technician_checkins_technician ON technician_checkins(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_checkins_timestamp ON technician_checkins(checkin_timestamp);

-- =====================================================
-- 2. TABELA DE FOTOS DO SERVIÇO
-- =====================================================
CREATE TABLE IF NOT EXISTS service_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da foto
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Caminho no Supabase Storage
    file_size INTEGER, -- Tamanho em bytes
    mime_type TEXT DEFAULT 'image/jpeg',
    
    -- Categorização
    photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'evidence', 'document')),
    description TEXT,
    
    -- Metadados técnicos
    width INTEGER,
    height INTEGER,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Geolocalização da foto
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Controle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_service_photos_service_order ON service_photos(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_technician ON service_photos(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_type ON service_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_service_photos_taken_at ON service_photos(taken_at);

-- =====================================================
-- 3. TABELA DE MÉTRICAS DE PRODUTIVIDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS technician_productivity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Período da métrica
    metric_date DATE NOT NULL,
    metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Métricas de produtividade
    orders_completed INTEGER DEFAULT 0,
    orders_started INTEGER DEFAULT 0,
    total_work_hours DECIMAL(5, 2) DEFAULT 0,
    average_service_time_minutes DECIMAL(6, 2) DEFAULT 0,
    
    -- Métricas de qualidade
    customer_satisfaction_avg DECIMAL(3, 2), -- Média de 0 a 5
    on_time_arrivals INTEGER DEFAULT 0,
    late_arrivals INTEGER DEFAULT 0,
    punctuality_rate DECIMAL(5, 2), -- Percentual de pontualidade
    
    -- Métricas de eficiência
    total_distance_km DECIMAL(8, 2) DEFAULT 0,
    optimized_distance_km DECIMAL(8, 2) DEFAULT 0,
    route_efficiency_rate DECIMAL(5, 2), -- % de eficiência da rota
    
    -- Métricas financeiras
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    average_order_value DECIMAL(8, 2) DEFAULT 0,
    
    -- Controle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    CONSTRAINT unique_technician_metric_period UNIQUE(technician_id, metric_date, metric_period)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_technician ON technician_productivity_metrics(technician_id);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_date ON technician_productivity_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_period ON technician_productivity_metrics(metric_period);

-- =====================================================
-- 4. TABELA DE AVALIAÇÕES DE CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Avaliações (1-5 estrelas)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    -- Feedback textual
    comment TEXT,
    would_recommend BOOLEAN,
    
    -- Controle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar múltiplas avaliações
    CONSTRAINT unique_rating_per_order UNIQUE(service_order_id)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_customer_ratings_service_order ON customer_ratings(service_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_technician ON customer_ratings(technician_id);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_overall ON customer_ratings(overall_rating);

-- =====================================================
-- 5. FUNÇÕES PARA CÁLCULO AUTOMÁTICO DE MÉTRICAS
-- =====================================================

-- Função para calcular métricas diárias
CREATE OR REPLACE FUNCTION calculate_daily_productivity_metrics(
    p_technician_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
    v_orders_completed INTEGER;
    v_orders_started INTEGER;
    v_total_work_hours DECIMAL(5,2);
    v_avg_service_time DECIMAL(6,2);
    v_customer_satisfaction DECIMAL(3,2);
    v_on_time INTEGER;
    v_late INTEGER;
    v_punctuality_rate DECIMAL(5,2);
    v_total_distance DECIMAL(8,2);
    v_total_revenue DECIMAL(10,2);
    v_avg_order_value DECIMAL(8,2);
BEGIN
    -- Calcular ordens concluídas
    SELECT COUNT(*) INTO v_orders_completed
    FROM service_orders 
    WHERE technician_id = p_technician_id 
    AND DATE(updated_at) = p_date 
    AND status = 'completed';
    
    -- Calcular ordens iniciadas
    SELECT COUNT(*) INTO v_orders_started
    FROM technician_checkins 
    WHERE technician_id = p_technician_id 
    AND DATE(checkin_timestamp) = p_date;
    
    -- Calcular horas trabalhadas
    SELECT COALESCE(SUM(total_duration_minutes), 0) / 60.0 INTO v_total_work_hours
    FROM technician_checkins 
    WHERE technician_id = p_technician_id 
    AND DATE(checkin_timestamp) = p_date
    AND checkout_timestamp IS NOT NULL;
    
    -- Calcular tempo médio de serviço
    SELECT COALESCE(AVG(total_duration_minutes), 0) INTO v_avg_service_time
    FROM technician_checkins 
    WHERE technician_id = p_technician_id 
    AND DATE(checkin_timestamp) = p_date
    AND checkout_timestamp IS NOT NULL;
    
    -- Calcular satisfação do cliente
    SELECT COALESCE(AVG(overall_rating), 0) INTO v_customer_satisfaction
    FROM customer_ratings cr
    JOIN service_orders so ON cr.service_order_id = so.id
    WHERE cr.technician_id = p_technician_id 
    AND DATE(cr.created_at) = p_date;
    
    -- Calcular pontualidade (implementação simplificada)
    v_on_time := v_orders_started; -- Assumindo que chegou no horário
    v_late := 0;
    v_punctuality_rate := CASE WHEN v_orders_started > 0 THEN (v_on_time::DECIMAL / v_orders_started) * 100 ELSE 0 END;
    
    -- Calcular receita total
    SELECT COALESCE(SUM(CAST(order_value AS DECIMAL)), 0) INTO v_total_revenue
    FROM service_orders 
    WHERE technician_id = p_technician_id 
    AND DATE(updated_at) = p_date 
    AND status = 'completed';
    
    -- Calcular valor médio por ordem
    v_avg_order_value := CASE WHEN v_orders_completed > 0 THEN v_total_revenue / v_orders_completed ELSE 0 END;
    
    -- Inserir ou atualizar métricas
    INSERT INTO technician_productivity_metrics (
        technician_id, metric_date, metric_period,
        orders_completed, orders_started, total_work_hours, average_service_time_minutes,
        customer_satisfaction_avg, on_time_arrivals, late_arrivals, punctuality_rate,
        total_revenue, average_order_value
    ) VALUES (
        p_technician_id, p_date, 'daily',
        v_orders_completed, v_orders_started, v_total_work_hours, v_avg_service_time,
        v_customer_satisfaction, v_on_time, v_late, v_punctuality_rate,
        v_total_revenue, v_avg_order_value
    )
    ON CONFLICT (technician_id, metric_date, metric_period)
    DO UPDATE SET
        orders_completed = EXCLUDED.orders_completed,
        orders_started = EXCLUDED.orders_started,
        total_work_hours = EXCLUDED.total_work_hours,
        average_service_time_minutes = EXCLUDED.average_service_time_minutes,
        customer_satisfaction_avg = EXCLUDED.customer_satisfaction_avg,
        on_time_arrivals = EXCLUDED.on_time_arrivals,
        late_arrivals = EXCLUDED.late_arrivals,
        punctuality_rate = EXCLUDED.punctuality_rate,
        total_revenue = EXCLUDED.total_revenue,
        average_order_value = EXCLUDED.average_order_value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar métricas quando check-out é feito
CREATE OR REPLACE FUNCTION update_productivity_on_checkout() RETURNS TRIGGER AS $$
BEGIN
    -- Calcular duração se check-out foi feito
    IF NEW.checkout_timestamp IS NOT NULL AND OLD.checkout_timestamp IS NULL THEN
        NEW.total_duration_minutes := EXTRACT(EPOCH FROM (NEW.checkout_timestamp - NEW.checkin_timestamp)) / 60;
        
        -- Recalcular métricas do dia
        PERFORM calculate_daily_productivity_metrics(NEW.technician_id, DATE(NEW.checkin_timestamp));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_productivity_on_checkout
    BEFORE UPDATE ON technician_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_productivity_on_checkout();

-- =====================================================
-- 7. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE technician_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas para technician_checkins
CREATE POLICY "Técnicos podem ver seus próprios check-ins" ON technician_checkins
    FOR SELECT USING (technician_id = auth.uid());

CREATE POLICY "Técnicos podem inserir seus próprios check-ins" ON technician_checkins
    FOR INSERT WITH CHECK (technician_id = auth.uid());

CREATE POLICY "Técnicos podem atualizar seus próprios check-ins" ON technician_checkins
    FOR UPDATE USING (technician_id = auth.uid());

-- Políticas para service_photos
CREATE POLICY "Técnicos podem ver fotos de suas ordens" ON service_photos
    FOR SELECT USING (technician_id = auth.uid());

CREATE POLICY "Técnicos podem inserir fotos em suas ordens" ON service_photos
    FOR INSERT WITH CHECK (technician_id = auth.uid());

-- Políticas para métricas de produtividade
CREATE POLICY "Técnicos podem ver suas próprias métricas" ON technician_productivity_metrics
    FOR SELECT USING (technician_id = auth.uid());

-- Políticas para avaliações
CREATE POLICY "Técnicos podem ver suas avaliações" ON customer_ratings
    FOR SELECT USING (technician_id = auth.uid());

-- =====================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE technician_checkins IS 'Registros de check-in e check-out dos técnicos com geolocalização';
COMMENT ON TABLE service_photos IS 'Fotos dos serviços organizadas por tipo e ordem de serviço';
COMMENT ON TABLE technician_productivity_metrics IS 'Métricas de produtividade calculadas automaticamente';
COMMENT ON TABLE customer_ratings IS 'Avaliações dos clientes sobre os serviços prestados';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
