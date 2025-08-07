-- Tabela para armazenar sessões de tracking do Google Ads
-- Captura parâmetros GCLID e UTM quando usuário acessa o site

CREATE TABLE IF NOT EXISTS google_ads_tracking_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Parâmetros de tracking
    gclid TEXT, -- Google Click ID (mais importante)
    utm_source TEXT, -- Fonte do tráfego (google, facebook, etc)
    utm_medium TEXT, -- Meio (cpc, organic, email, etc)
    utm_campaign TEXT, -- Nome da campanha
    utm_term TEXT, -- Termo de pesquisa
    utm_content TEXT, -- Conteúdo do anúncio
    
    -- Dados da sessão
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    referer TEXT,
    request_url TEXT,
    session_active BOOLEAN DEFAULT TRUE,
    
    -- Dados de conversão (quando aplicável)
    converted BOOLEAN DEFAULT FALSE,
    conversion_type TEXT, -- 'agendamento', 'servico_concluido', etc
    service_order_id UUID REFERENCES service_orders(id),
    conversion_value DECIMAL(10,2),
    converted_at TIMESTAMPTZ,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_gclid ON google_ads_tracking_sessions(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_utm_source ON google_ads_tracking_sessions(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_captured_at ON google_ads_tracking_sessions(captured_at);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_active ON google_ads_tracking_sessions(session_active) WHERE session_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_ip ON google_ads_tracking_sessions(ip_address) WHERE ip_address IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tracking_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tracking_sessions_updated_at
    BEFORE UPDATE ON google_ads_tracking_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_tracking_sessions_updated_at();

-- Política RLS (Row Level Security)
ALTER TABLE google_ads_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Permitir acesso completo para usuários autenticados
CREATE POLICY "Allow full access for authenticated users" ON google_ads_tracking_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Permitir inserção para usuários anônimos (captura de tracking)
CREATE POLICY "Allow insert for anonymous users" ON google_ads_tracking_sessions
    FOR INSERT WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE google_ads_tracking_sessions IS 'Armazena sessões de tracking do Google Ads com parâmetros GCLID e UTM';
COMMENT ON COLUMN google_ads_tracking_sessions.gclid IS 'Google Click ID - identificador único do clique no Google Ads';
COMMENT ON COLUMN google_ads_tracking_sessions.utm_source IS 'Fonte do tráfego (google, facebook, direct, etc)';
COMMENT ON COLUMN google_ads_tracking_sessions.utm_campaign IS 'Nome da campanha publicitária';
COMMENT ON COLUMN google_ads_tracking_sessions.session_active IS 'Indica se a sessão ainda está ativa (últimas 24h)';
COMMENT ON COLUMN google_ads_tracking_sessions.converted IS 'Indica se esta sessão resultou em conversão';
COMMENT ON COLUMN google_ads_tracking_sessions.conversion_type IS 'Tipo de conversão: agendamento, servico_concluido, etc';

-- View para relatórios de tracking
CREATE OR REPLACE VIEW google_ads_tracking_report AS
SELECT 
    DATE(captured_at) as tracking_date,
    utm_source,
    utm_campaign,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN gclid IS NOT NULL THEN 1 END) as google_ads_sessions,
    COUNT(CASE WHEN converted = TRUE THEN 1 END) as conversions,
    ROUND(
        COUNT(CASE WHEN converted = TRUE THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(CASE WHEN gclid IS NOT NULL THEN 1 END), 0) * 100, 
        2
    ) as conversion_rate,
    SUM(conversion_value) as total_conversion_value
FROM google_ads_tracking_sessions
WHERE captured_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(captured_at), utm_source, utm_campaign
ORDER BY tracking_date DESC, total_sessions DESC;

COMMENT ON VIEW google_ads_tracking_report IS 'Relatório de performance de tracking do Google Ads dos últimos 30 dias';
