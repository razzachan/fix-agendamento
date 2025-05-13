import os
import logging
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente do arquivo .env se existir
load_dotenv()

# Variáveis globais
SUPABASE_URL = None
SUPABASE_KEY = None
supabase = None

def get_supabase_client():
    """
    Obtém o cliente Supabase, inicializando-o se necessário.
    Isso permite que o cliente seja inicializado apenas quando necessário,
    em vez de na importação do módulo.
    """
    global supabase, SUPABASE_URL, SUPABASE_KEY
    
    if supabase is not None:
        return supabase
        
    # Obter variáveis de ambiente
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # Imprimir informações de debug
    logger.info(f"Variáveis de ambiente:")
    logger.info(f"SUPABASE_URL definida: {'Sim' if SUPABASE_URL else 'Não'}")
    logger.info(f"SUPABASE_KEY definida: {'Sim' if SUPABASE_KEY else 'Não'}")
    
    # Validar variáveis de ambiente
    if not SUPABASE_URL:
        logger.error("SUPABASE_URL não está definida nas variáveis de ambiente")
        raise ValueError("SUPABASE_URL is required")

    if not SUPABASE_KEY:
        logger.error("SUPABASE_KEY não está definida nas variáveis de ambiente")
        raise ValueError("SUPABASE_KEY is required")

    logger.info(f"Conectando ao Supabase: {SUPABASE_URL[:20]}...")

    # Criar cliente Supabase
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Conexão com Supabase estabelecida com sucesso")
        return supabase
    except Exception as e:
        logger.error(f"Erro ao conectar com Supabase: {str(e)}")
        raise

def inserir_agendamento(nome, endereco, equipamento, problema, urgente=False, status="pendente", tecnico=None):
    """
    Insere um novo agendamento na tabela agendamentos_ai do Supabase.
    
    Args:
        nome (str): Nome do cliente
        endereco (str): Endereço do cliente
        equipamento (str): Tipo de equipamento
        problema (str): Descrição do problema
        urgente (bool, optional): Se o atendimento é urgente. Padrão é False.
        status (str, optional): Status do agendamento. Padrão é "pendente".
        tecnico (str, optional): Nome do técnico designado. Padrão é None.
        
    Returns:
        bool: True se o agendamento foi inserido com sucesso, False caso contrário
    """
    try:
        logger.info(f"Inserindo agendamento para {nome} - {equipamento}")
        
        # Obter cliente Supabase
        client = get_supabase_client()
        
        # Preparar dados para inserção
        dados = {
            "nome": nome,
            "endereco": endereco,
            "equipamento": equipamento,
            "problema": problema,
            "urgente": urgente,
            "status": status,
            "tecnico": tecnico
        }
        
        # Remover campos None
        dados = {k: v for k, v in dados.items() if v is not None}
        
        # Inserir no Supabase
        response = client.table("agendamentos_ai").insert(dados).execute()
        
        # Verificar se a inserção foi bem-sucedida
        if response.data and len(response.data) > 0:
            logger.info(f"Agendamento inserido com sucesso: ID {response.data[0].get('id', 'N/A')}")
            return True
        else:
            logger.warning("Resposta vazia do Supabase ao inserir agendamento")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao inserir agendamento: {str(e)}")
        return False

# Função compatível com a versão anterior para manter retrocompatibilidade
def registrar_agendamento(data):
    """
    Versão compatível com código anterior que aceita um dicionário de dados.
    """
    return inserir_agendamento(
        nome=data.get("nome"),
        endereco=data.get("endereco"),
        equipamento=data.get("equipamento"),
        problema=data.get("problema"),
        urgente=data.get("urgente", False),
        status=data.get("status", "pendente"),
        tecnico=data.get("tecnico")
    )
