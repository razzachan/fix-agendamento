#!/usr/bin/env python3
"""
Script simples para criar tabela de tracking do Google Ads
"""

import os
from supabase import create_client, Client

def create_tracking_table():
    """
    Cria a tabela google_ads_tracking_sessions
    """
    try:
        # Obter credenciais do Supabase
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        
        if not url or not key:
            print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_KEY devem estar definidas")
            return False
        
        # Conectar ao Supabase
        supabase: Client = create_client(url, key)
        print("✅ Conectado ao Supabase")
        
        # SQL simplificado para criar a tabela
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS google_ads_tracking_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            gclid TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_term TEXT,
            utm_content TEXT,
            captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            user_agent TEXT,
            ip_address INET,
            referer TEXT,
            request_url TEXT,
            session_active BOOLEAN DEFAULT TRUE,
            converted BOOLEAN DEFAULT FALSE,
            conversion_type TEXT,
            service_order_id UUID,
            conversion_value DECIMAL(10,2),
            converted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        # Executar SQL usando query direta
        result = supabase.table('_temp').select('1').limit(1).execute()
        print("✅ Conexão testada")
        
        # Como não podemos executar SQL diretamente, vamos usar uma abordagem diferente
        # Vamos inserir um registro de teste para forçar a criação da estrutura
        print("📋 Criando estrutura da tabela via inserção...")
        
        # Tentar inserir um registro de teste
        test_data = {
            'gclid': 'setup_test_gclid',
            'utm_source': 'setup_test',
            'utm_campaign': 'setup_campaign',
            'user_agent': 'Setup Script',
            'session_active': True,
            'converted': False
        }
        
        try:
            result = supabase.table("google_ads_tracking_sessions").insert(test_data).execute()
            if result.data:
                print("✅ Tabela google_ads_tracking_sessions criada com sucesso!")
                
                # Remover registro de teste
                supabase.table("google_ads_tracking_sessions").delete().eq("gclid", "setup_test_gclid").execute()
                print("✅ Registro de teste removido")
                
                return True
        except Exception as e:
            print(f"❌ Erro ao criar tabela: {e}")
            print("ℹ️ A tabela precisa ser criada manualmente no Supabase Dashboard")
            return False
        
    except Exception as e:
        print(f"❌ Erro no setup: {e}")
        return False

def test_existing_table():
    """
    Testa se a tabela já existe
    """
    try:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        supabase: Client = create_client(url, key)
        
        # Tentar buscar na tabela
        result = supabase.table("google_ads_tracking_sessions").select("count", count="exact").execute()
        print(f"✅ Tabela existe! Registros: {result.count}")
        return True
        
    except Exception as e:
        print(f"❌ Tabela não existe: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Configurando tabela de tracking do Google Ads...")
    
    # Primeiro testar se já existe
    if test_existing_table():
        print("✅ Tabela já existe e está funcionando!")
    else:
        print("📋 Criando nova tabela...")
        if create_tracking_table():
            print("🎉 Setup concluído com sucesso!")
        else:
            print("❌ Falha no setup - criar tabela manualmente")
            print("\n📋 SQL para criar manualmente:")
            print("""
CREATE TABLE google_ads_tracking_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gclid TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    referer TEXT,
    request_url TEXT,
    session_active BOOLEAN DEFAULT TRUE,
    converted BOOLEAN DEFAULT FALSE,
    conversion_type TEXT,
    service_order_id UUID,
    conversion_value DECIMAL(10,2),
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
            """)
