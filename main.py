# main.py - Arquivo de entrada otimizado para o Railway
# Importa e executa o middleware.py com configurações de performance

from middleware import app
import uvicorn
import os
import logging

# Configurar logging para produção
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    # Executar o servidor FastAPI com configurações otimizadas
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        workers=1,  # Railway funciona melhor com 1 worker
        timeout_keep_alive=300,  # 5 minutos
        timeout_graceful_shutdown=30,  # 30 segundos
        access_log=True,
        log_level="info"
    )
