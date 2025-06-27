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

# ============================================================================
# NOVAS FUNÇÕES PARA CLIENTECHAT - CONSULTAS E AÇÕES
# ============================================================================

def buscar_ordens_cliente(telefone):
    """
    Busca todas as ordens de serviço de um cliente pelo telefone.
    Inclui tanto pré-agendamentos quanto ordens de serviço criadas.

    Args:
        telefone (str): Número de telefone do cliente

    Returns:
        dict: Dicionário com pré-agendamentos e ordens de serviço
    """
    try:
        logger.info(f"Buscando ordens para cliente com telefone: {telefone}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Buscar pré-agendamentos
        response_agendamentos = client.table("agendamentos_ai").select("*").eq("telefone", telefone).order("created_at", desc=True).execute()

        # Buscar ordens de serviço
        response_orders = client.table("service_orders").select("*").eq("client_phone", telefone).order("created_at", desc=True).execute()

        agendamentos = response_agendamentos.data if response_agendamentos.data else []
        ordens = response_orders.data if response_orders.data else []

        logger.info(f"Encontrados {len(agendamentos)} pré-agendamentos e {len(ordens)} ordens de serviço")

        return {
            "pre_agendamentos": agendamentos,
            "ordens_servico": ordens,
            "total": len(agendamentos) + len(ordens)
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao buscar ordens do cliente: {error_message}")
        return {
            "pre_agendamentos": [],
            "ordens_servico": [],
            "total": 0,
            "erro": error_message
        }

def buscar_status_ordem(ordem_id):
    """
    Busca o status atual de uma ordem de serviço específica.

    Args:
        ordem_id (str): ID da ordem de serviço

    Returns:
        dict: Informações da ordem ou None se não encontrada
    """
    try:
        logger.info(f"Buscando status da ordem: {ordem_id}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Tentar buscar como ordem de serviço primeiro
        try:
            response_order = client.table("service_orders").select("*").eq("id", ordem_id).single().execute()

            if response_order.data:
                ordem = response_order.data
                logger.info(f"Ordem de serviço encontrada: {ordem['id']} - Status: {ordem['status']}")

                return {
                    "tipo": "ordem_servico",
                    "id": ordem["id"],
                    "numero": ordem.get("order_number", "N/A"),
                    "cliente": ordem["client_name"],
                    "equipamento": ordem["equipment_type"],
                    "status": ordem["status"],
                    "data_criacao": ordem["created_at"],
                    "data_agendada": ordem.get("scheduled_date"),
                    "tecnico": ordem.get("technician_name"),
                    "valor_final": ordem.get("final_cost"),
                    "descricao": ordem.get("description", "")
                }
        except:
            pass  # Se não encontrou como OS, tentar como pré-agendamento

        # Tentar buscar como pré-agendamento
        try:
            response_agendamento = client.table("agendamentos_ai").select("*").eq("id", ordem_id).single().execute()

            if response_agendamento.data:
                agendamento = response_agendamento.data
                logger.info(f"Pré-agendamento encontrado: {agendamento['id']} - Status: {agendamento['status']}")

                return {
                    "tipo": "pre_agendamento",
                    "id": agendamento["id"],
                    "numero": f"PA-{agendamento['id'][:8]}",
                    "cliente": agendamento["nome"],
                    "equipamento": agendamento["equipamento"],
                    "status": agendamento["status"],
                    "data_criacao": agendamento["created_at"],
                    "data_agendada": agendamento.get("data_agendada"),
                    "tecnico": agendamento.get("tecnico"),
                    "problema": agendamento["problema"],
                    "urgente": agendamento.get("urgente", False)
                }
        except:
            pass

        logger.warning(f"Ordem {ordem_id} não encontrada")
        return None

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao buscar status da ordem: {error_message}")
        return None

def buscar_orcamento_ordem(ordem_id):
    """
    Busca informações de orçamento de uma ordem de serviço.

    Args:
        ordem_id (str): ID da ordem de serviço

    Returns:
        dict: Informações do orçamento ou None se não encontrado
    """
    try:
        logger.info(f"Buscando orçamento da ordem: {ordem_id}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Buscar ordem de serviço
        response = client.table("service_orders").select("*").eq("id", ordem_id).single().execute()

        if response.data:
            ordem = response.data

            # Verificar se tem orçamento
            if ordem.get("final_cost") and ordem.get("status") in ["budget_pending", "budget_approved"]:
                return {
                    "id": ordem["id"],
                    "numero": ordem.get("order_number", "N/A"),
                    "cliente": ordem["client_name"],
                    "equipamento": ordem["equipment_type"],
                    "valor_total": ordem["final_cost"],
                    "status_orcamento": ordem["status"],
                    "descricao": ordem.get("description", ""),
                    "data_orcamento": ordem.get("updated_at"),
                    "aprovado": ordem["status"] == "budget_approved"
                }
            else:
                return {
                    "id": ordem["id"],
                    "status": "sem_orcamento",
                    "mensagem": "Orçamento ainda não disponível"
                }

        return None

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao buscar orçamento: {error_message}")
        return None

def aprovar_orcamento_ordem(ordem_id):
    """
    Aprova o orçamento de uma ordem de serviço.

    Args:
        ordem_id (str): ID da ordem de serviço

    Returns:
        dict: Resultado da aprovação
    """
    try:
        logger.info(f"Aprovando orçamento da ordem: {ordem_id}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Buscar ordem atual
        response = client.table("service_orders").select("*").eq("id", ordem_id).single().execute()

        if not response.data:
            return {
                "sucesso": False,
                "erro": "Ordem de serviço não encontrada"
            }

        ordem = response.data

        # Verificar se pode aprovar
        if ordem["status"] != "budget_pending":
            return {
                "sucesso": False,
                "erro": f"Não é possível aprovar. Status atual: {ordem['status']}"
            }

        # Atualizar status para aprovado
        update_response = client.table("service_orders").update({
            "status": "budget_approved",
            "updated_at": "now()"
        }).eq("id", ordem_id).execute()

        if update_response.data:
            logger.info(f"Orçamento aprovado com sucesso para ordem: {ordem_id}")
            return {
                "sucesso": True,
                "mensagem": "Orçamento aprovado com sucesso!",
                "ordem_id": ordem_id,
                "novo_status": "budget_approved"
            }
        else:
            return {
                "sucesso": False,
                "erro": "Falha ao atualizar status no banco de dados"
            }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao aprovar orçamento: {error_message}")
        return {
            "sucesso": False,
            "erro": error_message
        }

def reagendar_ordem(ordem_id, nova_data):
    """
    Reagenda uma ordem de serviço.

    Args:
        ordem_id (str): ID da ordem de serviço
        nova_data (str): Nova data no formato ISO

    Returns:
        dict: Resultado do reagendamento
    """
    try:
        logger.info(f"Reagendando ordem {ordem_id} para {nova_data}")

        # Obter cliente Supabase
        client = get_supabase_client()

        # Atualizar data agendada
        response = client.table("service_orders").update({
            "scheduled_date": nova_data,
            "updated_at": "now()"
        }).eq("id", ordem_id).execute()

        if response.data:
            logger.info(f"Ordem reagendada com sucesso: {ordem_id}")
            return {
                "sucesso": True,
                "mensagem": "Reagendamento realizado com sucesso!",
                "ordem_id": ordem_id,
                "nova_data": nova_data
            }
        else:
            return {
                "sucesso": False,
                "erro": "Falha ao reagendar no banco de dados"
            }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Erro ao reagendar ordem: {error_message}")
        return {
            "sucesso": False,
            "erro": error_message
        }

def formatar_resposta_clientechat(dados, tipo_resposta):
    """
    Formata dados para resposta amigável ao ClienteChat.

    Args:
        dados: Dados a serem formatados
        tipo_resposta (str): Tipo de resposta (ordens, status, orcamento, etc.)

    Returns:
        str: Mensagem formatada para o ClienteChat
    """
    try:
        if tipo_resposta == "ordens_cliente":
            if dados["total"] == 0:
                return "Não encontrei nenhuma ordem de serviço para este telefone. 🤔\n\nTalvez você tenha usado outro número? Ou quer criar uma nova solicitação?"

            mensagem = f"📋 *Suas Ordens de Serviço* ({dados['total']} encontradas):\n\n"

            # Pré-agendamentos
            for agendamento in dados["pre_agendamentos"]:
                status_emoji = "⏳" if agendamento["status"] == "pendente" else "✅" if agendamento["status"] == "convertido" else "🔄"
                mensagem += f"{status_emoji} *PA-{agendamento['id'][:8]}*\n"
                mensagem += f"🔧 {agendamento['equipamento']}\n"
                mensagem += f"📍 Status: {agendamento['status'].title()}\n"
                mensagem += f"📅 Criado: {agendamento['created_at'][:10]}\n\n"

            # Ordens de serviço
            for ordem in dados["ordens_servico"]:
                status_emoji = "🔧" if ordem["status"] == "in_progress" else "✅" if ordem["status"] == "completed" else "📋"
                mensagem += f"{status_emoji} *OS #{ordem.get('order_number', ordem['id'][:8])}*\n"
                mensagem += f"🔧 {ordem['equipment_type']}\n"
                mensagem += f"📍 Status: {ordem['status'].replace('_', ' ').title()}\n"
                if ordem.get("final_cost"):
                    mensagem += f"💰 Valor: R$ {ordem['final_cost']}\n"
                mensagem += f"📅 Criado: {ordem['created_at'][:10]}\n\n"

            mensagem += "Para mais detalhes de uma ordem específica, me envie o número dela!"
            return mensagem

        elif tipo_resposta == "status_ordem":
            if not dados:
                return "Ordem não encontrada. 🤔\n\nVerifique o número e tente novamente."

            status_emoji = {
                "pendente": "⏳",
                "agendado": "📅",
                "scheduled": "📅",
                "in_progress": "🔧",
                "completed": "✅",
                "budget_pending": "💰",
                "budget_approved": "✅"
            }.get(dados["status"], "📋")

            mensagem = f"{status_emoji} *{dados['numero']}* - {dados['equipamento']}\n\n"
            mensagem += f"👤 Cliente: {dados['cliente']}\n"
            mensagem += f"📍 Status: {dados['status'].replace('_', ' ').title()}\n"

            if dados.get("tecnico"):
                mensagem += f"👨‍🔧 Técnico: {dados['tecnico']}\n"

            if dados.get("data_agendada"):
                mensagem += f"📅 Agendado: {dados['data_agendada'][:10]}\n"

            if dados.get("valor_final"):
                mensagem += f"💰 Valor: R$ {dados['valor_final']}\n"

            if dados.get("problema"):
                mensagem += f"🔍 Problema: {dados['problema']}\n"

            mensagem += f"\n📅 Criado em: {dados['data_criacao'][:10]}"
            return mensagem

        elif tipo_resposta == "orcamento":
            if dados.get("status") == "sem_orcamento":
                return "⏳ *Orçamento em Preparação*\n\nSeu orçamento ainda está sendo preparado pela nossa equipe técnica.\n\nVocê receberá uma notificação assim que estiver pronto!"

            mensagem = f"💰 *Orçamento - {dados['numero']}*\n\n"
            mensagem += f"🔧 {dados['equipamento']}\n"
            mensagem += f"💵 Valor Total: *R$ {dados['valor_total']}*\n"

            if dados.get("descricao"):
                mensagem += f"📋 Serviço: {dados['descricao']}\n"

            if dados["aprovado"]:
                mensagem += f"\n✅ *Orçamento já aprovado!*\n"
                mensagem += f"🔧 Serviço será executado em breve."
            else:
                mensagem += f"\n⏳ *Aguardando sua aprovação*\n"
                mensagem += f"Para aprovar, responda: *aprovar {dados['numero']}*"

            return mensagem

        elif tipo_resposta == "aprovacao_sucesso":
            return f"✅ *Orçamento Aprovado!*\n\nSeu orçamento da ordem {dados['ordem_id'][:8]} foi aprovado com sucesso!\n\n🔧 Nosso técnico iniciará o serviço em breve.\n📱 Você receberá atualizações sobre o progresso."

        elif tipo_resposta == "reagendamento_sucesso":
            return f"📅 *Reagendamento Confirmado!*\n\nSua ordem foi reagendada para: {dados['nova_data'][:10]}\n\n✅ Confirmação enviada para nossa equipe.\n📱 Você receberá lembretes próximo à data."

        else:
            return "Desculpe, não consegui processar sua solicitação. 🤔\n\nTente novamente ou entre em contato conosco."

    except Exception as e:
        logger.error(f"Erro ao formatar resposta: {str(e)}")
        return "Ops! Algo deu errado ao processar sua solicitação. 😅\n\nTente novamente em alguns instantes."
