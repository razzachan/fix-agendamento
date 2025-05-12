
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("https://hdyucwabemspehokoiks.supabase.co")
SUPABASE_KEY = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNDA3NjksImV4cCI6MjA1OTYxNjc2OX0.koJXDLh4_rEGGMFB_7JrtXj9S7JTSGxPtrozhjWoS3M")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def registrar_agendamento(data):
    return supabase.table("agendamentos_ai").insert({
        "nome": data.get("nome"),
        "endereco": data.get("endereco"),
        "equipamento": data.get("equipamento"),
        "problema": data.get("problema"),
        "urgente": data.get("urgente", False),
        "status": "pendente",
        "tecnico": data.get("tecnico")  # Pode ser None por padrão
    }).execute()
