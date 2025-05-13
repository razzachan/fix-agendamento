from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import sys
import os
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Importar depois de configurar o logging e carregar as variáveis de ambiente
try:
    from supabase_client import inserir_agendamento
    logger.info("Módulo supabase_client importado com sucesso")
except Exception as e:
    logger.error(f"Erro ao importar supabase_client: {str(e)}")
    # Não levantamos a exceção aqui para permitir que a API inicie mesmo com erro

app = FastAPI(
    title="Fix Fogões Middleware",
    description="API para receber dados de agendamentos do WhatsApp e inserir no Supabase",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Endpoint de verificação de saúde da API"""
    return {"status": "online", "message": "Fix Fogões Middleware está funcionando!"}

@app.post("/")
async def receber_dados(request: Request):
    """
    Recebe dados de agendamento do WhatsApp e insere no Supabase
    """
    try:
        # Obter dados da requisição
        dados = await request.json()
        logger.info(f"Dados recebidos: {dados}")
        
        # Validar campos obrigatórios
        campos_obrigatorios = ["nome", "endereco", "equipamento", "problema"]
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                logger.error(f"Campo obrigatório ausente: {campo}")
                return JSONResponse(
                    status_code=400,
                    content={"mensagem": f"Campo obrigatório ausente: {campo}"}
                )
        
        nome = dados.get("nome")
        endereco = dados.get("endereco")
        equipamento = dados.get("equipamento")
        problema = dados.get("problema")
        urgente = dados.get("urgente", False)
        
        # Determinar o técnico com base no tipo de equipamento
        tecnico = "Marcelo (marcelodsmoritz@gmail.com)" if "coifa" in equipamento.lower() else "Paulo Cesar (betonipaulo@gmail.com)"
        
        # Inserir agendamento no Supabase
        inserido = inserir_agendamento(
            nome=nome,
            endereco=endereco,
            equipamento=equipamento,
            problema=problema,
            urgente=urgente,
            status="pendente",
            tecnico=tecnico
        )
        
        if inserido:
            logger.info(f"Agendamento registrado com sucesso para {nome}")
            return {
                "sucesso": True,
                "mensagem": f"Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação ���"
            }
        else:
            logger.error(f"Falha ao registrar agendamento para {nome}")
            return JSONResponse(
                status_code=500,
                content={
                    "sucesso": False,
                    "mensagem": "Houve um erro ao registrar o agendamento. Por favor, tente novamente mais tarde."
                }
            )
            
    except Exception as e:
        logger.error(f"Erro ao processar requisição: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "sucesso": False,
                "mensagem": "Erro interno do servidor. Por favor, tente novamente mais tarde."
            }
        )

@app.post("/agendamento")
async def agendamento_alternativo(request: Request):
    """Endpoint alternativo para compatibilidade com configurações anteriores"""
    return await receber_dados(request)

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde para monitoramento"""
    # Verificar variáveis de ambiente
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    env_status = {
        "SUPABASE_URL": "Definida" if supabase_url else "NÃO DEFINIDA",
        "SUPABASE_KEY": "Definida" if supabase_key else "NÃO DEFINIDA"
    }
    
    return {
        "status": "healthy",
        "environment": env_status
    }

@app.get("/env-check")
async def env_check():
    """Endpoint para verificar as variáveis de ambiente (apenas para diagnóstico)"""
    # Listar todas as variáveis de ambiente (exceto as sensíveis)
    env_vars = {}
    for key, value in os.environ.items():
        if "KEY" in key or "SECRET" in key or "TOKEN" in key or "PASSWORD" in key:
            env_vars[key] = "***REDACTED***"
        else:
            env_vars[key] = value
    
    # Verificar variáveis específicas
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    return {
        "environment_variables": env_vars,
        "supabase_status": {
            "SUPABASE_URL": "Definida" if supabase_url else "NÃO DEFINIDA",
            "SUPABASE_KEY": "Definida" if supabase_key else "NÃO DEFINIDA"
        }
    }

if __name__ == "__main__":
    logger.info("Iniciando servidor Fix Fogões Middleware...")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
