import requests
import json
import logging
import sys
import os
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# URL da API (local ou remota)
API_URL = os.getenv("API_URL", "http://localhost:8000")

def test_health_check():
    """Testa o endpoint de verificação de saúde"""
    try:
        response = requests.get(f"{API_URL}/health")
        logger.info(f"Health check status: {response.status_code}")
        logger.info(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Erro ao verificar saúde da API: {str(e)}")
        return False

def test_agendamento(dados):
    """Testa o endpoint de agendamento"""
    try:
        headers = {
            "Content-Type": "application/json"
        }
        
        logger.info(f"Enviando dados para {API_URL}: {json.dumps(dados, indent=2)}")
        
        response = requests.post(
            f"{API_URL}/",
            headers=headers,
            json=dados
        )
        
        logger.info(f"Status code: {response.status_code}")
        logger.info(f"Response: {response.json()}")
        
        return response.status_code == 200 and response.json().get("sucesso", False)
    except Exception as e:
        logger.error(f"Erro ao testar agendamento: {str(e)}")
        return False

if __name__ == "__main__":
    # Testar health check
    logger.info("Testando health check...")
    if not test_health_check():
        logger.error("Health check falhou. Verifique se a API está rodando.")
        sys.exit(1)
    
    # Dados de teste
    dados_teste = {
        "nome": "Cliente Teste",
        "endereco": "Rua de Teste, 123 - Bairro Teste - Cidade Teste/UF",
        "equipamento": "Fogão 4 bocas",
        "problema": "Não acende o forno"
    }
    
    # Testar agendamento
    logger.info("Testando endpoint de agendamento...")
    if test_agendamento(dados_teste):
        logger.info("✅ Teste de agendamento bem-sucedido!")
    else:
        logger.error("❌ Teste de agendamento falhou.")
        
    # Testar agendamento com coifa (para verificar atribuição de técnico)
    dados_teste_coifa = {
        "nome": "Cliente Teste Coifa",
        "endereco": "Rua de Teste, 456 - Bairro Teste - Cidade Teste/UF",
        "equipamento": "Coifa 60cm",
        "problema": "Motor não funciona"
    }
    
    logger.info("Testando endpoint de agendamento com coifa...")
    if test_agendamento(dados_teste_coifa):
        logger.info("✅ Teste de agendamento com coifa bem-sucedido!")
    else:
        logger.error("❌ Teste de agendamento com coifa falhou.")
