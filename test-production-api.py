#!/usr/bin/env python3
"""
Teste da API em produção no Railway
"""

import requests
import json

def test_production_endpoints():
    """Testa os endpoints em produção"""
    base_url = "https://fix-agendamento-production.up.railway.app"
    
    print("🚀 Testando API em produção...")
    
    # 1. Testar /health
    print("\n1. Testando /health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Erro: {e}")
    
    # 2. Testar /agendamento-inteligente
    print("\n2. Testando /agendamento-inteligente...")
    payload = {
        "equipamento": "fogao",
        "marca": "brastemp",
        "problema": "nao_acende"
    }
    try:
        response = requests.post(f"{base_url}/agendamento-inteligente", json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Erro: {e}")
    
    # 3. Testar /api/quote/estimate
    print("\n3. Testando /api/quote/estimate...")
    payload = {
        "equipment": "fogao",
        "brand": "brastemp",
        "problem": "nao_acende"
    }
    try:
        response = requests.post(f"{base_url}/api/quote/estimate", json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                print("✅ API /api/quote/estimate funcionando corretamente!")
                return True
            else:
                print(f"❌ API retornou erro: {data.get('error')}")
        else:
            print(f"❌ Status code não é 200: {response.status_code}")
    except Exception as e:
        print(f"Erro: {e}")
    
    return False

if __name__ == "__main__":
    success = test_production_endpoints()
    if success:
        print("\n🎉 API em produção está funcionando!")
    else:
        print("\n⚠️ API ainda tem problemas.")
