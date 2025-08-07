#!/usr/bin/env python3
"""
Script para atualizar tabela de tracking para suportar múltiplos sites
Adiciona colunas: site_domain, site_name, business_name, business_type
"""

import requests
import json

def update_tracking_table():
    """
    Adiciona colunas para múltiplos sites na tabela existente
    """
    try:
        # Credenciais
        url = "https://hdyucwabemspehokoiks.supabase.co"
        service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"
        
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }
        
        print("🚀 Atualizando tabela para suportar múltiplos sites...")
        
        # Primeiro, testar se a tabela existe
        test_url = f"{url}/rest/v1/google_ads_tracking_sessions?select=count"
        response = requests.get(test_url, headers=headers)
        
        if response.status_code != 200:
            print("❌ Tabela não existe. Execute create_table_direct.py primeiro.")
            return False
        
        print("✅ Tabela existe. Verificando se precisa de atualização...")
        
        # Tentar inserir um registro com as novas colunas para testar
        test_data = {
            "gclid": "multisite_test_123",
            "utm_source": "test",
            "utm_campaign": "multisite_test",
            "user_agent": "Update Script",
            "session_active": True,
            # Novas colunas
            "site_domain": "test.fixeletros.com.br",
            "site_name": "Fix Eletros Test",
            "business_name": "Fix Eletros",
            "business_type": "assistencia_tecnica_test"
        }
        
        insert_url = f"{url}/rest/v1/google_ads_tracking_sessions"
        response = requests.post(insert_url, headers=headers, json=test_data)
        
        if response.status_code in [200, 201]:
            print("✅ Tabela já suporta múltiplos sites!")
            
            # Remover registro de teste
            delete_url = f"{url}/rest/v1/google_ads_tracking_sessions?gclid=eq.multisite_test_123"
            requests.delete(delete_url, headers=headers)
            print("✅ Registro de teste removido")
            
            return True
        else:
            print(f"⚠️ Tabela precisa ser atualizada: {response.status_code}")
            print("📋 Resposta:", response.text[:200])
            
            # Se falhou, significa que as colunas não existem
            print("\n💡 SOLUÇÃO MANUAL:")
            print("1. Acesse: https://hdyucwabemspehokoiks.supabase.co/project/hdyucwabemspehokoiks/editor")
            print("2. Vá em SQL Editor")
            print("3. Execute este SQL:")
            print("""
-- Adicionar colunas para múltiplos sites
ALTER TABLE google_ads_tracking_sessions 
ADD COLUMN IF NOT EXISTS site_domain TEXT,
ADD COLUMN IF NOT EXISTS site_name TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_site_domain 
ON google_ads_tracking_sessions(site_domain) WHERE site_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_business_type 
ON google_ads_tracking_sessions(business_type) WHERE business_type IS NOT NULL;

-- Comentários
COMMENT ON COLUMN google_ads_tracking_sessions.site_domain IS 'Domínio do site (www.fixfogoes.com.br ou fixeletros.com.br)';
COMMENT ON COLUMN google_ads_tracking_sessions.site_name IS 'Nome do site (Fix Fogões ou Fix Eletros)';
COMMENT ON COLUMN google_ads_tracking_sessions.business_name IS 'Nome do negócio';
COMMENT ON COLUMN google_ads_tracking_sessions.business_type IS 'Tipo de assistência técnica';
            """)
            
            return False
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_multisite_functionality():
    """
    Testa a funcionalidade de múltiplos sites
    """
    try:
        print("\n🧪 Testando funcionalidade de múltiplos sites...")
        
        # URLs dos middlewares
        middleware_url = "https://fix-agendamento-production.up.railway.app"
        
        # Teste 1: Fix Fogões
        print("1. Testando Fix Fogões...")
        fogoes_data = {
            "gclid": f"test_fogoes_{int(__import__('time').time())}",
            "utm_source": "google",
            "utm_campaign": "fogao_conserto",
            "site_domain": "www.fixfogoes.com.br",
            "site_name": "Fix Fogões",
            "business_name": "Fix Fogões",
            "business_type": "assistencia_tecnica_fogoes"
        }
        
        response = requests.post(
            f"{middleware_url}/sync-tracking",
            json=fogoes_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Fix Fogões: Tracking sincronizado")
        else:
            print(f"❌ Fix Fogões: Erro {response.status_code}")
        
        # Teste 2: Fix Eletros
        print("2. Testando Fix Eletros...")
        eletros_data = {
            "gclid": f"test_eletros_{int(__import__('time').time())}",
            "utm_source": "google",
            "utm_campaign": "eletrodomesticos_conserto",
            "site_domain": "fixeletros.com.br",
            "site_name": "Fix Eletros",
            "business_name": "Fix Eletros",
            "business_type": "assistencia_tecnica_eletros"
        }
        
        response = requests.post(
            f"{middleware_url}/sync-tracking",
            json=eletros_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Fix Eletros: Tracking sincronizado")
        else:
            print(f"❌ Fix Eletros: Erro {response.status_code}")
        
        # Teste 3: Verificar tracking
        print("3. Verificando tracking ativo...")
        response = requests.get(f"{middleware_url}/check-tracking", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Tracking ativo: {data.get('has_tracking', False)}")
        else:
            print(f"❌ Erro ao verificar: {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def main():
    """
    Executa a atualização e testes
    """
    print("🎯 ATUALIZAÇÃO PARA MÚLTIPLOS SITES")
    print("=" * 50)
    
    # Atualizar tabela
    table_updated = update_tracking_table()
    
    if table_updated:
        print("\n🧪 Executando testes...")
        test_multisite_functionality()
        
        print("\n" + "=" * 50)
        print("🎉 SISTEMA ATUALIZADO PARA MÚLTIPLOS SITES!")
        print("\n📋 SITES SUPORTADOS:")
        print("✅ www.fixfogoes.com.br - Fix Fogões")
        print("✅ fixeletros.com.br - Fix Eletros")
        print("✅ app.fixfogoes.com.br - Fix Fogões App")
        
        print("\n🎯 PRÓXIMOS PASSOS:")
        print("1. Fazer deploy das mudanças")
        print("2. Configurar campanhas separadas no Google Ads")
        print("3. Criar ações de conversão específicas por site")
        print("4. Monitorar conversões por domínio")
    else:
        print("\n❌ ATUALIZAÇÃO NECESSÁRIA")
        print("Execute o SQL manual mostrado acima")

if __name__ == "__main__":
    main()
