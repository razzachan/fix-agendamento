#!/usr/bin/env python3
"""
Script para configurar o sistema de tracking do Google Ads
Cria a tabela google_ads_tracking_sessions no Supabase
"""

import os
import sys
from supabase import create_client, Client

def setup_google_ads_tracking():
    """
    Configura o sistema de tracking do Google Ads
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
        
        # Ler o arquivo SQL
        sql_file = "database/create_google_ads_tracking_sessions.sql"
        if not os.path.exists(sql_file):
            print(f"❌ Erro: Arquivo {sql_file} não encontrado")
            return False
        
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("📄 Arquivo SQL carregado")
        
        # Executar o SQL (dividir em comandos individuais)
        sql_commands = sql_content.split(';')
        
        for i, command in enumerate(sql_commands):
            command = command.strip()
            if command and not command.startswith('--'):
                try:
                    # Usar rpc para executar SQL bruto
                    result = supabase.rpc('exec_sql', {'sql': command}).execute()
                    print(f"✅ Comando {i+1} executado com sucesso")
                except Exception as e:
                    print(f"⚠️ Comando {i+1} falhou (pode ser normal): {str(e)[:100]}...")
        
        print("🎯 Setup do Google Ads Tracking concluído!")
        
        # Testar a tabela
        try:
            result = supabase.table("google_ads_tracking_sessions").select("count", count="exact").execute()
            print(f"✅ Tabela google_ads_tracking_sessions criada (registros: {result.count})")
        except Exception as e:
            print(f"❌ Erro ao testar tabela: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no setup: {e}")
        return False

def test_tracking_system():
    """
    Testa o sistema de tracking
    """
    try:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        supabase: Client = create_client(url, key)
        
        # Inserir um registro de teste
        test_data = {
            'gclid': 'test_gclid_123',
            'utm_source': 'google',
            'utm_campaign': 'test_campaign',
            'user_agent': 'Test Agent',
            'ip_address': '127.0.0.1',
            'session_active': True
        }
        
        result = supabase.table("google_ads_tracking_sessions").insert(test_data).execute()
        
        if result.data:
            print("✅ Teste de inserção bem-sucedido")
            
            # Buscar o registro
            search_result = supabase.table("google_ads_tracking_sessions").select("*").eq("gclid", "test_gclid_123").execute()
            
            if search_result.data:
                print("✅ Teste de busca bem-sucedido")
                
                # Limpar registro de teste
                supabase.table("google_ads_tracking_sessions").delete().eq("gclid", "test_gclid_123").execute()
                print("✅ Registro de teste removido")
                
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Configurando sistema de tracking do Google Ads...")
    
    if setup_google_ads_tracking():
        print("\n🧪 Testando sistema...")
        if test_tracking_system():
            print("\n🎉 Sistema de tracking configurado e testado com sucesso!")
        else:
            print("\n⚠️ Sistema configurado, mas teste falhou")
    else:
        print("\n❌ Falha na configuração do sistema")
        sys.exit(1)
