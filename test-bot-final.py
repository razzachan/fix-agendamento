#!/usr/bin/env python3
"""
Teste final do bot para verificar se está gerando orçamentos
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
            reply = data.get("reply", "Sem resposta")
            # Se reply é um dict, extrair o texto
            if isinstance(reply, dict):
                return reply.get("text", str(reply))
            return str(reply)
        else:
            return f"Erro {response.status_code}: {response.text}"
    except Exception as e:
        return f"Erro: {e}"

def test_bot_orçamento():
    """Testa se o bot gera orçamento"""
    from_number = "5548888888888"  # Número diferente para nova conversa
    
    print("🤖 Testando geração de orçamento...")
    
    # 1. Mensagem inicial
    print("\n1. Mensagem inicial...")
    reply1 = send_message(from_number, "Preciso de orçamento para meu fogão")
    print(f"Bot: {reply1}")
    
    # 2. Informar equipamento e marca
    print("\n2. Informando equipamento...")
    reply2 = send_message(from_number, "Fogão Brastemp a gás que não acende")
    print(f"Bot: {reply2}")
    
    # 3. Escolher tipo se perguntado
    if "gás" in reply2 or "elétrico" in reply2:
        print("\n3. Escolhendo tipo...")
        reply3 = send_message(from_number, "1")  # Fogão a gás
        print(f"Bot: {reply3}")
        
        # Verificar se gerou orçamento
        if "R$" in reply3 or "valor" in reply3.lower() or "orçamento" in reply3.lower():
            print("\n✅ ORÇAMENTO GERADO!")
            return True
    
    # Verificar nas respostas anteriores
    all_replies = f"{reply1} {reply2}"
    if "R$" in all_replies or "valor" in all_replies.lower() or "orçamento" in all_replies.lower():
        print("\n✅ ORÇAMENTO GERADO!")
        return True
    
    print("\n⚠️ Orçamento não detectado ainda.")
    return False

if __name__ == "__main__":
    success = test_bot_orçamento()
    if success:
        print("\n🎉 BOT ESTÁ FUNCIONANDO - GERANDO ORÇAMENTOS!")
    else:
        print("\n⚠️ Bot não gerou orçamento visível.")
