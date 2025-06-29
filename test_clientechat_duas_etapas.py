#!/usr/bin/env python3
"""
🧪 TESTE SISTEMA CLIENTECHAT DUAS ETAPAS AUTOMÁTICAS
Testa a nova lógica que detecta automaticamente primeira consulta vs escolha de horário
"""

import requests
import json

# URL da API no Railway
API_URL = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente"

def test_primeira_consulta():
    """🎯 TESTE ETAPA 1: Primeira consulta com dados completos"""
    print("🎯 TESTANDO ETAPA 1: Primeira consulta")
    
    # Dados simulando mensagem do ClienteChat com dados completos
    dados = {
        "message": """Nome: João Silva
Endereço: Rua das Flores, 123, Centro, Florianópolis, SC, CEP: 88010-000
CPF: 123.456.789-00
E-mail: joao.silva@email.com
Equipamento: Fogão""",
        "phone": "48988332664"
    }
    
    try:
        response = requests.post(API_URL, json=dados, timeout=30)
        print(f"📡 Status: {response.status_code}")
        print(f"📝 Resposta: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.json()
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def test_escolha_horario():
    """🎯 TESTE ETAPA 2: Escolha de horário"""
    print("\n🎯 TESTANDO ETAPA 2: Escolha de horário")
    
    # Dados simulando escolha de horário (número 1, 2 ou 3)
    dados = {
        "message": "1",
        "phone": "48988332664"
    }
    
    try:
        response = requests.post(API_URL, json=dados, timeout=30)
        print(f"📡 Status: {response.status_code}")
        print(f"📝 Resposta: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.json()
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def test_mensagem_incompleta():
    """🎯 TESTE: Mensagem incompleta"""
    print("\n🎯 TESTANDO: Mensagem incompleta")
    
    dados = {
        "message": "Quero agendar um serviço",
        "phone": "48988332664"
    }
    
    try:
        response = requests.post(API_URL, json=dados, timeout=30)
        print(f"📡 Status: {response.status_code}")
        print(f"📝 Resposta: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.json()
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

if __name__ == "__main__":
    print("🚀 INICIANDO TESTES SISTEMA CLIENTECHAT DUAS ETAPAS")
    print("=" * 60)
    
    # Teste 1: Primeira consulta
    resultado1 = test_primeira_consulta()
    
    # Teste 2: Escolha de horário (só se a primeira consulta funcionou)
    if resultado1 and resultado1.get('response'):
        resultado2 = test_escolha_horario()
    
    # Teste 3: Mensagem incompleta
    resultado3 = test_mensagem_incompleta()
    
    print("\n✅ TESTES CONCLUÍDOS!")
