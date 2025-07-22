#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste para verificar se o middleware diferencia corretamente os tipos de atendimento
"""

import requests
import json
import time

# URL do middleware
BASE_URL = "https://fix-agendamento-production.up.railway.app"
ENDPOINT = "/agendamento-inteligente"

def test_coleta_diagnostico():
    """Testa agendamento de Coleta Diagnóstico"""
    print("🔍 TESTE 1: Coleta Diagnóstico")
    
    dados = {
        "nome": "Cliente Teste Diagnóstico",
        "endereco": "Rua Teste Diagnóstico, 123, Centro, Florianópolis, SC",
        "equipamento": "Fogão",
        "problema": "Não sei o que está acontecendo, precisa de diagnóstico",
        "telefone": "48999111001",
        "urgente": "não",
        "cpf": "111.222.333-44",
        "email": "diagnostico@teste.com",
        "tipo_atendimento_1": "coleta_diagnostico"  # ✅ PARÂMETRO CORRETO
    }
    
    response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Sucesso: {result.get('message', 'OK')}")
        if 'opcoes' in result:
            print(f"📅 Opções de horário: {len(result['opcoes'])}")
    else:
        print(f"❌ Erro: {response.text}")
    
    print("-" * 50)
    return response

def test_coleta_conserto():
    """Testa agendamento de Coleta Conserto"""
    print("🔧 TESTE 2: Coleta Conserto")
    
    dados = {
        "nome": "Cliente Teste Conserto",
        "endereco": "Rua Teste Conserto, 456, Centro, Florianópolis, SC",
        "equipamento": "Micro-ondas",
        "problema": "Precisa trocar a resistência",
        "telefone": "48999222002",
        "urgente": "não",
        "cpf": "222.333.444-55",
        "email": "conserto@teste.com",
        "tipo_atendimento_1": "coleta_conserto"  # ✅ PARÂMETRO CORRETO
    }
    
    response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Sucesso: {result.get('message', 'OK')}")
        if 'opcoes' in result:
            print(f"📅 Opções de horário: {len(result['opcoes'])}")
    else:
        print(f"❌ Erro: {response.text}")
    
    print("-" * 50)
    return response

def test_em_domicilio():
    """Testa agendamento Em Domicílio"""
    print("🏠 TESTE 3: Em Domicílio")
    
    dados = {
        "nome": "Cliente Teste Domicílio",
        "endereco": "Rua Teste Domicílio, 789, Centro, Florianópolis, SC",
        "equipamento": "Cooktop",
        "problema": "Não está funcionando",
        "telefone": "48999333003",
        "urgente": "não",
        "cpf": "333.444.555-66",
        "email": "domicilio@teste.com",
        "tipo_atendimento_1": "em_domicilio"  # ✅ PARÂMETRO CORRETO
    }
    
    response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Sucesso: {result.get('message', 'OK')}")
        if 'opcoes' in result:
            print(f"📅 Opções de horário: {len(result['opcoes'])}")
    else:
        print(f"❌ Erro: {response.text}")
    
    print("-" * 50)
    return response

def test_sem_tipo_atendimento():
    """Testa agendamento SEM tipo de atendimento (deve usar padrão)"""
    print("❓ TESTE 4: Sem Tipo de Atendimento (Padrão)")
    
    dados = {
        "nome": "Cliente Teste Padrão",
        "endereco": "Rua Teste Padrão, 999, Centro, Florianópolis, SC",
        "equipamento": "Forno",
        "problema": "Não está aquecendo",
        "telefone": "48999444004",
        "urgente": "não",
        "cpf": "444.555.666-77",
        "email": "padrao@teste.com"
        # ❌ SEM tipo_atendimento_1 - deve usar "em_domicilio" como padrão
    }
    
    response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Sucesso: {result.get('message', 'OK')}")
        print(f"📋 Deve usar 'em_domicilio' como padrão")
        if 'opcoes' in result:
            print(f"📅 Opções de horário: {len(result['opcoes'])}")
    else:
        print(f"❌ Erro: {response.text}")
    
    print("-" * 50)
    return response

def main():
    """Executa todos os testes"""
    print("🧪 TESTE DE TIPOS DE ATENDIMENTO")
    print("=" * 50)
    
    # Executar testes
    test1 = test_coleta_diagnostico()
    time.sleep(2)
    
    test2 = test_coleta_conserto()
    time.sleep(2)
    
    test3 = test_em_domicilio()
    time.sleep(2)
    
    test4 = test_sem_tipo_atendimento()
    
    # Resumo
    print("\n📊 RESUMO DOS TESTES:")
    print("=" * 50)
    
    tests = [
        ("Coleta Diagnóstico", test1),
        ("Coleta Conserto", test2),
        ("Em Domicílio", test3),
        ("Sem Tipo (Padrão)", test4)
    ]
    
    for name, response in tests:
        status = "✅ PASSOU" if response.status_code == 200 else "❌ FALHOU"
        print(f"{name}: {status} (Status: {response.status_code})")
    
    print("\n🎯 CONCLUSÃO:")
    print("Se todos os testes passaram, o middleware está diferenciando corretamente.")
    print("Se algum falhou, há problema na lógica do middleware.")
    print("\n📋 PRÓXIMO PASSO:")
    print("Verificar se o ClienteChat está enviando o parâmetro 'tipo_atendimento_1'")

if __name__ == "__main__":
    main()
