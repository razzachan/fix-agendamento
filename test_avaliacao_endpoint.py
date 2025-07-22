#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste do endpoint de avaliação Google Reviews
"""

import requests
import json

def test_avaliacao_endpoint():
    """Testa o endpoint de avaliação"""
    
    url = "https://fix-agendamento-production.up.railway.app/solicitar-avaliacao-google"
    
    # Dados de teste
    dados = {
        "os_numero": "#038",
        "cliente_nome": "João Silva Teste",
        "telefone": "48988332664"
    }
    
    print("🧪 TESTANDO ENDPOINT DE AVALIAÇÃO")
    print(f"📡 URL: {url}")
    print(f"📋 Dados: {json.dumps(dados, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(
            url, 
            json=dados,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        try:
            result = response.json()
            print(f"✅ Response JSON:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            if result.get("success"):
                print("\n🎉 SUCESSO!")
                print(f"📱 External Return: {result.get('message', 'N/A')}")
                
                # Testar extração de dados (como ClienteChat faria)
                external_return = result.get('message', '')
                if 'AVALIACAO_SOLICITADA' in external_return:
                    print("\n🔍 TESTE DE EXTRAÇÃO (como ClienteChat):")
                    
                    # Simular operadores %%% do ClienteChat
                    try:
                        os_numero = external_return.split("OS:")[1].split("|")[0]
                        cliente = external_return.split("CLIENTE:")[1].split("|")[0]
                        telefone = external_return.split("TELEFONE:")[1].split("|")[0]
                        url_review = external_return.split("URL:")[1].split("|")[0]
                        
                        print(f"   📋 OS: {os_numero}")
                        print(f"   👤 Cliente: {cliente}")
                        print(f"   📱 Telefone: {telefone}")
                        print(f"   🔗 URL: {url_review}")
                        
                        # Simular mensagem final do ClienteChat
                        mensagem_final = f"""🎉 *Serviço Concluído - OS {os_numero}*

Olá {cliente}! 👋

✅ Seu serviço foi finalizado com sucesso!

⭐ *Que tal nos ajudar com uma avaliação?*

🔗 *Clique aqui para avaliar:*
{url_review}

📝 *Leva apenas 30 segundos!*

Muito obrigado pela confiança! 🙏

---
*Fix Fogões - Assistência Técnica Especializada*
📞 (48) 98833-2664"""
                        
                        print("\n📱 MENSAGEM FINAL (como seria enviada):")
                        print(mensagem_final)
                        
                    except Exception as extract_error:
                        print(f"❌ Erro na extração: {extract_error}")
                
            else:
                print(f"\n❌ FALHA: {result.get('message', 'Erro desconhecido')}")
                
        except json.JSONDecodeError:
            print(f"❌ Resposta não é JSON válido:")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro na requisição: {e}")
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    test_avaliacao_endpoint()
