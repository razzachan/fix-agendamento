#!/usr/bin/env python3
"""
Teste de conversa completa com o bot
"""

import requests
import json
import time

def send_message(from_number, message):
    """Envia uma mensagem para o bot"""
    webhook_url = "https://enchanting-light-production.up.railway.app/test-message"
    payload = {
        "from": from_number,
        "body": message
    }
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            return data.get("reply", "Sem resposta")
        else:
            return f"Erro {response.status_code}: {response.text}"
    except Exception as e:
        return f"Erro: {e}"

def test_full_conversation():
    """Testa uma conversa completa"""
    from_number = "5548999999999"
    
    print("🤖 Testando conversa completa...")
    
    # 1. Mensagem inicial
    print("\n1. Mensagem inicial...")
    reply1 = send_message(from_number, "Oi, meu fogão não está acendendo")
    print(f"Bot: {reply1}")
    time.sleep(2)
    
    # 2. Informar marca e problema
    print("\n2. Informando marca e problema...")
    reply2 = send_message(from_number, "É um fogão Brastemp, o problema é que não acende nenhuma boca")
    print(f"Bot: {reply2}")
    time.sleep(2)
    
    # 3. Responder tipo de fogão se solicitado
    reply2_str = str(reply2)
    if "gás" in reply2_str or "elétrico" in reply2_str or "indução" in reply2_str:
        print("\n3. Informando tipo de fogão...")
        reply3 = send_message(from_number, "1")  # Fogão a gás
        print(f"Bot: {reply3}")
        time.sleep(2)

        # 4. Informar dados pessoais se solicitado
        reply3_str = str(reply3)
        if "nome" in reply3_str.lower() or "endereço" in reply3_str.lower():
            print("\n4. Informando dados pessoais...")
            reply4 = send_message(from_number, "João Silva, Rua das Flores 123, Tijucas SC")
            print(f"Bot: {reply4}")
            time.sleep(2)
            reply3_str = str(reply4)  # Atualizar para verificação

    # 5. Verificar se gerou orçamento
    if "R$" in reply2_str or "valor" in reply2_str.lower() or "orçamento" in reply2_str.lower():
        print("\n✅ ORÇAMENTO GERADO COM SUCESSO!")
        return True
    elif "R$" in reply3_str or "valor" in reply3_str.lower() or "orçamento" in reply3_str.lower():
        print("\n✅ ORÇAMENTO GERADO COM SUCESSO!")
        return True
    else:
        print("\n⚠️ Orçamento não foi gerado ainda.")
        print(f"Última resposta: {reply3_str[:200]}...")
        return False

if __name__ == "__main__":
    success = test_full_conversation()
    if success:
        print("\n🎉 Bot está gerando orçamentos corretamente!")
    else:
        print("\n⚠️ Bot não conseguiu gerar orçamento.")
