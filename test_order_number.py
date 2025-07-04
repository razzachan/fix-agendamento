#!/usr/bin/env python3
"""
Teste para verificar se o order_number está sendo gerado corretamente
"""

import requests
import json

def test_order_number_generation():
    """Testa se o número da OS está sendo gerado corretamente"""
    
    # URL do endpoint
    url = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente-confirmacao"
    
    # Headers
    headers = {
        "Content-Type": "application/json"
    }
    
    # Dados de teste para ETAPA 2
    test_data = {
        "opcao_escolhida": "2",
        "telefone_contato": "48988332664"
    }
    
    print("🧪 TESTE: Verificando geração do order_number")
    print(f"URL: {url}")
    print(f"Dados: {json.dumps(test_data, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(url, headers=headers, json=test_data)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"Resposta: {json.dumps(response_data, indent=2)}")
            
            # Verificar se há order_number na resposta
            if "dados_agendamento" in response_data:
                order_number = response_data["dados_agendamento"].get("ordem_servico_numero")
                print(f"\n🔢 ORDER NUMBER ENCONTRADO: {order_number}")
                
                if order_number and order_number != "123456":
                    print("✅ Order number está sendo gerado corretamente!")
                    return True
                else:
                    print("❌ Order number está com problema (123456 ou None)")
                    return False
            else:
                print("❌ Dados de agendamento não encontrados na resposta")
                return False
        else:
            print(f"❌ Erro na requisição: {response.status_code}")
            print(f"Resposta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

if __name__ == "__main__":
    success = test_order_number_generation()
    if success:
        print("\n🎉 Teste passou! Order number funcionando.")
    else:
        print("\n💥 Teste falhou! Order number com problema.")
