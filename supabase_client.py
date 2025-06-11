import os
import logging
import sys
import time
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

# Número máximo de tentativas de conexão
MAX_RETRIES = 3
# Tempo de espera entre tentativas (em segundos)
RETRY_DELAY = 2

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

    # Listar todas as variáveis de ambiente (exceto as sensíveis)
    env_vars = {}
    for key, value in os.environ.items():
        if "KEY" in key or "SECRET" in key or "TOKEN" in key or "PASSWORD" in key:
            env_vars[key] = "***REDACTED***"
        else:
            env_vars[key] = value
    logger.info(f"Todas as variáveis de ambiente: {env_vars}")

    # Validar variáveis de ambiente
    if not SUPABASE_URL:
        logger.error("SUPABASE_URL não está definida nas variáveis de ambiente")
        raise ValueError("SUPABASE_URL is required")

    if not SUPABASE_KEY:
        logger.error("SUPABASE_KEY não está definida nas variáveis de ambiente")
        raise ValueError("SUPABASE_KEY is required")

    logger.info(f"Conectando ao Supabase: {SUPABASE_URL[:20]}...")

    # Tentar criar cliente Supabase com retries
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"Tentativa {attempt} de {MAX_RETRIES} para conectar ao Supabase")
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Conexão com Supabase estabelecida com sucesso")
            return supabase
        except Exception as e:
            logger.error(f"Erro ao conectar com Supabase (tentativa {attempt}): {str(e)}")
            if attempt < MAX_RETRIES:
                logger.info(f"Aguardando {RETRY_DELAY} segundos antes de tentar novamente...")
                time.sleep(RETRY_DELAY)
            else:
                logger.error("Número máximo de tentativas excedido. Não foi possível conectar ao Supabase.")
                raise

def atualizar_agendamento(id, updates):
    """
    Atualiza um agendamento existente na tabela agendamentos_ai do Supabase.

    Args:
        id (str): ID do agendamento a ser atualizado
        updates (dict): Dicionário com os campos a serem atualizados

    Returns:
        bool: True se o agendamento foi atualizado com sucesso, False caso contrário
    """
    try:
        logger.info(f"Atualizando agendamento {id} com {updates}")

        # Converter urgente para booleano se for string
        if "urgente" in updates and isinstance(updates["urgente"], str):
            urgente_bool = updates["urgente"].lower() in ['true', 'sim', 'yes', 's', 'y', '1', 'verdadeiro', 'verdade']
            logger.info(f"Convertendo urgente de string '{updates['urgente']}' para booleano {urgente_bool}")
            updates["urgente"] = urgente_bool

        # Obter cliente Supabase
        client = get_supabase_client()

        # Atualizar no Supabase
        response = client.table("agendamentos_ai").update(updates).eq("id", id).execute()

        # Verificar se a atualização foi bem-sucedida
        if response.data and len(response.data) > 0:
            logger.info(f"Agendamento atualizado com sucesso: ID {id}")
            return True
        else:
            logger.warning(f"Resposta vazia do Supabase ao atualizar agendamento {id}")
            return False

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao atualizar agendamento: {error_message}")

        # Verificar se o erro é relacionado a permissões
        if "violates row-level security policy" in error_message:
            logger.error("Erro de permissão: A política de segurança em nível de linha (RLS) está impedindo a atualização.")
            logger.error("Verifique se a chave de API tem permissões suficientes ou se as políticas RLS estão configuradas corretamente.")

        return False

def inserir_agendamento(nome, endereco, equipamento, problema, urgente=False, status="pendente", tecnico=None, data_agendada=None, telefone=None, cpf=None, email=None, equipamentos=None, problemas=None, tipos_atendimento=None):
    """
    Insere um novo agendamento na tabela agendamentos_ai do Supabase.

    Args:
        nome (str): Nome do cliente
        endereco (str): Endereço do cliente
        equipamento (str): Tipo de equipamento
        problema (str): Descrição do problema
        urgente (bool or str, optional): Se o atendimento é urgente. Pode ser bool ou str. Padrão é False.
        status (str, optional): Status do agendamento. Padrão é "pendente".
        tecnico (str, optional): Nome do técnico designado. Padrão é None.
        data_agendada (str, optional): Data e hora agendadas para o atendimento. Padrão é None.
        telefone (str, optional): Número de telefone do cliente. Padrão é None.
        cpf (str, optional): CPF do cliente. Padrão é None.
        email (str, optional): Email do cliente. Padrão é None.
        equipamentos (list, optional): Lista de equipamentos para múltiplos equipamentos. Padrão é None.
        problemas (list, optional): Lista de problemas correspondentes aos equipamentos. Padrão é None.
        tipos_atendimento (list, optional): Lista de tipos de atendimento por equipamento. Padrão é None.

    Returns:
        bool: True se o agendamento foi inserido com sucesso, False caso contrário
    """
    try:
        logger.info(f"Inserindo agendamento para {nome} - {equipamento}")

        # Converter urgente para booleano se for string
        logger.info(f"Tipo de urgente antes da conversão: {type(urgente).__name__}, valor: {urgente}")
        if isinstance(urgente, str):
            urgente_bool = urgente.lower() in ['true', 'sim', 'yes', 's', 'y', '1', 'verdadeiro', 'verdade']
            logger.info(f"Convertendo urgente de string '{urgente}' para booleano {urgente_bool}")
            urgente = urgente_bool
        logger.info(f"Tipo de urgente após a conversão: {type(urgente).__name__}, valor: {urgente}")

        # Preparar dados para inserção
        dados = {
            "nome": nome,
            "endereco": endereco,
            "equipamento": equipamento,
            "problema": problema,
            "urgente": urgente,
            "status": status,
            "tecnico": tecnico,
            "data_agendada": data_agendada,
            "telefone": telefone,
            "cpf": cpf,
            "email": email,
            "origem": "clientechat"  # Adicionar origem como clientechat
        }

        # Adicionar novos campos se fornecidos
        if equipamentos:
            import json
            dados["equipamentos"] = json.dumps(equipamentos)

        if problemas:
            import json
            dados["problemas"] = json.dumps(problemas)

        if tipos_atendimento:
            import json
            dados["tipos_atendimento"] = json.dumps(tipos_atendimento)

        # Remover campos None
        dados = {k: v for k, v in dados.items() if v is not None}

        # Obter cliente Supabase
        client = get_supabase_client()

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
        error_message = str(e)
        logger.error(f"Erro ao inserir agendamento: {error_message}")

        # Verificar se o erro é relacionado a permissões
        if "violates row-level security policy" in error_message:
            logger.error("Erro de permissão: A política de segurança em nível de linha (RLS) está impedindo a inserção.")
            logger.error("Verifique se a chave de API tem permissões suficientes ou se as políticas RLS estão configuradas corretamente.")

        return False

def listar_agendamentos(status=None, tecnico=None, data_inicio=None, data_fim=None, urgente=None, limit=100):
    """
    Lista agendamentos com filtros opcionais.

    Args:
        status (str, optional): Filtrar por status
        tecnico (str, optional): Filtrar por técnico
        data_inicio (str, optional): Filtrar por data de criação inicial
        data_fim (str, optional): Filtrar por data de criação final
        urgente (bool, optional): Filtrar por urgência
        limit (int, optional): Limite de resultados (padrão: 100)

    Returns:
        list: Lista de agendamentos ou lista vazia se nenhum encontrado
    """
    try:
        logger.info(f"Listando agendamentos com filtros: status={status}, tecnico={tecnico}, data_inicio={data_inicio}, data_fim={data_fim}, urgente={urgente}, limit={limit}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Iniciar query
        query = client.table("agendamentos_ai").select("*")

        # Aplicar filtros
        if status:
            query = query.eq("status", status)

        if tecnico:
            query = query.eq("tecnico", tecnico)

        if urgente is not None:
            query = query.eq("urgente", urgente)

        if data_inicio:
            query = query.gte("created_at", data_inicio)

        if data_fim:
            query = query.lte("created_at", data_fim)

        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order("created_at", desc=True)

        # Limitar resultados
        query = query.limit(limit)

        # Executar query
        response = query.execute()

        # Verificar se a busca foi bem-sucedida
        if response.data:
            logger.info(f"Encontrados {len(response.data)} agendamentos")
            return response.data
        else:
            logger.warning("Nenhum agendamento encontrado com os filtros especificados")
            return []

    except Exception as e:
        logger.error(f"Erro ao listar agendamentos: {str(e)}")
        return []

def buscar_agendamento(id):
    """
    Busca um agendamento específico pelo ID.

    Args:
        id (str): ID do agendamento a ser buscado

    Returns:
        dict: Dados do agendamento ou None se não encontrado
    """
    try:
        logger.info(f"Buscando agendamento com ID: {id}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Buscar no Supabase
        response = client.table("agendamentos_ai").select("*").eq("id", id).execute()

        # Verificar se a busca foi bem-sucedida
        if response.data and len(response.data) > 0:
            logger.info(f"Agendamento encontrado: {response.data[0]}")
            return response.data[0]
        else:
            logger.warning(f"Agendamento não encontrado: {id}")
            return None

    except Exception as e:
        logger.error(f"Erro ao buscar agendamento: {str(e)}")
        return None

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
        tecnico=data.get("tecnico"),
        data_agendada=data.get("data_agendada"),
        telefone=data.get("telefone"),
        cpf=data.get("cpf"),
        email=data.get("email")
    )
