from flask import Flask, request, jsonify

app = Flask(__name__)

# Simulação de disponibilidade
availability_mock = [
    {"data": "2025-05-13", "janela": ["10:00", "11:00"]},
    {"data": "2025-05-13", "janela": ["13:00", "14:00"]},
    {"data": "2025-05-14", "janela": ["09:00", "10:00"]}
]

def calcular_tempo_deslocamento(endereco_cliente):
    return 25  # minutos simulados

@app.route("/agendamento-inteligente", methods=["POST"])
def agendar():
    dados = request.json
    nome = dados.get("nome")
    endereco = dados.get("endereco")
    equipamento = dados.get("equipamento")
    tempo_deslocamento = calcular_tempo_deslocamento(endereco)

    proxima = availability_mock[1]
    dia = proxima["data"]
    janela = proxima["janela"]

    resposta = {
        "mensagem": f"{nome}, posso agendar a visita para {dia}, com previsão de chegada entre {janela[0]} e {janela[1]}. Tudo certo?",
        "tempo_estimado_deslocamento": f"{tempo_deslocamento} minutos"
    }
    return jsonify(resposta)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
