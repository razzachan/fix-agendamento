# -*- coding: utf-8 -*-
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("� MIDDLEWARE V4.3 INICIADO - VERSÃO MÍNIMA PARA TESTE �")

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Endpoint principal que serve a interface web"""
    return {"message": "� MIDDLEWARE V4.3 - VERSÃO MÍNIMA ATIVA �", "version": "4.3", "status": "DEPLOY_OK"}

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde para monitoramento"""
    return {
        "status": "healthy",
        "version": "4.3",
        "message": "Servidor funcionando corretamente"
    }

@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """Endpoint de teste para agendamento inteligente"""
    try:
        data = await request.json()
        logger.info(f"� SISTEMA V4.3 - dados recebidos: {data}")
        
        return JSONResponse(
            status_code=200,
            content={
                "sucesso": True,
                "mensagem": "Sistema funcionando - versão de teste",
                "version": "4.3",
                "dados_recebidos": data
            }
        )
    except Exception as e:
        logger.error(f"� Erro: {e}")
        return JSONResponse(
            status_code=500,
            content={"sucesso": False, "mensagem": f"Erro: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
