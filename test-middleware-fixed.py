#!/usr/bin/env python3
"""
Teste do middleware corrigido
"""

import requests
import json

def test_agendamento_inteligente():
    """Testa o endpoint /agendamento-inteligente"""
    url = "http://localhost:8002/agendamento-inteligente"
    payload = {
        "equipamento": "fogao",
        "marca": "brastemp",
        "problema": "nao_acende"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Erro: {e}")
        return False

def test_quote_estimate():
    """Testa o endpoint /api/quote/estimate"""
    url = "http://localhost:8002/api/quote/estimate"
    payload = {
        "equipment": "fogao",
        "brand": "brastemp",
        "problem": "nao_acende"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Erro: {e}")
        return False

def test_health():
    """Testa o endpoint /health"""
    url = "http://localhost:8002/health"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Erro: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testando middleware corrigido...")
    
    print("\n1. Testando /health...")
    test_health()
    
    print("\n2. Testando /agendamento-inteligente...")
    test_agendamento_inteligente()
    
    print("\n3. Testando /api/quote/estimate...")
    test_quote_estimate()
    
    print("\n✅ Testes concluídos!")
