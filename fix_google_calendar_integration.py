import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

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

    calendar_id = "seucalendarid@gmail.com"  # substitua pelo seu ID real
    evento_criado = service.events().insert(calendarId=calendar_id, body=evento).execute()
    return evento_criado.get("htmlLink")
