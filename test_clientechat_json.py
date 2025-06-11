import requests
import json
import sys

def test_clientechat_json():
    """
    Testa o envio de dados para o middleware usando o formato JSON exato do Clientechat.
    """
    # URL do middleware
    url = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente"

    # Dados de teste com o formato JSON exato do Clientechat
    json_data = '{"cpf":"12345678900","nome":"Cliente Teste JSON","email":"cliente.teste@example.com","urgente":"sim","endereco":"Rua Teste JSON, 123, São Paulo - SP","problema":"Não acende o forno","telefone":"11999999999","equipamento":"Fogão Brastemp 4 bocas","origem":"clientechat"}'

    # Configurar headers
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Enviar requisição
        print(f"Enviando requisição para {url}...")
        print(f"Dados: {json_data}")

        response = requests.post(url, headers=headers, data=json_data)

        # Verificar resposta
        print(f"Status code: {response.status_code}")

        try:
            response_json = response.json()
            print(f"Resposta: {json.dumps(response_json, indent=2)}")

            # Verificar se a resposta indica sucesso
            if response.status_code == 200 and response_json.get("sucesso", False):
                print("Teste bem-sucedido! O middleware processou corretamente os dados no formato JSON exato do Clientechat.")
                return True
            else:
                print("Aviso: O middleware não processou corretamente os dados no formato JSON exato do Clientechat.")
                return False
        except:
            print(f"Resposta não é JSON: {response.text}")
            return False

    except Exception as e:
        print(f"Erro ao enviar requisição: {str(e)}")
        return False

if __name__ == "__main__":
    print("Iniciando teste com formato JSON exato do Clientechat...")
    result = test_clientechat_json()
    print(f"Resultado do teste: {'Sucesso' if result else 'Falha'}")
    sys.exit(0 if result else 1)
