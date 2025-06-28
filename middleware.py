# -*- coding: utf-8 -*-
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Ì∫Ä MIDDLEWARE V4.3 INICIADO - VERS√ÉO M√çNIMA PARA TESTE Ì∫Ä")

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
    return {"message": "Ì∫Ä MIDDLEWARE V4.3 - VERS√ÉO M√çNIMA ATIVA Ì∫Ä", "version": "4.3", "status": "DEPLOY_OK"}

@app.get("/health")
async def health_check():
    """Endpoint de verifica√ß√£o de sa√∫de para monitoramento"""
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
        logger.info(f"Ì∫Ä SISTEMA V4.3 - dados recebidos: {data}")
        
        return JSONResponse(
            status_code=200,
            content={
                "sucesso": True,
                "mensagem": "Sistema funcionando - vers√£o de teste",
                "version": "4.3",
                "dados_recebidos": data
            }
        )
    except Exception as e:
        logger.error(f"Ì∫® Erro: {e}")
        return JSONResponse(
            status_code=500,
            content={"sucesso": False, "mensagem": f"Erro: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
