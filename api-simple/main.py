#!/usr/bin/env python3
"""
API simples para agendamento inteligente - Fix Fogões
Substitui temporariamente a API Python que está com problemas de JSON parsing
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import logging
import uvicorn
import os
from datetime import datetime

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fix Fogões API",
    description="API simples para agendamento inteligente",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class AgendamentoRequest(BaseModel):
    equipamento: str
    marca: Optional[str] = None
    problema: Optional[str] = None
    urgencia: Optional[str] = "normal"
    regiao: Optional[str] = None

class QuoteRequest(BaseModel):
    equipment: str
    brand: Optional[str] = None
    problem: Optional[str] = None
    urgency: Optional[str] = "normal"
    region: Optional[str] = None

# Função para gerar orçamento determinístico
def generate_quote(equipment: str, brand: str = None, problem: str = None, urgency: str = "normal"):
    """Gera um orçamento determinístico baseado nos parâmetros"""
    
    # Valores base por equipamento
    base_values = {
        "fogao": {"visita": 80, "servico": 150, "total": 230},
        "microondas": {"visita": 70, "servico": 120, "total": 190},
        "geladeira": {"visita": 90, "servico": 180, "total": 270},
        "lava_louças": {"visita": 85, "servico": 160, "total": 245},
        "cooktop": {"visita": 75, "servico": 140, "total": 215},
        "forno": {"visita": 80, "servico": 150, "total": 230},
    }
    
    # Normalizar equipamento
    eq = equipment.lower().replace("ã", "a").replace("ç", "c")
    if "micro" in eq or "ondas" in eq:
        eq = "microondas"
    elif "fogao" in eq or "fogão" in eq:
        eq = "fogao"
    elif "geladeira" in eq or "refrigerador" in eq:
        eq = "geladeira"
    elif "lava" in eq and "louça" in eq:
        eq = "lava_louças"
    elif "cooktop" in eq:
        eq = "cooktop"
    elif "forno" in eq:
        eq = "forno"
    else:
        eq = "fogao"  # default
    
    values = base_values.get(eq, base_values["fogao"])
    
    # Ajustar por urgência
    if urgency == "urgente":
        multiplier = 1.3
    elif urgency == "emergencia":
        multiplier = 1.5
    else:
        multiplier = 1.0
    
    # Ajustar por marca (premium)
    premium_brands = ["brastemp", "consul", "electrolux", "bosch", "fischer"]
    if brand and brand.lower() in premium_brands:
        multiplier *= 1.1
    
    # Calcular valores finais
    final_values = {
        "visita": round(values["visita"] * multiplier),
        "servico": round(values["servico"] * multiplier),
        "total": round(values["total"] * multiplier)
    }
    
    return {
        "success": True,
        "equipamento": equipment,
        "marca": brand or "Genérica",
        "problema": problem or "Não especificado",
        "valores": final_values,
        "prazo_visita": "24-48h" if urgency == "urgente" else "48-72h",
        "garantia": "90 dias",
        "observacoes": f"Orçamento para {equipment} - {brand or 'marca genérica'}"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "fix-fogoes-api-simple",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: AgendamentoRequest):
    """Endpoint principal para agendamento inteligente"""
    try:
        logger.info(f"Recebida solicitação: {request.dict()}")
        
        quote = generate_quote(
            equipment=request.equipamento,
            brand=request.marca,
            problem=request.problema,
            urgency=request.urgencia or "normal"
        )
        
        logger.info(f"Orçamento gerado: {quote}")
        return quote
        
    except Exception as e:
        logger.error(f"Erro no agendamento inteligente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.post("/api/quote/estimate")
async def quote_estimate(request: QuoteRequest):
    """Endpoint compatível com a API Node.js"""
    try:
        logger.info(f"Recebida solicitação de orçamento: {request.dict()}")
        
        quote = generate_quote(
            equipment=request.equipment,
            brand=request.brand,
            problem=request.problem,
            urgency=request.urgency or "normal"
        )
        
        # Formato compatível com a API Node.js
        result = {
            "ok": True,
            "result": {
                "equipment": request.equipment,
                "brand": request.brand or "Genérica",
                "problem": request.problem or "Não especificado",
                "values": quote["valores"],
                "visit_time": quote["prazo_visita"],
                "warranty": quote["garantia"],
                "notes": quote["observacoes"]
            }
        }
        
        logger.info(f"Orçamento retornado: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Erro na estimativa de orçamento: {str(e)}")
        return {"ok": False, "error": str(e)}

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para log de todas as requisições"""
    start_time = datetime.now()
    
    # Log da requisição
    logger.info(f"🔄 {request.method} {request.url}")
    
    # Processar requisição
    response = await call_next(request)
    
    # Log da resposta
    process_time = (datetime.now() - start_time).total_seconds()
    logger.info(f"✅ {request.method} {request.url} - {response.status_code} ({process_time:.3f}s)")
    
    return response

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
