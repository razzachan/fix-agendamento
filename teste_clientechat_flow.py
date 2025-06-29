#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste do fluxo completo do ClienteChat com Fix Fogões
Simula o comportamento da neural chain
"""

import requests
import json
import time

# Configurações
BASE_URL = "https://fix-agendamento-production.up.railway.app"
ENDPOINT = "/agendamento-inteligente"

def teste_etapa_1_consulta():
    """Testa ETAPA 1: Consulta de disponibilidade"""
    print("🔍 ETAPA 1: Consultando disponibilidade...")
    
    dados = {
        "nome": "Cliente Teste",
        "endereco": "Centro, Florianópolis SC",
        "equipamento": "Fogão",
        "problema": "Não acende",
        "telefone": "48999999999",
        "email": "teste@email.com"
    }
    
    try:
        response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
        result = response.json()
        
        print(f"✅ Status: {response.status_code}")
        print(f"📋 Resposta: {result.get('mensagem', 'Sem mensagem')}")
        
        if result.get('sucesso'):
            horarios = result.get('horarios_disponiveis', [])
            print(f"⏰ Horários disponíveis: {len(horarios)}")
            for i, horario in enumerate(horarios, 1):
                print(f"   {i}. {horario.get('texto', 'N/A')}")
            
            return result, horarios
        else:
            print(f"❌ Erro: {result.get('mensagem')}")
            return None, []
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return None, []

def teste_etapa_2_confirmacao(dados_originais, opcao_escolhida="1"):
    """Testa ETAPA 2: Confirmação do agendamento"""
    print(f"\n✅ ETAPA 2: Confirmando agendamento (opção {opcao_escolhida})...")
    
    dados = dados_originais.copy()
    dados["horario_escolhido"] = opcao_escolhida
    
    try:
        response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
        result = response.json()
        
        print(f"✅ Status: {response.status_code}")
        print(f"📋 Resposta: {result.get('mensagem', 'Sem mensagem')}")
        
        if result.get('sucesso'):
            print("🎉 Agendamento confirmado com sucesso!")
            if 'order_number' in result:
                print(f"📋 OS: {result['order_number']}")
        else:
            print(f"❌ Erro: {result.get('mensagem')}")
            
        return result
        
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return None

def teste_cenarios_diferentes():
    """Testa diferentes cenários de equipamentos e locais"""
    cenarios = [
        {
            "nome": "João Silva",
            "endereco": "São José, SC",
            "equipamento": "Coifa",
            "problema": "Não aspira",
            "telefone": "48988776655",
            "descricao": "Coifa em São José (Grupo B, Técnico Marcelo)"
        },
        {
            "nome": "Maria Santos", 
            "endereco": "Palhoça, SC",
            "equipamento": "Forno",
            "problema": "Não aquece",
            "telefone": "48977665544",
            "urgente": "sim",
            "descricao": "Forno urgente em Palhoça (Grupo B, Paulo Cesar)"
        },
        {
            "nome": "Pedro Costa",
            "endereco": "Balneário Camboriú, SC", 
            "equipamento": "Fogão",
            "problema": "Queimador entupido",
            "telefone": "48966554433",
            "descricao": "Fogão no litoral (Grupo C)"
        }
    ]
    
    print("\n🧪 TESTANDO DIFERENTES CENÁRIOS:")
    print("=" * 50)
    
    for i, cenario in enumerate(cenarios, 1):
        print(f"\n📋 CENÁRIO {i}: {cenario['descricao']}")
        print("-" * 30)
        
        # Remover descrição dos dados
        dados = {k: v for k, v in cenario.items() if k != 'descricao'}
        
        try:
            response = requests.post(f"{BASE_URL}{ENDPOINT}", json=dados)
            result = response.json()
            
            if result.get('sucesso'):
                print(f"✅ Sucesso: {result.get('mensagem', '')[:100]}...")
                horarios = result.get('horarios_disponiveis', [])
                print(f"⏰ {len(horarios)} horários disponíveis")
            else:
                print(f"❌ Erro: {result.get('mensagem')}")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        time.sleep(1)  # Pausa entre testes

def main():
    """Executa todos os testes"""
    print("🚀 INICIANDO TESTES DO SISTEMA FIX FOGÕES")
    print("=" * 50)
    
    # Teste do fluxo completo
    dados_teste = {
        "nome": "Cliente Teste Completo",
        "endereco": "Centro, Florianópolis SC", 
        "equipamento": "Fogão",
        "problema": "Não acende",
        "telefone": "48999999999",
        "email": "teste@email.com"
    }
    
    # ETAPA 1
    resultado_1, horarios = teste_etapa_1_consulta()
    
    if resultado_1 and horarios:
        time.sleep(2)
        # ETAPA 2
        resultado_2 = teste_etapa_2_confirmacao(dados_teste, "1")
    
    # Testes de cenários
    time.sleep(3)
    teste_cenarios_diferentes()
    
    print("\n🏁 TESTES CONCLUÍDOS!")

if __name__ == "__main__":
    main()
