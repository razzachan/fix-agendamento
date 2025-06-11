import requests
import json
import sys

def test_clientechat_real():
    """
    Testa o envio de dados para o middleware simulando dados reais do Clientechat.
    """
    # URL do middleware
    url = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente"

    # Dados de teste com valores reais
    test_data = {
        "nome": "Cliente Teste Real",
        "endereco": "Rua Teste Real, 123, São Paulo - SP",
        "equipamento": "Fogão Brastemp 4 bocas",
        "problema": "Não acende o forno",
        "urgente": "sim",
        "telefone": "11999999999",
        "cpf": "12345678900",
        "email": "cliente.teste@example.com",
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

            # Verificar se a resposta indica sucesso
            if response.status_code == 200 and response_json.get("sucesso", False):
                print("Teste bem-sucedido! O middleware processou corretamente os dados reais.")
                return True
            else:
                print("Aviso: O middleware não processou corretamente os dados reais.")
                return False
        except:
            print(f"Resposta não é JSON: {response.text}")
            return False

    except Exception as e:
        print(f"Erro ao enviar requisição: {str(e)}")
        return False

if __name__ == "__main__":
    print("Iniciando teste com dados reais do Clientechat...")
    result = test_clientechat_real()
    print(f"Resultado do teste: {'Sucesso' if result else 'Falha'}")
    sys.exit(0 if result else 1)
