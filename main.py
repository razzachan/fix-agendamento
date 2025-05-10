from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
import datetime

app = Flask(__name__)

# === Função para selecionar técnico com base no equipamento ===
def selecionar_tecnico(equipamento: str) -> str:
    equipamento = equipamento.lower()
    tecnicos = [
        {
            "nome": "Paulo Cesar",
            "email": "betonipaulo@gmail.com",
            "especialidades": ["fogão", "micro-ondas", "forno", "lavadora", "secadora", "adega"]
        },
        {
            "nome": "Marcelo Moritz",
            "email": "marcelodsmoritz@gmail.com",
            "especialidades": ["coifa"]
        }
    ]
    for tecnico in tecnicos:
        for especialidade in tecnico["especialidades"]:
            if especialidade in equipamento:
                return tecnico["email"]
    return "betonipaulo@gmail.com"  # fallback padrão

# === Função para criar evento no Google Calendar ===
def criar_evento_google_calendar(nome, endereco, equipamento, problema, data, hora_inicio, hora_fim):
    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    creds = service_account.Credentials.from_service_account_file("credentials.json", scopes=SCOPES)
    service = build("calendar", "v3", credentials=creds)

    tecnico_email = selecionar_tecnico(equipamento)

    evento = {
        "summary": f"Atendimento Fix - {nome}",
        "location": endereco,
        "description": f"Equipamento: {equipamento}\nProblema: {problema}",
        "start": {"dateTime": f"{data}T{hora_inicio}:00", "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": f"{data}T{hora_fim}:00", "timeZone": "America/Sao_Paulo"},
        "attendees": [{"email": tecnico_email}],
        "reminders": {"useDefault": True}
    }

    calendar_id = "seucalendarid@gmail.com"  # Substituir pelo seu ID real do Google Calendar
    evento_criado = service.events().insert(calendarId=calendar_id, body=evento).execute()
    return evento_criado.get("htmlLink")


# === Simulação de disponibilidade (será substituído por lógica real em breve) ===
availability_mock = [
    {"data": "2025-05-13", "janela": ["10:00", "11:00"]},
    {"data": "2025-05-13", "janela": ["13:00", "14:00"]},
    {"data": "2025-05-14", "janela": ["09:00", "10:00"]}
]

# === Simulação de tempo de deslocamento ===
def calcular_tempo_deslocamento(endereco_cliente):
    return 25  # minutos simulados

# === Rota principal de agendamento ===
@app.route("/agendamento-inteligente", methods=["POST"])
def agendar():
    dados = request.json
    nome = dados.get("nome")
    endereco = dados.get("endereco")
    equipamento = dados.get("equipamento")
    problema = dados.get("problema")

    tempo_deslocamento = calcular_tempo_deslocamento(endereco)

    proxima_disponibilidade = availability_mock[1]
    dia = proxima_disponibilidade["data"]
    janela = proxima_disponibilidade["janela"]

    # Criar evento no Google Calendar
    link_evento = criar_evento_google_calendar(
        nome=nome,
        endereco=endereco,
        equipamento=equipamento,
        problema=problema,
        data=dia,
        hora_inicio=janela[0],
        hora_fim=janela[1]
    )

    resposta = {
        "mensagem": f"{nome}, posso agendar a visita para {dia}, com previsão de chegada entre {janela[0]} e {janela[1]}. Tudo certo?",
        "tempo_estimado_deslocamento": f"{tempo_deslocamento} minutos",
        "problema_recebido": problema,
        "link_evento": link_evento
    }

    return jsonify(resposta)

if __name__ == "__main__":
    app.run(debug=True)
