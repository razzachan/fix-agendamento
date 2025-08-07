#!/usr/bin/env python3
"""
Script para criar tabela usando API REST do Supabase diretamente
"""

import requests
import json
import os

def create_table_via_api():
    """
    Cria tabela usando API REST do Supabase
    """
    try:
        # Credenciais
        url = "https://hdyucwabemspehokoiks.supabase.co"
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"
        
        # Headers
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }
        
        print("🚀 Tentando criar tabela via API REST...")
        
        # SQL para criar a tabela
        sql_query = """
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
        
        # Tentar via RPC (se existir função)
        rpc_url = f"{url}/rest/v1/rpc/exec_sql"
        rpc_data = {"sql": sql_query.strip()}
        
        print("📡 Tentando via RPC exec_sql...")
        response = requests.post(rpc_url, headers=headers, json=rpc_data)
        
        if response.status_code == 200:
            print("✅ Tabela criada via RPC!")
            return True
        else:
            print(f"❌ RPC falhou: {response.status_code} - {response.text}")
        
        # Tentar inserir um registro de teste para forçar criação
        print("📋 Tentando criar via inserção de teste...")
        
        insert_url = f"{url}/rest/v1/google_ads_tracking_sessions"
        test_data = {
            "gclid": "test_setup_123",
            "utm_source": "test",
            "utm_campaign": "setup",
            "user_agent": "Setup Script",
            "session_active": True
        }
        
        response = requests.post(insert_url, headers=headers, json=test_data)
        
        if response.status_code in [200, 201]:
            print("✅ Tabela criada via inserção!")
            
            # Remover registro de teste
            delete_url = f"{url}/rest/v1/google_ads_tracking_sessions?gclid=eq.test_setup_123"
            requests.delete(delete_url, headers=headers)
            print("✅ Registro de teste removido")
            
            return True
        else:
            print(f"❌ Inserção falhou: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_table():
    """
    Testa se a tabela existe e funciona
    """
    try:
        url = "https://hdyucwabemspehokoiks.supabase.co"
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"
        
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }
        
        # Testar busca na tabela
        test_url = f"{url}/rest/v1/google_ads_tracking_sessions?select=count"
        response = requests.get(test_url, headers=headers)
        
        if response.status_code == 200:
            print("✅ Tabela existe e está acessível!")
            return True
        else:
            print(f"❌ Tabela não acessível: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

if __name__ == "__main__":
    print("🎯 Configurando tabela Google Ads Tracking via API...")
    
    # Primeiro testar se já existe
    if test_table():
        print("🎉 Tabela já existe e funciona!")
    else:
        print("📋 Criando tabela...")
        if create_table_via_api():
            print("🎉 Tabela criada com sucesso!")
            if test_table():
                print("✅ Teste final passou!")
            else:
                print("⚠️ Tabela criada mas teste falhou")
        else:
            print("❌ Falha ao criar tabela")
            print("\n💡 SOLUÇÃO MANUAL:")
            print("1. Acesse: https://hdyucwabemspehokoiks.supabase.co/project/hdyucwabemspehokoiks/editor")
            print("2. Vá em SQL Editor")
            print("3. Execute este SQL:")
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
