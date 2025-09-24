#!/usr/bin/env python3
"""
Teste do webhook em produção
"""

import requests
import json

def test_webhook_production():
    """Testa o webhook em produção"""
    webhook_url = "https://enchanting-light-production.up.railway.app/test-message"
    
    print("🤖 Testando webhook em produção...")
    
    # Testar mensagem de orçamento
    payload = {
        "from": "5548999999999",
        "body": "Oi, meu fogão não está acendendo"
    }
    
    try:
        print(f"Enviando: {payload}")
        response = requests.post(webhook_url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "reply" in data:
                print("✅ Webhook funcionando!")
                print(f"Bot respondeu: {data['reply'][:100]}...")
                return True
            else:
                print(f"❌ Resposta inesperada: {data}")
        else:
            print(f"❌ Status code não é 200: {response.status_code}")
    except Exception as e:
        print(f"Erro: {e}")
    
    return False

if __name__ == "__main__":
    success = test_webhook_production()
    if success:
        print("\n🎉 Webhook está funcionando!")
    else:
        print("\n⚠️ Webhook tem problemas.")
