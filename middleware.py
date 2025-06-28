import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Middleware iniciado - versão com agendamento inteligente completo")

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo para agendamento
class Agendamento(BaseModel):
    nome: str
    endereco: str
    equipamento: str
    problema: str
    urgente: str = "não"
    telefone: str = None
    cpf: str = None
    email: str = None

def get_supabase_client() -> Client:
    """Criar cliente Supabase"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise Exception("Variáveis SUPABASE_URL e SUPABASE_KEY são obrigatórias")
    return create_client(url, key)

@app.get("/")
async def root():
    """Endpoint principal que serve a interface web"""
    return {"message": "Fix Fogões Middleware - Sistema de Agendamento Inteligente"}

@app.post("/")
async def receber_dados(agendamento: Agendamento):
    """
    Recebe dados de agendamento do WhatsApp e insere no Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Inserir no Supabase
        response = supabase.table("agendamentos_ai").insert({
            "nome": agendamento.nome,
            "endereco": agendamento.endereco,
            "equipamento": agendamento.equipamento,
            "problema": agendamento.problema,
            "urgente": agendamento.urgente.lower() in ['sim', 'true', 'urgente'],
            "telefone": agendamento.telefone,
            "cpf": agendamento.cpf,
            "email": agendamento.email,
            "status": "pendente",
            "origem": "whatsapp"
        }).execute()
        
        logger.info(f"Agendamento inserido: {response}")
        
        return {
            "sucesso": True,
            "mensagem": "Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"
        }
        
    except Exception as e:
        logger.error(f"Erro ao inserir agendamento: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar agendamento: {str(e)}"
        }

@app.get("/api/status")
async def api_status():
    """Endpoint de verificação de saúde da API"""
    return {"status": "online", "timestamp": datetime.now().isoformat()}

@app.post("/agendamento")
async def agendamento_alternativo(request: Request):
    """Endpoint alternativo para compatibilidade com configurações anteriores"""
    try:
        data = await request.json()
        agendamento = Agendamento(**data)
        return await receber_dados(agendamento)
    except Exception as e:
        logger.error(f"Erro no endpoint alternativo: {e}")
        return {"sucesso": False, "mensagem": f"Erro: {str(e)}"}

@app.get("/agendamento-inteligente")
async def agendamento_inteligente_get():
    """Endpoint para verificar se o serviço de agendamento inteligente está online"""
    return {"status": "online", "message": "Serviço de agendamento inteligente ativo"}

@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """Endpoint para agendamento inteligente via Clientechat"""
    try:
        data = await request.json()
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")
        
        supabase = get_supabase_client()
        
        # Inserir no Supabase
        response = supabase.table("agendamentos_ai").insert({
            "nome": data.get("nome", ""),
            "endereco": data.get("endereco", ""),
            "equipamento": data.get("equipamento", ""),
            "problema": data.get("problema", ""),
            "urgente": data.get("urgente", "não").lower() in ['sim', 'true', 'urgente'],
            "telefone": data.get("telefone", ""),
            "cpf": data.get("cpf", ""),
            "email": data.get("email", ""),
            "status": "pendente",
            "origem": "clientechat_inteligente"
        }).execute()
        
        logger.info(f"Agendamento inteligente inserido: {response}")
        
        return {
            "sucesso": True,
            "mensagem": "Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"
        }
        
    except Exception as e:
        logger.error(f"Erro no agendamento inteligente: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar agendamento: {str(e)}"
        }

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde para monitoramento"""
    return {
        "status": "healthy",
        "environment": {
            "SUPABASE_URL": "Definida" if os.getenv("SUPABASE_URL") else "Não definida",
            "SUPABASE_KEY": "Definida" if os.getenv("SUPABASE_KEY") else "Não definida"
        }
    }

# Endpoint de teste para agendamento inteligente completo
@app.post("/agendamento-inteligente-completo")
async def agendamento_inteligente_completo_test():
    """Endpoint de teste para agendamento inteligente - VERSÃO 2"""
    return {"success": True, "message": "Endpoint funcionando! Versão 2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
