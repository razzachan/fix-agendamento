import os
import sys
import logging
import requests
import json
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente do arquivo .env se existir
load_dotenv()

def verify_supabase_connection():
    """
    Verifica se as credenciais do Supabase estão funcionando corretamente.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    logger.info("Verificando variáveis de ambiente do Supabase...")
    
    # Verificar se as variáveis estão definidas
    if not supabase_url:
        logger.error("SUPABASE_URL não está definida nas variáveis de ambiente")
        return False
    else:
        logger.info(f"SUPABASE_URL: {supabase_url[:20]}...")
        
    if not supabase_key:
        logger.error("SUPABASE_KEY não está definida nas variáveis de ambiente")
        return False
    else:
        logger.info(f"SUPABASE_KEY: {supabase_key[:10]}...")
    
    # Tentar fazer uma requisição para o Supabase
    try:
        # Construir a URL para a tabela agendamentos_ai
        api_url = f"{supabase_url}/rest/v1/agendamentos_ai?limit=1"
        
        # Configurar os headers
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Fazer a requisição
        logger.info(f"Testando conexão com o Supabase: {api_url}")
        response = requests.get(api_url, headers=headers)
        
        # Verificar o status da resposta
        if response.status_code == 200:
            logger.info("✅ Conexão com o Supabase estabelecida com sucesso!")
            logger.info(f"Resposta: {response.json()}")
            return True
        else:
            logger.error(f"❌ Erro ao conectar com o Supabase. Status code: {response.status_code}")
            logger.error(f"Resposta: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Erro ao conectar com o Supabase: {str(e)}")
        return False

def test_insert_record():
    """
    Testa a inserção de um registro de teste no Supabase.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("Variáveis de ambiente não configuradas")
        return False
    
    try:
        # Dados de teste
        test_data = {
            "nome": "TESTE - Verificação de Ambiente",
            "endereco": "Endereço de Teste",
            "equipamento": "Equipamento de Teste",
            "problema": "Problema de Teste - Verificação de variáveis de ambiente",
            "urgente": False,
            "status": "teste",
            "tecnico": "Sistema (teste)"
        }
        
        # Construir a URL para a tabela agendamentos_ai
        api_url = f"{supabase_url}/rest/v1/agendamentos_ai"
        
        # Configurar os headers
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # Fazer a requisição
        logger.info(f"Testando inserção no Supabase: {json.dumps(test_data)}")
        response = requests.post(api_url, headers=headers, json=test_data)
        
        # Verificar o status da resposta
        if response.status_code in [200, 201]:
            logger.info("✅ Registro de teste inserido com sucesso!")
            logger.info(f"Resposta: {response.json()}")
            return True
        else:
            logger.error(f"❌ Erro ao inserir registro de teste. Status code: {response.status_code}")
            logger.error(f"Resposta: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Erro ao inserir registro de teste: {str(e)}")
        return False

def main():
    """
    Função principal que executa os testes.
    """
    logger.info("=== Verificação de Variáveis de Ambiente ===")
    
    # Verificar conexão com o Supabase
    connection_ok = verify_supabase_connection()
    
    if connection_ok:
        # Testar inserção de registro
        logger.info("\n=== Teste de Inserção de Registro ===")
        insert_ok = test_insert_record()
        
        if insert_ok:
            logger.info("\n✅ Todos os testes passaram! O ambiente está configurado corretamente.")
        else:
            logger.error("\n❌ Teste de inserção falhou. Verifique os logs acima para mais detalhes.")
    else:
        logger.error("\n❌ Teste de conexão falhou. Verifique os logs acima para mais detalhes.")
    
    # Exibir instruções para configurar no Railway
    logger.info("\n=== Instruções para Configurar no Railway ===")
    logger.info("1. Acesse o Railway Dashboard: https://railway.app/dashboard")
    logger.info("2. Selecione seu projeto")
    logger.info("3. Vá para a aba 'Variables'")
    logger.info("4. Adicione as seguintes variáveis:")
    logger.info(f"   - SUPABASE_URL: {os.getenv('SUPABASE_URL', 'sua-url-do-supabase')}")
    logger.info(f"   - SUPABASE_KEY: {os.getenv('SUPABASE_KEY', 'sua-chave-do-supabase')}")
    logger.info("5. Clique em 'Deploy' para aplicar as mudanças")

if __name__ == "__main__":
    main()
