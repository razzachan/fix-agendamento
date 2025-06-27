#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste dos novos endpoints ClienteChat para consultas e ações.
"""

import requests
import json
import sys
import time

# URL base do middleware
BASE_URL = "https://fix-agendamento-production.up.railway.app"

def test_get_client_orders():
    """
    Testa o endpoint GET /api/clientechat/client/{phone}/orders
    """
    print("🔍 Testando busca de ordens por telefone...")
    
    # Telefone de teste (use um que existe no banco)
    phone = "48999999999"
    url = f"{BASE_URL}/api/clientechat/client/{phone}/orders"
    
    try:
        response = requests.get(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste GET ordens do cliente: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste GET ordens do cliente: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_get_order_status():
    """
    Testa o endpoint GET /api/clientechat/order/{order_id}/status
    """
    print("🔍 Testando busca de status de ordem...")
    
    # ID de ordem de teste (use um que existe no banco)
    order_id = "test-order-id"  # Substitua por um ID real
    url = f"{BASE_URL}/api/clientechat/order/{order_id}/status"
    
    try:
        response = requests.get(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste GET status da ordem: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste GET status da ordem: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_get_order_budget():
    """
    Testa o endpoint GET /api/clientechat/order/{order_id}/budget
    """
    print("🔍 Testando busca de orçamento...")
    
    # ID de ordem de teste
    order_id = "test-order-id"  # Substitua por um ID real
    url = f"{BASE_URL}/api/clientechat/order/{order_id}/budget"
    
    try:
        response = requests.get(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste GET orçamento: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste GET orçamento: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_approve_budget():
    """
    Testa o endpoint POST /api/clientechat/order/{order_id}/approve-budget
    """
    print("🔍 Testando aprovação de orçamento...")
    
    # ID de ordem de teste
    order_id = "test-order-id"  # Substitua por um ID real
    url = f"{BASE_URL}/api/clientechat/order/{order_id}/approve-budget"
    
    try:
        response = requests.post(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste POST aprovação orçamento: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste POST aprovação orçamento: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_reschedule_order():
    """
    Testa o endpoint POST /api/clientechat/order/{order_id}/schedule
    """
    print("🔍 Testando reagendamento...")
    
    # ID de ordem de teste
    order_id = "test-order-id"  # Substitua por um ID real
    url = f"{BASE_URL}/api/clientechat/order/{order_id}/schedule"
    
    # Data para reagendamento
    data = {
        "nova_data": "2025-12-30T14:00:00Z"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste POST reagendamento: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste POST reagendamento: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_submit_feedback():
    """
    Testa o endpoint POST /api/clientechat/client/feedback
    """
    print("🔍 Testando envio de feedback...")
    
    url = f"{BASE_URL}/api/clientechat/client/feedback"
    
    # Dados do feedback
    data = {
        "telefone": "48999999999",
        "ordem_id": "test-order-id",
        "avaliacao": 5,
        "comentario": "Excelente atendimento! Muito satisfeito com o serviço."
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("✅ Teste POST feedback: SUCESSO")
                print(f"📱 Mensagem ClienteChat:\n{data['message']}")
            else:
                print("❌ Teste POST feedback: FALHOU")
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
    
    print("-" * 50)

def test_health_check():
    """
    Testa se o middleware está funcionando
    """
    print("🔍 Testando health check...")
    
    url = f"{BASE_URL}/health"
    
    try:
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            print("✅ Middleware está funcionando!")
        else:
            print(f"❌ Middleware com problemas: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Middleware não acessível: {str(e)}")
    
    print("-" * 50)

def run_all_tests():
    """
    Executa todos os testes dos novos endpoints ClienteChat
    """
    print("🚀 INICIANDO TESTES DOS ENDPOINTS CLIENTECHAT")
    print("=" * 60)
    
    # Teste básico primeiro
    test_health_check()
    
    # Aguardar um pouco entre testes
    time.sleep(1)
    
    # Testes GET
    test_get_client_orders()
    time.sleep(1)
    
    test_get_order_status()
    time.sleep(1)
    
    test_get_order_budget()
    time.sleep(1)
    
    # Testes POST
    test_approve_budget()
    time.sleep(1)
    
    test_reschedule_order()
    time.sleep(1)
    
    test_submit_feedback()
    
    print("🏁 TESTES CONCLUÍDOS!")
    print("=" * 60)
    print("\n📝 PRÓXIMOS PASSOS:")
    print("1. Verificar se todos os endpoints estão respondendo")
    print("2. Testar com dados reais do banco")
    print("3. Configurar ClienteChat para usar os novos endpoints")
    print("4. Testar fluxo completo com cliente real")

if __name__ == "__main__":
    run_all_tests()
