#!/usr/bin/env python3
"""
Script para testar o sistema completo de tracking Google Ads
"""

import requests
import json
import time
from datetime import datetime

# URLs
MIDDLEWARE_URL = "https://fix-agendamento-production.up.railway.app"
FRONTEND_URL = "https://app.fixfogoes.com.br"

def test_middleware_endpoints():
    """
    Testa os endpoints do middleware
    """
    print("🧪 Testando endpoints do middleware...")
    
    # 1. Testar health check
    try:
        response = requests.get(f"{MIDDLEWARE_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Middleware está online")
        else:
            print(f"❌ Middleware offline: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro ao conectar middleware: {e}")
        return False
    
    # 2. Testar sync-tracking
    try:
        test_tracking_data = {
            "gclid": "test_gclid_" + str(int(time.time())),
            "utm_source": "google",
            "utm_campaign": "test_campaign",
            "utm_medium": "cpc",
            "user_agent": "Test Script",
            "sync_source": "test"
        }
        
        response = requests.post(
            f"{MIDDLEWARE_URL}/sync-tracking",
            json=test_tracking_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Endpoint /sync-tracking funcionando")
        else:
            print(f"❌ /sync-tracking falhou: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Erro no /sync-tracking: {e}")
    
    # 3. Testar check-tracking
    try:
        response = requests.get(f"{MIDDLEWARE_URL}/check-tracking", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint /check-tracking funcionando - Has tracking: {data.get('has_tracking', False)}")
        else:
            print(f"❌ /check-tracking falhou: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro no /check-tracking: {e}")
    
    # 4. Testar register-conversion
    try:
        test_conversion_data = {
            "service_order_id": "test_os_" + str(int(time.time())),
            "conversion_type": "Agendamento",
            "conversion_value": 350.0,
            "equipment_type": "Fogão 4 bocas",
            "additional_data": {
                "client_name": "Cliente Teste",
                "client_phone": "(48) 99999-9999"
            }
        }
        
        response = requests.post(
            f"{MIDDLEWARE_URL}/register-conversion",
            json=test_conversion_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint /register-conversion funcionando - Success: {data.get('success', False)}")
        else:
            print(f"❌ /register-conversion falhou: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro no /register-conversion: {e}")
    
    return True

def test_frontend_access():
    """
    Testa se o frontend está acessível
    """
    print("\n🌐 Testando acesso ao frontend...")
    
    try:
        # Testar página principal
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print("✅ Frontend principal acessível")
        else:
            print(f"❌ Frontend inacessível: {response.status_code}")
            return False
            
        # Testar landing page
        response = requests.get(f"{FRONTEND_URL}/landing.html", timeout=10)
        if response.status_code == 200:
            print("✅ Landing page acessível")
        else:
            print(f"⚠️ Landing page: {response.status_code}")
            
        return True
        
    except Exception as e:
        print(f"❌ Erro ao acessar frontend: {e}")
        return False

def test_tracking_flow():
    """
    Testa o fluxo completo de tracking
    """
    print("\n🎯 Testando fluxo completo de tracking...")
    
    # Simular usuário chegando via Google Ads
    gclid = f"test_flow_{int(time.time())}"
    
    # 1. Simular captura de tracking
    print(f"1. Simulando captura de GCLID: {gclid}")
    
    tracking_data = {
        "gclid": gclid,
        "utm_source": "google",
        "utm_campaign": "fogao_conserto",
        "utm_medium": "cpc",
        "utm_term": "conserto fogao florianopolis",
        "user_agent": "Mozilla/5.0 (Test Browser)",
        "referer": "https://www.google.com/",
        "request_url": f"{FRONTEND_URL}?gclid={gclid}&utm_source=google&utm_campaign=fogao_conserto"
    }
    
    try:
        response = requests.post(
            f"{MIDDLEWARE_URL}/sync-tracking",
            json=tracking_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Tracking capturado com sucesso")
        else:
            print(f"❌ Falha na captura: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na captura: {e}")
        return False
    
    # 2. Aguardar um pouco
    time.sleep(2)
    
    # 3. Verificar se tracking está ativo
    print("2. Verificando se tracking está ativo...")
    
    try:
        response = requests.get(f"{MIDDLEWARE_URL}/check-tracking", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('has_tracking') and data.get('gclid'):
                print(f"✅ Tracking ativo detectado: {data.get('gclid')[:20]}...")
            else:
                print("⚠️ Tracking não detectado")
                
        else:
            print(f"❌ Erro ao verificar tracking: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na verificação: {e}")
    
    # 4. Simular conversão de agendamento
    print("3. Simulando conversão de agendamento...")
    
    conversion_data = {
        "service_order_id": f"OS_{int(time.time())}",
        "conversion_type": "Agendamento",
        "conversion_value": 350.0,
        "equipment_type": "Fogão 4 bocas",
        "additional_data": {
            "client_name": "João Silva",
            "client_phone": "(48) 98833-2664",
            "equipment_brand": "Brastemp",
            "problem_description": "Fogão não acende"
        }
    }
    
    try:
        response = requests.post(
            f"{MIDDLEWARE_URL}/register-conversion",
            json=conversion_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Conversão registrada com sucesso!")
            else:
                print(f"⚠️ Conversão não registrada: {data.get('message', 'Sem tracking ativo')}")
        else:
            print(f"❌ Erro ao registrar conversão: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na conversão: {e}")
    
    return True

def main():
    """
    Executa todos os testes
    """
    print("🚀 TESTE COMPLETO DO SISTEMA GOOGLE ADS TRACKING")
    print("=" * 60)
    
    # Teste 1: Middleware
    middleware_ok = test_middleware_endpoints()
    
    # Teste 2: Frontend
    frontend_ok = test_frontend_access()
    
    # Teste 3: Fluxo completo
    if middleware_ok:
        test_tracking_flow()
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES:")
    print(f"🔧 Middleware: {'✅ OK' if middleware_ok else '❌ FALHA'}")
    print(f"🌐 Frontend: {'✅ OK' if frontend_ok else '❌ FALHA'}")
    print(f"🎯 Sistema: {'✅ FUNCIONANDO' if middleware_ok and frontend_ok else '⚠️ VERIFICAR LOGS'}")
    
    if middleware_ok and frontend_ok:
        print("\n🎉 SISTEMA GOOGLE ADS TRACKING ESTÁ FUNCIONANDO!")
        print("\n📋 PRÓXIMOS PASSOS:")
        print("1. Configurar campanhas no Google Ads")
        print("2. Criar ações de conversão no Google Ads")
        print("3. Monitorar conversões nos próximos dias")
        print("4. Ajustar valores e nomes conforme necessário")
    else:
        print("\n❌ SISTEMA PRECISA DE AJUSTES")
        print("Verificar logs do middleware e frontend")

if __name__ == "__main__":
    main()
