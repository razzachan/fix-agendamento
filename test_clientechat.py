import requests
import json
import sys

def test_clientechat_request(content_type="application/json", data_format="json"):
    """
    Testa o envio de dados para o middleware simulando o Clientechat.

    Args:
        content_type: O tipo de conteúdo a ser enviado (application/json ou application/x-www-form-urlencoded)
        data_format: O formato dos dados (json ou form)
    """
    # URL do middleware
    url = "https://fix-agendamento-production.up.railway.app/agendamento-inteligente"

    # Dados de teste
    test_data = {
        "nome": "Cliente Teste Clientechat",
        "endereco": "Rua Teste Clientechat, 123",
        "equipamento": "Fogao",
        "problema": "Nao liga",
        "urgente": True,
        "telefone": "11999999999",
        "cpf": "12345678900",
        "email": "teste@example.com"
    }

    # Configurar headers
    headers = {
        "Content-Type": content_type
    }

    # Preparar dados de acordo com o formato
    if data_format == "json":
        # Enviar como JSON
        response = requests.post(url, headers=headers, json=test_data)
    elif data_format == "form":
        # Enviar como form data
        response = requests.post(url, headers=headers, data=test_data)
    elif data_format == "raw":
        # Enviar como string JSON
        response = requests.post(url, headers=headers, data=json.dumps(test_data))
    else:
        print(f"Formato de dados desconhecido: {data_format}")
        return

    # Imprimir informações da resposta
    print(f"Status code: {response.status_code}")
    print(f"Headers: {response.headers}")

    try:
        print(f"Response: {response.json()}")
    except:
        print(f"Response text: {response.text}")

if __name__ == "__main__":
    # Determinar o tipo de conteúdo e formato dos dados a partir dos argumentos da linha de comando
    content_type = "application/json"
    data_format = "json"

    if len(sys.argv) > 1:
        if sys.argv[1] == "form":
            content_type = "application/x-www-form-urlencoded"
            data_format = "form"
        elif sys.argv[1] == "raw":
            content_type = "application/json"
            data_format = "raw"

    print(f"Testando com Content-Type: {content_type}, Formato: {data_format}")
    test_clientechat_request(content_type, data_format)
