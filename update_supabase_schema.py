import os
import logging
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente do arquivo .env se existir
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def get_supabase_client():
    """
    Inicializa e retorna o cliente Supabase.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Variáveis de ambiente SUPABASE_URL e/ou SUPABASE_KEY não definidas")
        sys.exit(1)

    try:
        client = create_client(supabase_url, supabase_key)
        logger.info("Cliente Supabase inicializado com sucesso")
        return client
    except Exception as e:
        logger.error(f"Erro ao inicializar cliente Supabase: {str(e)}")
        sys.exit(1)

def check_and_update_schema():
    """
    Verifica se a tabela agendamentos_ai tem os campos necessários e os adiciona se necessário.
    """
    client = get_supabase_client()

    # Verificar se a tabela existe
    try:
        # Tentar buscar um registro para verificar se a tabela existe
        response = client.table("agendamentos_ai").select("*").limit(1).execute()
        logger.info("Tabela agendamentos_ai existe")
    except Exception as e:
        logger.error(f"Erro ao verificar tabela agendamentos_ai: {str(e)}")
        logger.error("A tabela agendamentos_ai pode não existir. Crie-a manualmente no Supabase.")
        sys.exit(1)

    # Verificar se os campos existem
    try:
        # Obter informações sobre a tabela
        # Nota: Isso é uma simulação, pois a API do Supabase não fornece uma maneira direta de verificar o schema
        # Vamos tentar inserir um registro com os novos campos e ver se funciona

        test_data = {
            "nome": "TESTE SCHEMA - Verificação de Campos",
            "endereco": "Endereço de Teste Schema",
            "equipamento": "Equipamento de Teste Schema",
            "problema": "Problema de Teste - Verificação de Schema",
            "urgente": False,
            "status": "teste",
            "tecnico": "Sistema (teste schema)",
            "telefone": "11999999999",
            "cpf": "12345678900",
            "email": "teste@example.com",
            "origem": "teste_schema"
        }

        # Tentar inserir com os novos campos
        response = client.table("agendamentos_ai").insert(test_data).execute()

        if response.data and len(response.data) > 0:
            logger.info("Inserção de teste com novos campos bem-sucedida")
            logger.info("Os campos telefone, cpf e email já existem na tabela")

            # Remover o registro de teste
            test_id = response.data[0].get("id")
            if test_id:
                client.table("agendamentos_ai").delete().eq("id", test_id).execute()
                logger.info(f"Registro de teste removido: ID {test_id}")

            return True
        else:
            logger.warning("Inserção de teste não retornou dados")
            return False

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao verificar campos: {error_message}")

        # Verificar se o erro é devido à falta de colunas
        if "column" in error_message.lower() and "does not exist" in error_message.lower():
            logger.warning("Alguns campos podem estar faltando. Tentando adicionar...")

            # Adicionar os campos faltantes via SQL
            try:
                # Adicionar campo telefone se não existir
                if "telefone" in error_message:
                    client.rpc("execute_sql", {"query": "ALTER TABLE agendamentos_ai ADD COLUMN IF NOT EXISTS telefone TEXT"}).execute()
                    logger.info("Campo 'telefone' adicionado com sucesso")

                # Adicionar campo cpf se não existir
                if "cpf" in error_message:
                    client.rpc("execute_sql", {"query": "ALTER TABLE agendamentos_ai ADD COLUMN IF NOT EXISTS cpf TEXT"}).execute()
                    logger.info("Campo 'cpf' adicionado com sucesso")

                # Adicionar campo email se não existir
                if "email" in error_message:
                    client.rpc("execute_sql", {"query": "ALTER TABLE agendamentos_ai ADD COLUMN IF NOT EXISTS email TEXT"}).execute()
                    logger.info("Campo 'email' adicionado com sucesso")

                # Adicionar campo origem se não existir
                if "origem" in error_message:
                    client.rpc("execute_sql", {"query": "ALTER TABLE agendamentos_ai ADD COLUMN IF NOT EXISTS origem TEXT"}).execute()
                    logger.info("Campo 'origem' adicionado com sucesso")

                # Verificar se a adição foi bem-sucedida
                return check_and_update_schema()
            except Exception as sql_error:
                logger.error(f"Erro ao adicionar campos via SQL: {str(sql_error)}")
                logger.error("Você precisará adicionar os campos manualmente no Supabase:")
                logger.error("1. Acesse o dashboard do Supabase")
                logger.error("2. Vá para 'Table Editor' > 'agendamentos_ai'")
                logger.error("3. Adicione as colunas: telefone (text), cpf (text), email (text)")
                return False
        else:
            logger.error("Erro desconhecido. Verifique as permissões e a conexão com o Supabase.")
            return False

if __name__ == "__main__":
    logger.info("Iniciando verificação e atualização do schema do Supabase...")
    success = check_and_update_schema()

    if success:
        logger.info("Schema verificado e atualizado com sucesso!")
        sys.exit(0)
    else:
        logger.error("Falha ao verificar ou atualizar o schema.")
        sys.exit(1)
