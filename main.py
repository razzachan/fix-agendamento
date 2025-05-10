from flask import Flask, request, jsonify
import datetime

app = Flask(__name__)

# === CONFIGURAVEIS ===
GOOGLE_CALENDAR_ID = "tecnico@fixfogoes.com"
API_KEY_GOOGLE_MAPS = "SUA_CHAVE_GOOGLE_MAPS"
ORIGEM_TECNICO = "Rua Exemplo, 123 - Cidade, UF"

# Simula disponibilidade (substituir por integração real com Google Calendar)
availability_mock = [
    {"data": "2025-05-13", "janela": ["10:00", "11:00"]},
    {"data": "2025-05-13", "janela": ["13:00", "14:00"]},
    {"data": "2025-05-14", "janela": ["09:00", "10:00"]}
]

# Simula estimativa de rota (substituir por chamada real Google Maps API)
def calcular_tempo_deslocamento(endereco_cliente):
    return 25  # minutos simulados

@app.route("/agendamento-inteligente", methods=["POST"])
def agendar():
    dados = request.json
    nome = dados.get("nome")
    endereco = dados.get("endereco")
    equipamento = dados.get("equipamento")
    problema = dados.get("problema")

    tempo_deslocamento = calcular_tempo_deslocamento(endereco)

    # Seleciona o primeiro horário disponível (simulação)
    proxima_disponibilidade = availability_mock[1]
    dia = proxima_disponibilidade["data"]
    janela = proxima_disponibilidade["janela"]

    resposta = {
        "mensagem": f"{nome}, posso agendar a visita para {dia}, com previsão de chegada entre {janela[0]} e {janela[1]}. Tudo certo?",
        "tempo_estimado_deslocamento": f"{tempo_deslocamento} minutos",
        "problema_recebido": problema
    }

    return jsonify(resposta)

if __name__ == "__main__":
    app.run(debug=True)
