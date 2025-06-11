import os
import sys
import json
import logging
from supabase_client import inserir_agendamento, get_supabase_client

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Definir as variáveis de ambiente diretamente no script
os.environ["SUPABASE_URL"] = "https://hdyucwabemspehokoiks.supabase.co"
os.environ["SUPABASE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"

def test_inserir_agendamento_string():
    """Testa a função inserir_agendamento com o campo urgente como string."""
    logger.info("Testando inserir_agendamento com urgente como string 'sim'")
    
    # Testar com urgente como string "sim"
    result1 = inserir_agendamento(
        nome="TESTE SCRIPT - Urgente String Sim",
        endereco="Endereço de Teste Script",
        equipamento="Equipamento de Teste Script",
        problema="Problema de Teste - Urgente String Sim",
        urgente="sim",
        status="teste",
        tecnico="Sistema (teste script)"
    )
    
    logger.info(f"Resultado com urgente='sim': {result1}")
    
    # Testar com urgente como string "não"
    logger.info("Testando inserir_agendamento com urgente como string 'não'")
    result2 = inserir_agendamento(
        nome="TESTE SCRIPT - Urgente String Não",
        endereco="Endereço de Teste Script",
        equipamento="Equipamento de Teste Script",
        problema="Problema de Teste - Urgente String Não",
        urgente="não",
        status="teste",
        tecnico="Sistema (teste script)"
    )
    
    logger.info(f"Resultado com urgente='não': {result2}")
    
    # Testar com urgente como booleano True
    logger.info("Testando inserir_agendamento com urgente como booleano True")
    result3 = inserir_agendamento(
        nome="TESTE SCRIPT - Urgente Booleano True",
        endereco="Endereço de Teste Script",
        equipamento="Equipamento de Teste Script",
        problema="Problema de Teste - Urgente Booleano True",
        urgente=True,
        status="teste",
        tecnico="Sistema (teste script)"
    )
    
    logger.info(f"Resultado com urgente=True: {result3}")
    
    return result1 and result2 and result3

if __name__ == "__main__":
    logger.info("Iniciando teste de inserir_agendamento com diferentes tipos de urgente")
    result = test_inserir_agendamento_string()
    logger.info(f"Resultado final do teste: {'Sucesso' if result else 'Falha'}")
    sys.exit(0 if result else 1)
