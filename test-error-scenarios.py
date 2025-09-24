#!/usr/bin/env python3
"""
Testa cenários que podem estar causando erros nos logs do Railway
"""

import requests
import json
import time

def test_error_scenarios():
    """Testa cenários que podem causar erros"""
    base_url = "https://fix-agendamento-production.up.railway.app"
    
    print("🔍 Testando cenários de erro...")
    
    # 1. Testar JSON inválido
    print("\n1. Testando JSON inválido...")
    try:
        response = requests.post(f"{base_url}/agendamento-inteligente", 
                               data="invalid json", 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 2. Testar dados faltando
    print("\n2. Testando dados obrigatórios faltando...")
    try:
        response = requests.post(f"{base_url}/agendamento-inteligente", 
                               json={}, 
                               timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 3. Testar endpoint inexistente
    print("\n3. Testando endpoint inexistente...")
    try:
        response = requests.post(f"{base_url}/endpoint-inexistente", 
                               json={"test": "data"}, 
                               timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 4. Testar requisição muito grande
    print("\n4. Testando payload muito grande...")
    try:
        large_payload = {"equipamento": "fogao", "problema": "x" * 10000}
        response = requests.post(f"{base_url}/agendamento-inteligente", 
                               json=large_payload, 
                               timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 5. Testar múltiplas requisições rápidas (pode causar rate limiting)
    print("\n5. Testando múltiplas requisições rápidas...")
    for i in range(3):
        try:
            response = requests.post(f"{base_url}/agendamento-inteligente", 
                                   json={"equipamento": "fogao", "telefone": f"4899999999{i}"}, 
                                   timeout=5)
            print(f"   Req {i+1} - Status: {response.status_code}")
        except Exception as e:
            print(f"   Req {i+1} - Erro: {e}")
        time.sleep(0.5)
    
    # 6. Testar /api/quote/estimate (pode não existir ainda)
    print("\n6. Testando /api/quote/estimate...")
    try:
        response = requests.post(f"{base_url}/api/quote/estimate", 
                               json={"equipment": "fogao", "brand": "brastemp"}, 
                               timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    print("\n✅ Teste de cenários de erro concluído!")

if __name__ == "__main__":
    test_error_scenarios()
