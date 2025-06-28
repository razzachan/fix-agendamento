# main.py - Arquivo de entrada para o Railway
# Importa e executa o middleware.py atualizado

from middleware import app
import uvicorn
import os

if __name__ == "__main__":
    # Executar o servidor FastAPI
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
