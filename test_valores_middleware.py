#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste para verificar se o middleware está salvando corretamente os valores valor_os_1, valor_os_2 e valor_os_3
"""

import requests
import json
import time

# URL do middleware
MIDDLEWARE_URL = "http://localhost:8000/agendamento-inteligente"

def testar_salvamento_valores():
    """
    Testa se os valores valor_os_1, valor_os_2 e valor_os_3 estão sendo salvos corretamente
    """
    print("🧪 TESTE: Salvamento de valores valor_os_1, valor_os_2 e valor_os_3")
    print("=" * 60)
    
    # Dados de teste com múltiplos equipamentos e valores
    dados_teste = {
        "nome": "Cliente Teste Valores",
        "telefone": "48999999999",
        "endereco": "Rua Teste, 123, Centro, Florianópolis, SC",
        "cpf": "123.456.789-00",
        "email": "teste@email.com",
        "urgente": "não",
        
        # Equipamento 1
        "equipamento": "fogão",
        "problema": "não está funcionando",
        "tipo_atendimento_1": "coleta_diagnostico",
        "valor_os_1": "350",
        
        # Equipamento 2
        "equipamento_2": "forno",
        "problema_2": "precisa trocar resistência",
        "tipo_atendimento_2": "coleta_conserto",
        "valor_os_2": "180",
        
        # Equipamento 3
        "equipamento_3": "cooktop",
        "problema_3": "não pode sair de casa",
        "tipo_atendimento_3": "em_domicilio",
        "valor_os_3": "120"
    }
    
    try:
        print("📤 Enviando dados para ETAPA 1 (consulta de disponibilidade)...")
        print(f"Dados: {json.dumps(dados_teste, indent=2, ensure_ascii=False)}")
        
        # ETAPA 1: Consulta de disponibilidade
        response = requests.post(
            MIDDLEWARE_URL,
            json=dados_teste,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status da resposta: {response.status_code}")
        
        if response.status_code == 200:
            resposta = response.json()
            print("✅ ETAPA 1 executada com sucesso!")
            print(f"Resposta: {json.dumps(resposta, indent=2, ensure_ascii=False)}")
            
            # Aguardar um pouco para garantir que o pré-agendamento foi salvo
            print("\n⏳ Aguardando 2 segundos para verificar se o pré-agendamento foi salvo...")
            time.sleep(2)
            
            # Agora vamos verificar se podemos fazer a ETAPA 2
            print("\n📤 Testando ETAPA 2 (confirmação)...")
            dados_etapa2 = {
                "telefone": "48999999999",
                "horario_escolhido": "1"  # Escolher a primeira opção
            }
            
            response2 = requests.post(
                MIDDLEWARE_URL,
                json=dados_etapa2,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"📥 Status da resposta ETAPA 2: {response2.status_code}")
            
            if response2.status_code == 200:
                resposta2 = response2.json()
                print("✅ ETAPA 2 executada com sucesso!")
                print(f"Resposta: {json.dumps(resposta2, indent=2, ensure_ascii=False)}")
            else:
                print(f"❌ Erro na ETAPA 2: {response2.text}")
                
        else:
            print(f"❌ Erro na ETAPA 1: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro durante o teste: {e}")

if __name__ == "__main__":
    testar_salvamento_valores()
