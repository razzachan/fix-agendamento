import os
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    equipamento_2: Optional[str] = None
    problema_2: Optional[str] = None
    equipamento_3: Optional[str] = None
    problema_3: Optional[str] = None
    # Novos parâmetros para tipos de atendimento
    tipo_atendimento_1: Optional[str] = "em_domicilio"
    tipo_atendimento_2: Optional[str] = None
    tipo_atendimento_3: Optional[str] = None

# Função para obter cliente Supabase
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")
        raise ValueError("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")
    
    return create_client(url, key)

# Função para inserir agendamento no Supabase
async def inserir_agendamento(agendamento: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase_client()
    
    # Processar equipamentos, problemas e tipos de atendimento
    equipamentos = []
    problemas = []
    tipos_atendimento = []

    # Equipamento principal (sempre presente)
    if 'equipamento' in agendamento and agendamento['equipamento']:
        equipamentos.append(agendamento['equipamento'])
        problemas.append(agendamento.get('problema', 'Não especificado'))
        tipos_atendimento.append(agendamento.get('tipo_atendimento_1', 'em_domicilio'))

    # Equipamentos adicionais
    for i in range(2, 4):  # Para equipamento_2 e equipamento_3
        equip_key = f'equipamento_{i}'
        prob_key = f'problema_{i}'
        tipo_key = f'tipo_atendimento_{i}'

        if equip_key in agendamento and agendamento[equip_key]:
            equipamentos.append(agendamento[equip_key])
            problemas.append(agendamento.get(prob_key, 'Não especificado'))
            tipos_atendimento.append(agendamento.get(tipo_key, 'em_domicilio'))
    
    # Preparar dados para inserção
    dados_agendamento = {
        "nome": agendamento.get("nome", ""),
        "endereco": agendamento.get("endereco", ""),
        "equipamento": agendamento.get("equipamento", ""),
        "problema": agendamento.get("problema", ""),
        "urgente": agendamento.get("urgente", "não").lower() == "sim",
        "status": "pendente",
        "telefone": agendamento.get("telefone", ""),
        "cpf": agendamento.get("cpf", ""),
        "email": agendamento.get("email", ""),
        "origem": "clientechat",
        "equipamentos": json.dumps(equipamentos) if equipamentos else None,
        "problemas": json.dumps(problemas) if problemas else None,
        "tipos_atendimento": json.dumps(tipos_atendimento) if tipos_atendimento else None
    }
    
    logger.info(f"Inserindo agendamento: {dados_agendamento}")
    
    try:
        response = supabase.table("agendamentos_ai").insert(dados_agendamento).execute()
        logger.info(f"Agendamento inserido com sucesso: {response}")
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Erro ao inserir agendamento: {e}")
        return {"success": False, "error": str(e)}

# Endpoint para receber agendamentos do Clientechat
@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    try:
        data = await request.json()
        logger.info(f"Dados recebidos: {data}")
        
        # Validar dados
        if not data.get("nome") or not data.get("endereco") or not data.get("equipamento"):
            logger.error("Dados incompletos")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Dados incompletos"}
            )
        
        # Inserir agendamento
        resultado = await inserir_agendamento(data)
        
        if resultado["success"]:
            return JSONResponse(
                status_code=200,
                content={"success": True, "message": "Agendamento recebido com sucesso"}
            )
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Erro ao processar agendamento: {resultado.get('error')}"}
            )
    
    except Exception as e:
        logger.error(f"Erro ao processar requisição: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar requisição: {str(e)}"}
        )

# Endpoint para verificar saúde da API
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Endpoint para listar agendamentos
@app.get("/api/agendamentos")
async def listar_agendamentos():
    try:
        supabase = get_supabase_client()
        response = supabase.table("agendamentos_ai").select("*").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Erro ao listar agendamentos: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao listar agendamentos: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
