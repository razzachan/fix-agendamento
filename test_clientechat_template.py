import requests
import json
import sys

def test_clientechat_template():
    """
    Testa o envio de dados para o middleware simulando o formato de template do Clientechat.
    """
    # URL do middleware
    url = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente"

    # Dados de teste com formato de template do Clientechat
    test_data = {
        "nome": "#nome#",
        "endereco": "#endereco#",
        "equipamento": "#equipamento#",
        "problema": "#problema#",
        "urgente": "#urgente#",
        "telefone": "#phone_contact#",
        "cpf": "#cpf#",
        "email": "#email#",
        "origem": "clientechat"
    }

    # Configurar headers
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Enviar requisição
        print(f"Enviando requisição para {url}...")
        print(f"Dados: {json.dumps(test_data, indent=2)}")

        response = requests.post(url, headers=headers, json=test_data)

        # Verificar resposta
        print(f"Status code: {response.status_code}")

        try:
            response_json = response.json()
            print(f"Resposta: {json.dumps(response_json, indent=2)}")

            # Verificar se a resposta contém uma mensagem de erro sobre templates não substituídos
            if response.status_code == 400 and "template não substituídas" in response_json.get("mensagem", ""):
                print("Teste bem-sucedido! O middleware detectou corretamente as variáveis de template não substituídas.")
                return True
            else:
                print("Aviso: O middleware não detectou as variáveis de template não substituídas.")
                return False
        except:
            print(f"Resposta não é JSON: {response.text}")
            return False

    except Exception as e:
        print(f"Erro ao enviar requisição: {str(e)}")
        return False

if __name__ == "__main__":
    print("Iniciando teste de template do Clientechat...")
    result = test_clientechat_template()
    print(f"Resultado do teste: {'Sucesso' if result else 'Falha'}")
    sys.exit(0 if result else 1)
