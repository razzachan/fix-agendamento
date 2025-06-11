#!/usr/bin/env python
import os
import sys
import time
import logging
import uvicorn
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def check_environment():
    """
    Verifica se as variáveis de ambiente necessárias estão definidas.
    """
    logger.info("Verificando variáveis de ambiente...")
    
    # Carregar variáveis de ambiente do arquivo .env se existir
    load_dotenv()
    
    # Verificar variáveis específicas
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    logger.info(f"SUPABASE_URL: {'Definida' if supabase_url else 'NÃO DEFINIDA'}")
    if supabase_url:
        logger.info(f"  Valor: {supabase_url[:20]}...")
    
    logger.info(f"SUPABASE_KEY: {'Definida' if supabase_key else 'NÃO DEFINIDA'}")
    if supabase_key:
        logger.info(f"  Valor: {supabase_key[:10]}...")
    
    # Listar todas as variáveis de ambiente (exceto as sensíveis)
    env_vars = {}
    for key, value in os.environ.items():
        if "KEY" in key or "SECRET" in key or "TOKEN" in key or "PASSWORD" in key:
            env_vars[key] = "***REDACTED***"
        else:
            env_vars[key] = value
    
    logger.info(f"Variáveis de ambiente Railway:")
    for key, value in env_vars.items():
        if key.startswith("RAILWAY_"):
            logger.info(f"  {key}: {value}")
    
    # Verificar se as variáveis estão definidas
    if not supabase_url or not supabase_key:
        logger.error("Uma ou mais variáveis de ambiente necessárias não estão definidas.")
        logger.error("Por favor, configure as variáveis de ambiente no Railway.")
        return False
    
    logger.info("Todas as variáveis de ambiente necessárias estão definidas.")
    return True

def main():
    """
    Função principal para iniciar o servidor.
    """
    logger.info("Iniciando script de inicialização do Fix Fogões Middleware...")
    
    # Verificar variáveis de ambiente
    if not check_environment():
        logger.error("Falha na verificação de variáveis de ambiente. Tentando novamente em 5 segundos...")
        time.sleep(5)
        if not check_environment():
            logger.error("Falha na verificação de variáveis de ambiente. Encerrando aplicação.")
            sys.exit(1)
    
    # Iniciar o servidor
    logger.info("Iniciando servidor FastAPI...")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

if __name__ == "__main__":
    main()
