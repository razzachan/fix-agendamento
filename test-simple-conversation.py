#!/usr/bin/env python3
"""
Teste simples de conversa com o bot
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

def test_conversation():
    """Testa conversa passo a passo"""
    from_number = "5548999999999"
    
    print("🤖 Testando bot passo a passo...")
    
    messages = [
        "Oi, meu fogão não está acendendo",
        "É um fogão Brastemp, o problema é que não acende nenhuma boca",
        "1",  # Fogão a gás
        "João Silva, Rua das Flores 123, Tijucas SC, 48999999999"
    ]
    
    for i, message in enumerate(messages, 1):
        print(f"\n{i}. Enviando: {message}")
        reply = send_message(from_number, message)
        print(f"Bot: {str(reply)[:200]}...")
        
        # Verificar se gerou orçamento
        reply_str = str(reply)
        if "R$" in reply_str or "valor" in reply_str.lower() or "orçamento" in reply_str.lower():
            print("\n✅ ORÇAMENTO GERADO COM SUCESSO!")
            return True
        
        time.sleep(3)  # Aguardar entre mensagens
    
    print("\n⚠️ Orçamento não foi gerado.")
    return False

if __name__ == "__main__":
    success = test_conversation()
    if success:
        print("\n🎉 Bot está funcionando corretamente!")
    else:
        print("\n⚠️ Bot precisa de ajustes.")
