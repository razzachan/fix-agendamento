# -*- coding: utf-8 -*-
import os
import json
import logging
import math
import asyncio
import httpx
from typing import Dict, Any, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta
import pytz
from contextlib import asynccontextmanager

# Cache global para otimização
_supabase_client = None

def obter_valor_servico(tipo_atendimento: str, valor_clientechat: float = None) -> float:
    """
    Obtém o valor do serviço baseado no valor do ClienteChat

    LÓGICA CORRETA (FLEXÍVEL):
    - TODOS os tipos usam valor do ClienteChat (mais flexível)
    - em_domicilio: Valor do ClienteChat
    - coleta_conserto: Valor do ClienteChat
    - coleta_diagnostico: Valor do ClienteChat (bot sempre passa o mesmo valor)
    """
    logger.info(f"💰 Obtendo valor para: tipo={tipo_atendimento}, valor_clientechat={valor_clientechat}")

    # TODOS os tipos usam valor do ClienteChat (mais flexível)
    if valor_clientechat and valor_clientechat > 0:
        valor_final = valor_clientechat
        logger.info(f"📱 VALOR DO CLIENTECHAT: R$ {valor_final} para {tipo_atendimento}")
    else:
        # Fallback se não vier valor do ClienteChat
        valores_fallback = {
            "em_domicilio": 150.00,
            "coleta_conserto": 120.00,
            "coleta_diagnostico": 350.00  # Fallback para coleta diagnóstico
        }
        valor_final = valores_fallback.get(tipo_atendimento, 150.00)
        logger.warning(f"⚠️ FALLBACK: Usando valor padrão R$ {valor_final} para {tipo_atendimento}")

    logger.info(f"✅ Valor final definido: R$ {valor_final}")
    return valor_final

def obter_valor_inicial(tipo_atendimento: str, valor_clientechat: float = None) -> float:
    """
    Obtém o valor inicial (sinal) baseado no tipo de atendimento

    LÓGICA:
    - coleta_diagnostico: Valor do ClienteChat (sinal de R$ 350,00 padrão)
    - em_domicilio: 0 (sem sinal)
    - coleta_conserto: 0 (sem sinal)
    """
    logger.info(f"💰 Obtendo valor inicial para: tipo={tipo_atendimento}, valor_clientechat={valor_clientechat}")

    if tipo_atendimento == "coleta_diagnostico":
        # Para coleta diagnóstico, o valor é o sinal
        if valor_clientechat and valor_clientechat > 0:
            valor_inicial = valor_clientechat
            logger.info(f"📱 SINAL DO CLIENTECHAT: R$ {valor_inicial} para coleta_diagnostico")
        else:
            valor_inicial = 350.00  # Sinal padrão
            logger.warning(f"⚠️ FALLBACK SINAL: Usando R$ {valor_inicial} para coleta_diagnostico")
    else:
        # Outros tipos não têm sinal
        valor_inicial = 0.00
        logger.info(f"📋 SEM SINAL: R$ {valor_inicial} para {tipo_atendimento}")

    logger.info(f"✅ Valor inicial definido: R$ {valor_inicial}")
    return valor_inicial

_technicians_cache = {}
_cache_timestamp = None

# Cache para geocodificação (evitar múltiplas consultas do mesmo endereço)
_geocoding_cache = {}
_geocoding_cache_timestamp = {}

def verificar_horario_real_sistema() -> dict:
    """
    🕐 VERIFICAÇÃO DE HORÁRIO REAL DO SISTEMA
    Sempre verifica e loga o horário atual antes de fazer pesquisas
    """
    try:
        # Horário Brasil (São Paulo) - principal
        agora_brasil = datetime.now(pytz.timezone('America/Sao_Paulo'))

        # Informações básicas e seguras
        info_horario = {
            "brasil": {
                "datetime": agora_brasil.isoformat(),
                "formatted": agora_brasil.strftime('%d/%m/%Y %H:%M:%S (Brasília)'),
                "date": agora_brasil.strftime('%d/%m/%Y'),
                "time": agora_brasil.strftime('%H:%M:%S'),
                "weekday_num": agora_brasil.weekday()
            }
        }

        # Log simplificado mas informativo
        logger.info("🕐 ═══════════════════════════════════════════════════════════")
        logger.info("🕐 VERIFICAÇÃO DE HORÁRIO REAL DO SISTEMA")
        logger.info(f"🇧🇷 BRASIL: {info_horario['brasil']['formatted']}")
        logger.info(f"📅 DATA:   {info_horario['brasil']['date']}")
        logger.info(f"⏰ HORA:   {info_horario['brasil']['time']}")
        logger.info("🕐 ═══════════════════════════════════════════════════════════")

        return info_horario

    except Exception as e:
        logger.error(f"❌ Erro na verificação de horário: {e}")
        # Fallback simples e seguro
        agora_fallback = datetime.now(pytz.timezone('America/Sao_Paulo'))
        return {
            "brasil": {
                "datetime": agora_fallback.isoformat(),
                "formatted": agora_fallback.strftime('%d/%m/%Y %H:%M:%S (Brasília)'),
                "date": agora_fallback.strftime('%d/%m/%Y'),
                "time": agora_fallback.strftime('%H:%M:%S'),
                "weekday_num": agora_fallback.weekday()
            },
            "erro": str(e)
        }

def validar_data_pesquisa(data_inicio: datetime, contexto: str = "pesquisa") -> datetime:
    """
    🔍 VALIDAÇÃO DE DATA PARA PESQUISAS
    Garante que a data de início está correta e não é no passado
    """
    try:
        agora_brasil = datetime.now(pytz.timezone('America/Sao_Paulo'))

        # Se data_inicio não tem timezone, assumir Brasil
        if data_inicio.tzinfo is None:
            data_inicio = pytz.timezone('America/Sao_Paulo').localize(data_inicio)

        # Converter para timezone Brasil se necessário
        if data_inicio.tzinfo != pytz.timezone('America/Sao_Paulo'):
            data_inicio = data_inicio.astimezone(pytz.timezone('America/Sao_Paulo'))

        # Verificar se não é no passado
        if data_inicio.date() < agora_brasil.date():
            logger.warning(f"⚠️ {contexto.upper()}: Data no passado detectada!")
            logger.warning(f"   Data solicitada: {data_inicio.strftime('%d/%m/%Y')}")
            logger.warning(f"   Data atual: {agora_brasil.strftime('%d/%m/%Y')}")
            logger.warning(f"   Ajustando para próximo dia útil...")

            # Ajustar para próximo dia útil
            data_inicio = calcular_data_inicio_otimizada(urgente=False)

        logger.info(f"✅ {contexto.upper()}: Data validada - {data_inicio.strftime('%d/%m/%Y %H:%M:%S (Brasília)')}")
        return data_inicio

    except Exception as e:
        logger.error(f"❌ Erro na validação de data para {contexto}: {e}")
        # Fallback para próximo dia útil
        return calcular_data_inicio_otimizada(urgente=False)

def calcular_data_inicio_otimizada(urgente: bool = False) -> datetime:
    """
    🎯 NOVA LÓGICA: Sempre calcular a data de início mais próxima possível

    ANTES: Urgente = +1 dia, Normal = +2 dias
    AGORA: Urgente = +1 dia, Normal = +1 dia (sempre o mais próximo)

    Isso garante que sempre oferecemos as datas mais próximas disponíveis
    """
    # 🕐 SEMPRE USAR HORÁRIO BRASIL CORRETO
    agora = datetime.now(pytz.timezone('America/Sao_Paulo'))
    logger.info(f"🕐 Horário atual para cálculo: {agora.strftime('%d/%m/%Y %H:%M:%S (Brasília)')}")

    # 🎯 SEMPRE COMEÇAR NO PRÓXIMO DIA ÚTIL DISPONÍVEL
    inicio = agora + timedelta(days=1)

    # Pular para o próximo dia útil se necessário
    while inicio.weekday() >= 5:  # 5=sábado, 6=domingo
        inicio += timedelta(days=1)

    logger.info(f"🎯 Data início otimizada: {inicio.strftime('%Y-%m-%d')} (Urgente: {urgente})")
    return inicio

async def gerar_horarios_proximas_datas_disponiveis(technician_id: str, urgente: bool = False, tipo_atendimento: str = "em_domicilio", endereco: str = "") -> List[Dict]:
    """
    🎯 NOVA FUNÇÃO: Gera horários sempre priorizando as datas mais próximas disponíveis

    Esta função substitui a lógica complexa por uma busca sequencial simples:
    1. Começa no próximo dia útil
    2. Verifica disponibilidade sequencialmente
    3. Para assim que encontrar 3 horários
    """
    try:
        logger.info(f"🎯 Gerando horários próximas datas - Técnico: {technician_id}, Urgente: {urgente}, Tipo: {tipo_atendimento}")

        # 🎯 LÓGICA ESPECÍFICA POR TIPO DE ATENDIMENTO
        if tipo_atendimento in ["coleta_diagnostico", "coleta_conserto"]:
            # COLETA: Prazo até 7 dias úteis (mais flexível)
            logger.info(f"📦 COLETA: Prazo estendido até 7 dias úteis")
            inicio = calcular_data_inicio_otimizada(urgente)
            max_dias = 10  # Buscar em até 10 dias para ter mais opções
        else:
            # EM DOMICÍLIO: Preferencialmente mesmo dia/próximo dia
            logger.info(f"🏠 DOMICÍLIO: Prioridade para datas próximas")
            inicio = calcular_data_inicio_otimizada(urgente)
            max_dias = 5  # Buscar em até 5 dias (mais restrito)

        # Determinar grupo logístico do endereço solicitado
        grupo_solicitado = determine_logistics_group(endereco) if endereco else "A"
        logger.info(f"🎯 Grupo logístico solicitado: {grupo_solicitado}")

        horarios_disponiveis = []
        supabase = get_supabase_client()

        # Horários comerciais preferenciais
        horarios_comerciais = [
            {"hora": 9, "texto": "9h e 10h"},
            {"hora": 10, "texto": "10h e 11h"},
            {"hora": 14, "texto": "14h e 15h"},
            {"hora": 15, "texto": "15h e 16h"},
            {"hora": 16, "texto": "16h e 17h"}
        ]

        # Buscar sequencialmente até encontrar 3 horários
        dia_offset = 0
        while len(horarios_disponiveis) < 3 and dia_offset < max_dias:  # Limite baseado no tipo de atendimento
            data_verificacao = inicio + timedelta(days=dia_offset)
            dia_offset += 1

            # Pular fins de semana
            if data_verificacao.weekday() >= 5:
                continue

            # 🚫 REGRA GRUPO C: Nunca aos sábados e segundas-feiras
            if grupo_solicitado == 'C':
                # Segunda-feira = 0, Sábado = 5
                if data_verificacao.weekday() == 0:  # Segunda-feira
                    data_str = data_verificacao.strftime('%d/%m/%Y')
                    logger.warning(f"🚫 GRUPO C: Pulando segunda-feira {data_str}")
                    continue
                # Sábado já é pulado pelo fim de semana acima

                # 🚫 REGRA GRUPO C: Nunca no dia seguinte se já houver Grupo C hoje
                if await verificar_grupo_c_consecutivo(data_verificacao, technician_id, supabase):
                    data_str = data_verificacao.strftime('%d/%m/%Y')
                    logger.warning(f"🚫 GRUPO C: Pulando {data_str} - já há Grupo C no dia anterior")
                    continue

            # 🚫 VERIFICAR CONFLITOS DE GRUPOS LOGÍSTICOS
            conflito_info = await verificar_conflito_grupos_logisticos(
                data_verificacao, grupo_solicitado, technician_id, supabase
            )

            if conflito_info["conflito"]:
                logger.warning(f"🚫 BLOQUEANDO {data_verificacao.strftime('%d/%m/%Y')}: {conflito_info['motivo']}")
                continue

            # Verificar cada horário do dia
            for horario_info in horarios_comerciais:
                if len(horarios_disponiveis) >= 3:
                    break

                # ✅ PRESERVAR TIMEZONE BRASIL AO CRIAR HORÁRIO
                if data_verificacao.tzinfo is not None:
                    # Se tem timezone, usar replace preservando timezone
                    horario_dt = data_verificacao.replace(
                        hour=horario_info["hora"],
                        minute=0,
                        second=0,
                        microsecond=0
                    )
                else:
                    # Se não tem timezone, assumir Brasil e localizar
                    horario_dt = data_verificacao.replace(
                        hour=horario_info["hora"],
                        minute=0,
                        second=0,
                        microsecond=0
                    )
                    horario_dt = pytz.timezone('America/Sao_Paulo').localize(horario_dt)

                # Verificar disponibilidade
                disponivel = await verificar_horario_disponivel_tecnico(technician_id, horario_dt)
                logger.info(f"🔍 DEBUG: {data_verificacao.strftime('%d/%m/%Y')} {horario_info['hora']}h - Disponível: {disponivel}")

                if disponivel:
                    # 🚫 VERIFICAR CONFLITOS DE GRUPOS LOGÍSTICOS
                    # Primeiro precisamos determinar o grupo do endereço atual
                    # Como não temos o endereço aqui, vamos fazer a verificação na função que chama
                    # Por enquanto, vamos continuar e fazer a verificação depois

                    # Formatar data
                    dias_semana = {
                        'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                        'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                        'Friday': 'Sexta-feira', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
                    }

                    dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                    data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                    # Calcular score baseado na proximidade (mais próximo = maior score)
                    score_proximidade = 50 - dia_offset  # Quanto mais próximo, maior o score
                    score_horario = 15 if horario_info["hora"] <= 10 else 10  # Manhã preferencial
                    score_total = score_proximidade + score_horario

                    horarios_disponiveis.append({
                        "numero": len(horarios_disponiveis) + 1,
                        "texto": f"Previsão de chegada entre {horario_info['texto']} - {data_formatada}",
                        "datetime_agendamento": horario_dt.isoformat(),
                        "dia_semana": data_formatada,
                        "hora_agendamento": f"{horario_info['hora']:02d}:00",
                        "score_otimizacao": score_total,
                        "grupo_logistico": "A"  # Será ajustado pela função principal
                    })

                    logger.info(f"✅ Horário próximo encontrado: {data_formatada} {horario_info['hora']}h (Score: {score_total})")

        logger.info(f"🎯 Total de horários próximos encontrados: {len(horarios_disponiveis)}")
        return horarios_disponiveis

    except Exception as e:
        logger.error(f"❌ Erro ao gerar horários próximas datas: {e}")
        return []

async def verificar_horario_disponivel_tecnico(technician_id: str, horario_dt: datetime) -> bool:
    """
    Verifica se um técnico específico está disponível em um horário específico
    """
    try:
        supabase = get_supabase_client()

        # Verificar conflitos em service_orders
        data_str = horario_dt.strftime('%Y-%m-%d')
        hora_str = horario_dt.strftime('%H:%M')

        logger.info(f"🔍 DEBUG: Verificando {technician_id} em {data_str} {hora_str}")

        # 🔧 CORREÇÃO CRÍTICA: scheduled_date é DATETIME, filtrar manualmente por data
        response_os = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).eq("scheduled_time", hora_str).execute()

        # Filtrar manualmente por data
        conflitos_os = []
        if response_os.data:
            for os in response_os.data:
                scheduled_date_str = os.get('scheduled_date', '')
                if scheduled_date_str.startswith(data_str):
                    conflitos_os.append(os)

        if conflitos_os:
            logger.info(f"❌ DEBUG: Conflito em service_orders: {len(conflitos_os)} registros")
            return False

        # Verificar conflitos em agendamentos_ai
        inicio_range = horario_dt.isoformat()
        fim_range = (horario_dt + timedelta(hours=1)).isoformat()

        response_ai = supabase.table("agendamentos_ai").select("*").eq(
            "technician_id", technician_id
        ).gte("data_agendada", inicio_range).lte("data_agendada", fim_range).execute()

        if response_ai.data:
            logger.info(f"❌ DEBUG: Conflito em agendamentos_ai: {len(response_ai.data)} registros")
            return False

        logger.info(f"✅ DEBUG: Horário disponível!")
        return True

    except Exception as e:
        logger.error(f"❌ Erro ao verificar disponibilidade do técnico: {e}")
        return False

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Cache para horários disponíveis (para manter consistência entre ETAPA 1 e 2)
cache_horarios = {}

async def criar_cliente_com_auth_supabase(dados: Dict) -> str:
    """
    Cria cliente usando o sistema de autenticação do Supabase
    Retorna o ID do cliente criado ou existente
    """
    try:
        supabase = get_supabase_client()

        # Verificar se cliente já existe pelo telefone
        response_cliente = supabase.table("clients").select("*").eq("phone", dados["telefone"]).execute()

        if response_cliente.data:
            cliente_id = response_cliente.data[0]["id"]
            logger.info(f"✅ Cliente existente encontrado: {cliente_id}")
            # Retornar apenas o ID para clientes existentes (sem dados de acesso)
            return {"cliente_id": cliente_id, "conta_criada": False, "dados_acesso": None}

        # Usar email fornecido pelo cliente (obrigatório)
        email = dados.get("email", "").strip()
        if not email:
            # Se não tiver email, não criar conta auth (apenas cliente na tabela)
            logger.warning(f"⚠️ Cliente {dados['nome']} sem email - criando apenas registro sem auth")
            raise Exception("Email obrigatório para criação de conta de acesso")

        # Criar usuário na autenticação do Supabase
        # Senha padrão simples e fixa para todos os clientes
        senha_padrao = "123456789"  # Senha padrão simples (9 chars para atender mínimo)

        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": senha_padrao,
            "email_confirm": True,  # Confirmar email automaticamente (sem envio de email)
            "user_metadata": {
                "name": dados["nome"],
                "phone": dados["telefone"],
                "role": "client"
            }
        })

        if auth_response.user:
            user_id = auth_response.user.id
            logger.info(f"✅ Usuário auth criado: {user_id}")

            # Criar registro na tabela clients vinculado ao usuário auth
            cliente_data = {
                "user_id": user_id,
                "name": dados["nome"],
                "phone": dados["telefone"],
                "address": dados["endereco"],
                "address_complement": dados.get("complemento", ""),  # 🏠 NOVO: Complemento do endereço
                "cpf_cnpj": dados.get("cpf", ""),
                "email": email
            }

            response_novo_cliente = supabase.table("clients").insert(cliente_data).execute()
            cliente_id = response_novo_cliente.data[0]["id"]
            logger.info(f"✅ Cliente criado com auth: {cliente_id}")

            # Log dos dados de acesso para comunicação ao cliente
            logger.info(f"📧 DADOS DE ACESSO CRIADOS:")
            logger.info(f"   👤 Nome: {dados['nome']}")
            logger.info(f"   📧 Email: {email}")
            logger.info(f"   🔐 Senha: {senha_padrao}")
            logger.info(f"   🌐 Portal: app.fixfogoes.com.br")
            logger.info(f"   📋 Pode acompanhar suas ordens de serviço online")

            # Retornar cliente_id e flag de conta criada
            return {"cliente_id": cliente_id, "conta_criada": True, "dados_acesso": {
                "email": email,
                "senha": senha_padrao
            }}
        else:
            logger.error("❌ Falha ao criar usuário na autenticação")
            raise Exception("Falha na criação do usuário")

    except Exception as e:
        logger.error(f"❌ Erro ao criar cliente com auth: {e}")
        # Fallback: criar cliente sem auth (temporário)
        cliente_data = {
            "name": dados["nome"],
            "phone": dados["telefone"],
            "address": dados["endereco"],
            "cpf_cnpj": dados.get("cpf", ""),
            "email": dados.get("email", "")
        }

        response_fallback = supabase.table("clients").insert(cliente_data).execute()
        cliente_id = response_fallback.data[0]["id"]
        logger.warning(f"⚠️ Cliente criado sem auth (fallback): {cliente_id}")
        return {"cliente_id": cliente_id, "conta_criada": False, "dados_acesso": None}

async def gerar_proximo_numero_os():
    """
    Gera próximo número sequencial de OS usando o mesmo sistema do frontend
    Formato: OS #001, OS #002, OS #003...
    """
    try:
        supabase = get_supabase_client()

        # Buscar o maior número existente
        response = supabase.table("service_orders").select("order_number").neq(
            "order_number", None
        ).order("order_number", desc=True).limit(1).execute()

        next_number = 1

        if response.data and len(response.data) > 0 and response.data[0]["order_number"]:
            # Extrair número do formato "#001"
            last_number = response.data[0]["order_number"]
            import re
            number_match = re.search(r'#(\d+)', last_number)

            if number_match:
                last_num = int(number_match.group(1))
                next_number = last_num + 1

        # Formatar como "#001"
        formatted_number = f"#{next_number:03d}"

        logger.info(f"🔢 Próximo número OS gerado: {formatted_number}")
        return formatted_number

    except Exception as e:
        logger.error(f"Erro ao gerar número OS: {e}")
        logger.error(f"Tipo do erro: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Fallback para timestamp se falhar
        timestamp = int(datetime.now().timestamp()) % 10000
        return f"OS #{timestamp:04d}"

async def gerar_horarios_logistica_inteligente(
    technician_id: str,
    technician_name: str,
    grupo_logistico: str,
    coordenadas: Optional[Tuple[float, float]],
    endereco: str,
    urgente: bool = False
) -> List[Dict]:
    """
    🚀 SISTEMA DE LOGÍSTICA INTELIGENTE COMPLETO

    ESTRATÉGIAS POR GRUPO:
    - GRUPO A: Otimização por trânsito urbano (manhã prioritária)
    - GRUPO B: Balanceamento entre grupos A e C (tarde prioritária)
    - GRUPO C: Agrupamento obrigatório no mesmo dia (máxima eficiência)
    """
    try:
        logger.info(f"🚀 LOGÍSTICA INTELIGENTE: {technician_name} | Grupo {grupo_logistico} | Urgente: {urgente}")

        agora = datetime.now(pytz.timezone('America/Sao_Paulo'))
        supabase = get_supabase_client()

        # 🎯 ESTRATÉGIA ESPECÍFICA POR GRUPO
        if grupo_logistico == 'A':
            return await estrategia_grupo_a(technician_id, technician_name, coordenadas, urgente, agora, supabase)
        elif grupo_logistico == 'B':
            return await estrategia_grupo_b(technician_id, technician_name, coordenadas, urgente, agora, supabase)
        else:  # Grupo C
            return await estrategia_grupo_c(technician_id, technician_name, coordenadas, endereco, urgente, agora, supabase)

    except Exception as e:
        logger.error(f"❌ Erro na logística inteligente: {e}")
        return gerar_horarios_fixos_consistentes(urgente)

async def estrategia_grupo_a(technician_id: str, technician_name: str, coordenadas: Optional[Tuple[float, float]], urgente: bool, agora: datetime, supabase) -> List[Dict]:
    """
    🏙️ GRUPO A - FLORIANÓPOLIS CENTRO
    ESTRATÉGIA: Otimização por trânsito urbano
    - Manhã: 8h-11h (menos trânsito)
    - Tarde: 14h-16h (pós-almoço)
    - Evitar: 12h-13h (almoço), 17h+ (rush)
    """
    logger.info("🏙️ Aplicando estratégia GRUPO A - Otimização urbana")

    # Horários otimizados para trânsito urbano - HORÁRIOS COMERCIAIS
    horarios_prioritarios = [
        {"hora": 9, "texto": "9h e 10h", "score_base": 20},   # Manhã ideal
        {"hora": 10, "texto": "10h e 11h", "score_base": 18}, # Manhã boa
        {"hora": 14, "texto": "14h e 15h", "score_base": 15}, # Tarde boa
        {"hora": 15, "texto": "15h e 16h", "score_base": 12}, # Tarde ok
        {"hora": 13, "texto": "13h e 14h", "score_base": 10}, # Início tarde
        {"hora": 16, "texto": "16h e 17h", "score_base": 8}   # Final tarde
    ]

    return await processar_horarios_com_otimizacao(
        technician_id, technician_name, horarios_prioritarios,
        coordenadas, urgente, agora, supabase, "A"
    )

async def estrategia_grupo_b(technician_id: str, technician_name: str, coordenadas: Optional[Tuple[float, float]], urgente: bool, agora: datetime, supabase) -> List[Dict]:
    """
    🌆 GRUPO B - GRANDE FLORIANÓPOLIS
    ESTRATÉGIA: Balanceamento entre A e C
    - Tarde prioritária: 13h-16h (evita rush matinal)
    - Manhã secundária: 9h-11h
    - Flexibilidade para otimizar rotas
    """
    logger.info("🌆 Aplicando estratégia GRUPO B - Balanceamento regional")

    # Horários balanceados para região metropolitana - HORÁRIOS COMERCIAIS
    horarios_prioritarios = [
        {"hora": 14, "texto": "14h e 15h", "score_base": 20}, # Tarde ideal
        {"hora": 13, "texto": "13h e 14h", "score_base": 18}, # Pós-almoço
        {"hora": 15, "texto": "15h e 16h", "score_base": 16}, # Tarde boa
        {"hora": 10, "texto": "10h e 11h", "score_base": 14}, # Manhã boa
        {"hora": 9, "texto": "9h e 10h", "score_base": 12},   # Manhã ok
        {"hora": 16, "texto": "16h e 17h", "score_base": 10}  # Final tarde
    ]

    return await processar_horarios_com_otimizacao(
        technician_id, technician_name, horarios_prioritarios,
        coordenadas, urgente, agora, supabase, "B"
    )

async def estrategia_grupo_c(technician_id: str, technician_name: str, coordenadas: Optional[Tuple[float, float]], endereco: str, urgente: bool, agora: datetime, supabase) -> List[Dict]:
    """
    🏖️ GRUPO C - ROTA SEQUENCIAL LITORAL
    ESTRATÉGIA: Otimização por distanciamento sequencial

    🗺️ ROTA REAL:
    - MANHÃ: Tijucas (35km) → Itapema (55km)
    - TARDE: BC (75km) → Itajaí (95km) → Navegantes (105km)

    ⚡ REGRAS:
    - Tijucas/Itapema: Priorizar manhã (8h-12h)
    - BC/Itajaí/Navegantes: Priorizar tarde (13h-17h)
    - Agrupar no mesmo dia quando possível
    """
    logger.info("🏖️ Aplicando estratégia GRUPO C - Rota sequencial litoral")
    logger.info(f"🏖️ DEBUG: Endereço recebido: '{endereco}'")
    logger.info(f"🏖️ DEBUG: Técnico ID: {technician_id}, Nome: {technician_name}")

    # Determinar período ideal baseado na localização
    periodo_ideal = determinar_periodo_ideal_por_rota(endereco)
    logger.info(f"🗺️ Período ideal determinado: {periodo_ideal.upper()}")

    # 1. BUSCAR AGENDAMENTOS NA MESMA ROTA SEQUENCIAL
    agendamentos_rota = await buscar_agendamentos_rota_sequencial(periodo_ideal, agora, supabase)
    logger.info(f"🗺️ Agendamentos na rota {periodo_ideal}: {len(agendamentos_rota)}")

    # 2. ESTRATÉGIA BASEADA NO PERÍODO IDEAL
    if periodo_ideal == "manha":
        # MANHÃ: Tijucas + Itapema (próximos)
        return await estrategia_rota_manha(
            technician_id, technician_name, endereco, agendamentos_rota, urgente, agora, supabase
        )
    elif periodo_ideal == "tarde":
        # TARDE: BC + Itajaí + Navegantes (distantes)
        return await estrategia_rota_tarde(
            technician_id, technician_name, endereco, agendamentos_rota, urgente, agora, supabase
        )
    else:
        # QUALQUER: Usar estratégia flexível
        return await estrategia_rota_flexivel(
            technician_id, technician_name, coordenadas, urgente, agora, supabase
        )

async def processar_horarios_com_otimizacao(
    technician_id: str, technician_name: str, horarios_prioritarios: List[Dict],
    coordenadas: Optional[Tuple[float, float]], urgente: bool, agora: datetime,
    supabase, grupo: str
) -> List[Dict]:
    """
    🎯 Processa horários com otimização inteligente
    """
    horarios_disponiveis = []
    inicio = calcular_data_inicio_otimizada(urgente)

    # 🎯 BUSCAR SEMPRE AS DATAS MAIS PRÓXIMAS DISPONÍVEIS
    # Verificar próximos 15 dias úteis para garantir opções
    dias_verificados = 0
    dia_offset = 0

    while len(horarios_disponiveis) < 3 and dias_verificados < 15:
        data_verificacao = inicio + timedelta(days=dia_offset)
        dia_offset += 1

        # Pular fins de semana
        if data_verificacao.weekday() >= 5:
            continue

        # 🚫 REGRA GRUPO C: Nunca aos sábados e segundas-feiras
        if grupo == 'C':
            # Segunda-feira = 0, Sábado = 5
            if data_verificacao.weekday() == 0:  # Segunda-feira
                logger.info(f"🚫 GRUPO C: Pulando segunda-feira {data_str}")
                continue
            # Sábado já é pulado pelo fim de semana acima

            # 🚫 REGRA GRUPO C: Nunca no dia seguinte se já houver Grupo C hoje
            if await verificar_grupo_c_consecutivo(data_verificacao, technician_id, supabase):
                logger.info(f"🚫 GRUPO C: Pulando {data_str} - já há Grupo C no dia anterior")
                continue

        dias_verificados += 1

        data_str = data_verificacao.strftime('%Y-%m-%d')

        # Calcular score do dia baseado na carga de trabalho
        score_dia = await calcular_score_dia(data_str, grupo, supabase)

        # Verificar cada horário prioritário
        for horario_info in horarios_prioritarios:
            if len(horarios_disponiveis) >= 3:
                break

            # Verificar disponibilidade do técnico
            disponivel = await verificar_horario_tecnico_disponivel(
                technician_id, data_str, horario_info["hora"]
            )

            if disponivel:
                # Calcular score total
                score_total = horario_info["score_base"] + score_dia

                # Bonus por otimização de rota
                if coordenadas:
                    bonus_rota = await calcular_bonus_rota_inteligente(
                        data_str, horario_info["hora"], coordenadas, grupo, supabase
                    )
                    score_total += bonus_rota

                # Bonus por urgência
                if urgente:
                    score_total += 15

                # Criar horário otimizado
                horario_dt = data_verificacao.replace(
                    hour=horario_info["hora"], minute=0, second=0, microsecond=0
                )

                dias_semana = {
                    'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                    'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                    'Friday': 'Sexta-feira'
                }

                dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                horarios_disponiveis.append({
                    "numero": len(horarios_disponiveis) + 1,
                    "texto": f"Previsão de chegada entre {horario_info['texto']} - {data_formatada}",
                    "datetime_agendamento": horario_dt.isoformat(),
                    "dia_semana": data_formatada,
                    "hora_agendamento": f"{horario_info['hora']:02d}:00",
                    "score_otimizacao": score_total,
                    "grupo_logistico": grupo
                })

                logger.info(f"✅ Horário otimizado: {data_formatada} {horario_info['hora']}h (Score: {score_total})")

        if len(horarios_disponiveis) >= 3:
            break

    # Ordenar por score (melhor otimização primeiro)
    horarios_disponiveis.sort(key=lambda x: x.get("score_otimizacao", 0), reverse=True)

    return horarios_disponiveis[:3]

async def gerar_horarios_com_disponibilidade_tecnico(technician_id: str, technician_name: str, urgente: bool = False) -> List[Dict]:
    """
    Gera horários baseados na disponibilidade real do técnico
    """
    try:
        logger.info(f"🔍 Verificando disponibilidade real do técnico {technician_name} (ID: {technician_id})")

        agora = datetime.now(pytz.timezone('America/Sao_Paulo'))
        inicio = calcular_data_inicio_otimizada(urgente)

        # Horários preferenciais para verificar - HORÁRIOS COMERCIAIS
        horarios_preferidos = [
            {"hora": 9, "texto": "9h e 10h"},
            {"hora": 10, "texto": "10h e 11h"},
            {"hora": 13, "texto": "13h e 14h"},
            {"hora": 14, "texto": "14h e 15h"},
            {"hora": 15, "texto": "15h e 16h"},
            {"hora": 16, "texto": "16h e 17h"}
        ]

        horarios_disponiveis = []
        supabase = get_supabase_client()

        # 🎯 BUSCAR SEQUENCIALMENTE AS DATAS MAIS PRÓXIMAS
        dias_verificados = 0
        dia_offset = 0

        while len(horarios_disponiveis) < 3 and dias_verificados < 10:
            data_verificacao = inicio + timedelta(days=dia_offset)
            dia_offset += 1

            # Pular fins de semana
            if data_verificacao.weekday() >= 5:
                continue

            dias_verificados += 1

            data_str = data_verificacao.strftime('%Y-%m-%d')

            # Verificar cada horário preferido
            for horario_info in horarios_preferidos:
                horario_dt = data_verificacao.replace(
                    hour=horario_info["hora"],
                    minute=0,
                    second=0,
                    microsecond=0
                )

                # Verificar se técnico está disponível neste horário
                disponivel = await verificar_horario_tecnico_disponivel(
                    technician_id,
                    data_str,
                    horario_info["hora"]
                )

                if disponivel:
                    # Formatar data por extenso
                    dias_semana = {
                        'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                        'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                        'Friday': 'Sexta-feira'
                    }

                    dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                    data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                    horarios_disponiveis.append({
                        "numero": len(horarios_disponiveis) + 1,
                        "texto": f"Previsão de chegada entre {horario_info['texto']} - {data_formatada}",
                        "datetime_agendamento": horario_dt.isoformat(),
                        "dia_semana": data_formatada,
                        "hora_agendamento": f"{horario_info['hora']:02d}:00"
                    })

                    # Parar quando tiver 3 horários
                    if len(horarios_disponiveis) >= 3:
                        break

            # Parar quando tiver 3 horários
            if len(horarios_disponiveis) >= 3:
                break

        # Se não encontrou horários suficientes, usar fallback
        if len(horarios_disponiveis) < 3:
            logger.warning(f"⚠️ Apenas {len(horarios_disponiveis)} horários disponíveis para {technician_name}")
            # Completar com horários fixos mais distantes
            return gerar_horarios_fixos_consistentes(urgente)

        logger.info(f"✅ {len(horarios_disponiveis)} horários disponíveis encontrados para {technician_name}")
        return horarios_disponiveis

    except Exception as e:
        logger.error(f"❌ Erro ao verificar disponibilidade do técnico: {e}")
        # Fallback para horários fixos
        return gerar_horarios_fixos_consistentes(urgente)

def gerar_horarios_fixos_consistentes(urgente: bool = False) -> List[Dict]:
    """
    Gera sempre os mesmos 3 horários para garantir consistência entre ETAPA 1 e 2 (FALLBACK)
    """
    try:
        agora = datetime.now(pytz.timezone('America/Sao_Paulo'))

        # 🎯 NOVA LÓGICA: Sempre usar data mais próxima disponível
        inicio = calcular_data_inicio_otimizada(urgente)

        # Sempre gerar os mesmos 3 horários: 09:00-10:00, 14:00-15:00, 16:00-17:00
        horarios_fixos = [
            {"hora_inicio": 9, "hora_fim": 10, "texto_hora": "9h e 10h"},
            {"hora_inicio": 14, "hora_fim": 15, "texto_hora": "14h e 15h"},
            {"hora_inicio": 16, "hora_fim": 17, "texto_hora": "16h e 17h"}
        ]

        horarios = []

        # Encontrar o próximo dia útil
        data_atual = inicio
        while data_atual.weekday() >= 5:  # Pular fins de semana
            data_atual += timedelta(days=1)

        # Gerar os 3 horários fixos
        for i, horario_info in enumerate(horarios_fixos, 1):
            horario_dt = data_atual.replace(
                hour=horario_info["hora_inicio"],
                minute=0,
                second=0,
                microsecond=0
            )

            # Formatar data por extenso
            dias_semana = {
                'Monday': 'Segunda-feira',
                'Tuesday': 'Terça-feira',
                'Wednesday': 'Quarta-feira',
                'Thursday': 'Quinta-feira',
                'Friday': 'Sexta-feira',
                'Saturday': 'Sábado',
                'Sunday': 'Domingo'
            }

            dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
            data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

            horarios.append({
                "numero": i,
                "texto": f"Previsão de chegada entre {horario_info['texto_hora']} - {data_formatada}",
                "datetime_agendamento": horario_dt.isoformat(),
                "dia_semana": data_formatada,
                "hora_agendamento": f"{horario_info['hora_inicio']:02d}:00"
            })

        logger.info(f"✅ Horários fixos gerados: {[h['texto'] for h in horarios]}")
        return horarios

    except Exception as e:
        logger.error(f"Erro ao gerar horários fixos: {e}")
        return []

def gerar_chave_cache(dados: dict) -> str:
    """Gera uma chave única para o cache baseada nos dados do cliente"""
    nome = dados.get("nome", "").strip()
    endereco = dados.get("endereco", "").strip()
    equipamento = dados.get("equipamento", "").strip()
    return f"{nome}_{endereco}_{equipamento}".replace(" ", "_").lower()

def salvar_horarios_cache(dados: dict, horarios: List[Dict]) -> str:
    """Salva horários no cache e retorna a chave"""
    chave = gerar_chave_cache(dados)
    cache_horarios[chave] = {
        "horarios": horarios,
        "timestamp": datetime.now().isoformat(),
        "dados_originais": dados
    }
    logger.info(f"💾 Horários salvos no cache: {chave}")
    return chave

def recuperar_horarios_cache(dados: dict) -> Optional[List[Dict]]:
    """Recupera horários do cache"""
    chave = gerar_chave_cache(dados)
    if chave in cache_horarios:
        cache_entry = cache_horarios[chave]
        # Verificar se não expirou (30 minutos)
        timestamp = datetime.fromisoformat(cache_entry["timestamp"])
        if (datetime.now() - timestamp).total_seconds() < 1800:  # 30 minutos
            logger.info(f"📂 Horários recuperados do cache: {chave}")
            return cache_entry["horarios"]
        else:
            # Remover entrada expirada
            del cache_horarios[chave]
            logger.info(f"🗑️ Cache expirado removido: {chave}")
    return None

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL da página do Google para avaliações
GOOGLE_REVIEW_URL = "https://g.page/r/CfjiXeK7gOSLEAg/review"

# Modelo para agendamento
class Agendamento(BaseModel):
    nome: str
    endereco: str
    equipamento: str
    problema: str
    urgente: str = "não"
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    equipamento_2: Optional[str] = None
    problema_2: Optional[str] = None
    equipamento_3: Optional[str] = None
    problema_3: Optional[str] = None
    # Novos parâmetros para tipos de atendimento
    tipo_atendimento_1: Optional[str] = "em_domicilio"
    tipo_atendimento_2: Optional[str] = None
    tipo_atendimento_3: Optional[str] = None

# Modelo para consulta de disponibilidade
class ConsultaDisponibilidade(BaseModel):
    endereco: str
    urgente: str = "não"
    equipamento: str
    data_preferida: Optional[str] = None  # YYYY-MM-DD

# Configurações de roteirização inteligente
FLORIANOPOLIS_CENTER = [-48.5554, -27.5969]  # Coordenadas do centro de referência
GROUP_A_RADIUS = 15  # Até 15km do centro (corrigido)
GROUP_B_RADIUS = 30  # Entre 15km e 30km do centro (corrigido)
# Grupo C: Acima de 30km do centro

# 🗺️ ROTA SEQUENCIAL LITORAL - Ordem por distanciamento real
ROTA_LITORAL_SEQUENCIAL = [
    {"cidade": "Florianópolis", "distancia_km": 0, "grupo": "A", "periodo_ideal": "qualquer"},
    {"cidade": "São José", "distancia_km": 8, "grupo": "A", "periodo_ideal": "qualquer"},
    {"cidade": "Palhoça", "distancia_km": 12, "grupo": "A", "periodo_ideal": "qualquer"},
    {"cidade": "Biguaçu", "distancia_km": 18, "grupo": "B", "periodo_ideal": "qualquer"},
    {"cidade": "Tijucas", "distancia_km": 35, "grupo": "B", "periodo_ideal": "manha"},
    {"cidade": "Itapema", "distancia_km": 55, "grupo": "C", "periodo_ideal": "manha"},
    {"cidade": "Balneário Camboriú", "distancia_km": 75, "grupo": "C", "periodo_ideal": "tarde"},
    {"cidade": "Itajaí", "distancia_km": 95, "grupo": "C", "periodo_ideal": "tarde"},
    {"cidade": "Navegantes", "distancia_km": 105, "grupo": "C", "periodo_ideal": "tarde"}
]

# Mapeamento de CEPs para rota sequencial
CEPS_ROTA_SEQUENCIAL = {
    # Tijucas - MANHÃ (mais próximo)
    "88200": {"cidade": "Tijucas", "distancia": 35, "grupo": "B", "periodo": "manha"},

    # Itapema - MANHÃ (próximo)
    "88220": {"cidade": "Itapema", "distancia": 55, "grupo": "C", "periodo": "manha"},

    # Balneário Camboriú - TARDE (médio)
    "88330": {"cidade": "Balneário Camboriú", "distancia": 75, "grupo": "C", "periodo": "tarde"},
    "88337": {"cidade": "Balneário Camboriú", "distancia": 75, "grupo": "C", "periodo": "tarde"},
    "88339": {"cidade": "Balneário Camboriú", "distancia": 75, "grupo": "C", "periodo": "tarde"},

    # Itajaí - TARDE (distante)
    "88300": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88301": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88302": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88303": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88304": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88306": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},
    "88307": {"cidade": "Itajaí", "distancia": 95, "grupo": "C", "periodo": "tarde"},

    # Navegantes - TARDE (mais distante)
    "88370": {"cidade": "Navegantes", "distancia": 105, "grupo": "C", "periodo": "tarde"}
}

# CEPs por grupo logístico
CEPS_GRUPO_A = ['88000', '88010', '88015', '88020', '88025', '88030', '88035',
                '88040', '88045', '88050', '88053', '88054', '88055', '88056', '88058', '88060']
CEPS_GRUPO_B = ['88100', '88110', '88115', '88130', '88135', '88140', '88160',
                '88161', '88162', '88163', '88164', '88165', '88070', '88075', '88080']
CEPS_GRUPO_C = ['88200', '88210', '88220', '88300', '88330', '88340', '88345',
                '88350', '88355', '88370', '88380', '88385', '88390']

# Modelo para agendamento inteligente
class AgendamentoInteligente(BaseModel):
    nome: str
    endereco: str
    equipamento: str
    problema: str
    telefone: str
    urgente: str = "não"
    cpf: Optional[str] = None
    email: Optional[str] = None
    horario_escolhido: str  # "2025-06-28T14:00:00"

# Função para filtrar placeholders do ClienteChat
def filtrar_placeholders(valor: str) -> str:
    """
    Remove placeholders do ClienteChat ({{variavel}}) e retorna string limpa
    """
    if not valor or not isinstance(valor, str):
        return ""

    # Garantir encoding UTF-8 correto
    try:
        if isinstance(valor, bytes):
            valor = valor.decode('utf-8')
        elif isinstance(valor, str):
            # Recodificar para garantir UTF-8 correto
            valor = valor.encode('utf-8').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        logger.warning(f"Erro de encoding ao processar valor: {repr(valor)}")
        return ""

    valor = valor.strip()

    # Se é um placeholder, retornar string vazia
    if valor.startswith("{{") and valor.endswith("}}"):
        return ""

    return valor

# Função para obter cliente Supabase com cache
def get_supabase_client() -> Client:
    global _supabase_client

    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")

        if not url or not key:
            logger.error("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")
            raise ValueError("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")

        _supabase_client = create_client(url, key)
        logger.info("🔧 Cliente Supabase inicializado com cache")

    return _supabase_client

def converter_horario_para_iso(horario_str):
    """Converter horário do formato '07/07/2025 - 10:00' para ISO"""
    if not horario_str:
        return datetime.now().isoformat()

    try:
        # Formato: '07/07/2025 - 10:00' ou '07/07/2025 - Horário: 10:00'
        if ' - ' in horario_str:
            data_parte, hora_parte = horario_str.split(' - ')

            # Remover 'Horário: ' se existir
            if 'Horário: ' in hora_parte:
                hora_parte = hora_parte.replace('Horário: ', '')

            # Converter data (dd/mm/yyyy)
            dia, mes, ano = data_parte.split('/')

            # Converter hora (HH:MM)
            if ':' in hora_parte:
                hora, minuto = hora_parte.split(':')
            else:
                hora = hora_parte
                minuto = '00'

            # Criar datetime
            dt = datetime(int(ano), int(mes), int(dia), int(hora), int(minuto))

            # Converter para UTC
            dt_utc = pytz.timezone('America/Sao_Paulo').localize(dt).astimezone(pytz.UTC)

            logger.info(f"🔄 Horário convertido: '{horario_str}' -> '{dt_utc.isoformat()}'")
            return dt_utc.isoformat()

    except Exception as e:
        logger.warning(f"⚠️ Erro ao converter horário '{horario_str}': {e}")
        return datetime.now().isoformat()

    return datetime.now().isoformat()

def converter_horario_para_iso_direto(horario_iso_str):
    """Converter horário preservando o horário visual (não converter para UTC)"""
    logger.info(f"🔍 DEBUG converter_horario_para_iso_direto: entrada = {horario_iso_str} (tipo: {type(horario_iso_str)})")

    if not horario_iso_str:
        logger.info(f"🔍 DEBUG: horario_iso_str é vazio, retornando datetime.now()")
        return datetime.now().isoformat()

    try:
        # Se já está em formato ISO (ex: '2025-07-07T10:00:00-03:00')
        if 'T' in horario_iso_str and ('-03:00' in horario_iso_str or '+' in horario_iso_str):
            # Parse do datetime com timezone
            dt_with_tz = datetime.fromisoformat(horario_iso_str.replace('Z', '+00:00'))

            # Se não tem timezone info, assumir Brasil
            if dt_with_tz.tzinfo is None:
                dt_with_tz = pytz.timezone('America/Sao_Paulo').localize(dt_with_tz)

            # ✅ PRESERVAR HORÁRIO E TIMEZONE BRASIL
            # Manter o datetime com timezone para o banco de dados
            logger.info(f"🔄 Horário preservado com timezone: '{horario_iso_str}' -> '{dt_with_tz.isoformat()}'")
            return dt_with_tz.isoformat()

        # Se não está em formato ISO, usar função original
        return converter_horario_para_iso(horario_iso_str)

    except Exception as e:
        logger.warning(f"⚠️ Erro ao converter horário ISO '{horario_iso_str}': {e}")
        return datetime.now().isoformat()

# Função para determinar técnico baseado no equipamento
def determinar_tecnico(equipamento: str) -> str:
    """Determina o técnico baseado no tipo de equipamento"""
    equipamento_lower = equipamento.lower()

    if "coifa" in equipamento_lower:
        return "Marcelo (marcelodsmoritz@gmail.com)"
    else:
        return "Paulo Cesar (betonipaulo@gmail.com)"

# FUNÇÃO ANTIGA REMOVIDA - AGORA USA determine_logistics_group() COM REGRAS GRUPO C

async def gerar_horarios_disponiveis_v4(tecnico: str, grupo_logistico: str, urgente: bool, data_base: datetime = None) -> List[Dict]:
    """
    Gera horários disponíveis baseado no técnico e grupo logístico
    IMPORTANTE: data_base permite fixar a data de referência para garantir consistência entre ETAPA 1 e 2
    """
    try:
        horarios = []

        # Usar data_base se fornecida, senão usar agora
        if data_base:
            agora = data_base
            logger.info(f"🕐 Usando data base fixa: {agora}")
        else:
            agora = datetime.now(pytz.timezone('America/Sao_Paulo'))
            logger.info(f"🕐 Usando data atual: {agora}")

        # 🎯 NOVA LÓGICA: Sempre usar data mais próxima disponível
        inicio = calcular_data_inicio_otimizada(urgente)

        # Gerar horários para os próximos 7 dias
        for i in range(7):
            data = inicio + timedelta(days=i)

            # Apenas dias úteis (segunda a sexta)
            if data.weekday() < 5:
                # Horários comerciais: 9h-11h e 13h-17h
                horarios_comerciais = list(range(9, 11)) + list(range(13, 17))
                for hora in horarios_comerciais:
                    horario_dt = data.replace(hour=hora, minute=0, second=0, microsecond=0)

                    # Verificar se horário não está ocupado
                    if await verificar_horario_disponivel(horario_dt, tecnico):
                        horarios.append({
                            "datetime_agendamento": horario_dt.isoformat(),
                            "dia_semana": horario_dt.strftime("%A, %d/%m/%Y"),
                            "hora_agendamento": horario_dt.strftime("%H:%M"),
                            "texto": f"{horario_dt.strftime('%A, %d/%m/%Y')} às {horario_dt.strftime('%H:%M')}"
                        })

                        # Limitar a 10 horários
                        if len(horarios) >= 10:
                            break

            if len(horarios) >= 10:
                break

        return horarios

    except Exception as e:
        logger.error(f"Erro ao gerar horários disponíveis: {e}")
        return []

async def verificar_horario_tecnico_disponivel(technician_id: str, date_str: str, hour: int) -> bool:
    """
    Verifica se um técnico específico está disponível em um horário específico
    """
    try:
        # FILTRO DE SEGURANÇA: Apenas horários comerciais (9h-11h e 13h-17h)
        if not ((9 <= hour <= 10) or (13 <= hour <= 16)):
            logger.warning(f"⚠️ HORÁRIO FORA DO COMERCIAL BLOQUEADO: {hour}h (permitido: 9h-10h e 13h-16h)")
            return False

        supabase = get_supabase_client()

        # 🔧 CORREÇÃO: Verificar agendamentos na tabela service_orders
        # scheduled_date é DATE e scheduled_time é TIME - consultar separadamente
        time_str = f"{hour:02d}:00"
        logger.debug(f"🔍 Verificando service_orders: technician_id={technician_id}, date={date_str}, time={time_str}")

        # 🔧 CORREÇÃO CRÍTICA: scheduled_date é DATETIME, precisa usar ::date para comparar apenas a data
        response_os = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).eq(
            "scheduled_time", time_str
        ).execute()

        # Filtrar manualmente por data (Supabase não suporta ::date diretamente)
        conflitos_os = []
        if response_os.data:
            for os in response_os.data:
                # Extrair apenas a data do scheduled_date (ignorar hora)
                scheduled_date_str = os.get('scheduled_date', '')
                if scheduled_date_str.startswith(date_str):
                    conflitos_os.append(os)

        if conflitos_os and len(conflitos_os) > 0:
            logger.info(f"❌ Técnico {technician_id} ocupado em {date_str} às {hour}:00 (service_orders) - {len(conflitos_os)} conflitos")
            for os in conflitos_os:
                logger.debug(f"   📋 OS conflitante: {os.get('order_number', 'N/A')} - {os.get('scheduled_date', 'N/A')} {os.get('scheduled_time', 'N/A')}")
            return False

        # Verificar agendamentos na tabela agendamentos_ai
        # data_agendada é DATETIME - usar range de horário
        start_ai = f"{date_str}T{hour:02d}:00:00"
        end_ai = f"{date_str}T{hour:02d}:59:59"
        logger.debug(f"🔍 Verificando agendamentos_ai: technician_id={technician_id}, range={start_ai} to {end_ai}")

        response_ai = supabase.table("agendamentos_ai").select("*").eq(
            "technician_id", technician_id
        ).gte(
            "data_agendada", start_ai
        ).lte(
            "data_agendada", end_ai
        ).execute()

        if response_ai.data and len(response_ai.data) > 0:
            logger.info(f"❌ Técnico {technician_id} ocupado em {date_str} às {hour}:00 (agendamentos_ai) - {len(response_ai.data)} conflitos")
            for ag in response_ai.data:
                logger.debug(f"   📅 Agendamento conflitante: {ag.get('nome', 'N/A')} - {ag.get('data_agendada', 'N/A')}")
            return False

        logger.info(f"✅ Técnico {technician_id} disponível em {date_str} às {hour}:00")
        return True

    except Exception as e:
        logger.error(f"❌ Erro ao verificar disponibilidade do técnico {technician_id}: {e}")
        logger.error(f"❌ Detalhes do erro: {str(e)}")
        return False  # Em caso de erro, assumir ocupado por segurança

async def verificar_horario_disponivel(horario_dt: datetime, tecnico: str) -> bool:
    """
    Verifica se um horário específico está disponível
    """
    try:
        supabase = get_supabase_client()

        # Verificar agendamentos existentes
        response = supabase.table("agendamentos_ai").select("*").eq(
            "data_agendada", horario_dt.isoformat()
        ).eq("tecnico", tecnico).execute()

        if response.data and len(response.data) > 0:
            return False

        # Verificar ordens de serviço agendadas
        response_os = supabase.table("service_orders").select("*").eq(
            "scheduled_date", horario_dt.strftime('%Y-%m-%d')
        ).eq("scheduled_time", horario_dt.strftime('%H:%M')).execute()

        if response_os.data and len(response_os.data) > 0:
            return False

        return True

    except Exception as e:
        logger.error(f"Erro ao verificar disponibilidade: {e}")
        return True  # Em caso de erro, assumir disponível

# Funções de roteirização inteligente
def calculate_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """
    Calcula a distância entre dois pontos usando a fórmula de Haversine
    """
    lon1, lat1 = point1
    lon2, lat2 = point2

    R = 6371  # Raio da Terra em km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)

    a = (math.sin(dLat/2) * math.sin(dLat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon/2) * math.sin(dLon/2))

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c  # Distância em km

    return distance

def determine_logistics_group_by_coordinates(coordinates: Tuple[float, float]) -> str:
    """
    Determina o grupo logístico baseado nas coordenadas
    """
    distance = calculate_distance(FLORIANOPOLIS_CENTER, coordinates)

    if distance <= GROUP_A_RADIUS:
        return 'A'
    elif distance <= GROUP_B_RADIUS:
        return 'B'
    else:
        return 'C'

def determine_logistics_group_by_cep(cep: str) -> str:
    """
    Determina o grupo logístico baseado no CEP
    """
    if not cep or len(cep) < 5:
        return 'B'  # Padrão

    cep_prefix = cep.replace('-', '')[:5]

    if cep_prefix in CEPS_GRUPO_A:
        return 'A'
    elif cep_prefix in CEPS_GRUPO_B:
        return 'B'
    elif cep_prefix in CEPS_GRUPO_C:
        return 'C'
    else:
        return 'B'  # Padrão

def extract_cep_from_address(endereco: str) -> str:
    """
    Extrai CEP do endereço
    """
    import re
    cep_match = re.search(r'\d{5}-?\d{3}', endereco)
    return cep_match.group(0).replace('-', '') if cep_match else ""

async def geocodificar_endereco(endereco: str) -> Optional[Tuple[float, float]]:
    """
    Geocodifica um endereço usando a API do OpenStreetMap Nominatim com cache
    """
    global _geocoding_cache, _geocoding_cache_timestamp

    try:
        # Garantir encoding UTF-8 correto no endereço
        if isinstance(endereco, bytes):
            endereco = endereco.decode('utf-8')
        endereco = endereco.encode('utf-8', errors='replace').decode('utf-8')

        # Normalizar endereço para cache (remover espaços extras, etc.)
        endereco_normalizado = ' '.join(endereco.split()).lower()

        # Verificar cache (TTL de 1 hora)
        now = datetime.now()
        if endereco_normalizado in _geocoding_cache:
            cache_time = _geocoding_cache_timestamp.get(endereco_normalizado)
            if cache_time and (now - cache_time).total_seconds() < 3600:  # 1 hora
                logger.info(f"🎯 Geocodificação do cache: {endereco}")
                return _geocoding_cache[endereco_normalizado]

        encoded_address = endereco.replace(' ', '+') + ',+Brasil'
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_address}&limit=1&countrycodes=br"

        # Cliente HTTP otimizado com timeout
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers={
                'User-Agent': 'FixFogoes/1.0 (contato@fixfogoes.com.br)'
            })

            if response.status_code == 200:
                # Garantir encoding UTF-8 correto na resposta
                response.encoding = 'utf-8'
                data = response.json()
                if data and len(data) > 0:
                    result = data[0]
                    coords = (float(result['lon']), float(result['lat']))

                    # Salvar no cache
                    _geocoding_cache[endereco_normalizado] = coords
                    _geocoding_cache_timestamp[endereco_normalizado] = now

                    logger.info(f"🌍 Geocodificação bem-sucedida: {endereco} -> {coords}")
                    return coords

        logger.warning(f"⚠️ Geocodificação falhou para: {endereco}")
        return None
    except Exception as e:
        logger.error(f"❌ Erro na geocodificação: {e}")
        return None

def determinar_periodo_ideal_por_rota(endereco: str) -> str:
    """
    🗺️ Determina período ideal baseado na rota sequencial litoral

    ESTRATÉGIA:
    - Tijucas, Itapema → MANHÃ (mais próximos, começar cedo)
    - BC, Itajaí, Navegantes → TARDE (mais distantes, após almoço)
    """
    try:
        endereco_lower = endereco.lower()
        logger.info(f"🗺️ DEBUG: Analisando endereço: '{endereco}'")

        # Extrair CEP do endereço
        cep = extract_cep_from_address(endereco)
        logger.info(f"🗺️ DEBUG: CEP extraído: '{cep}'")
        if cep:
            cep_prefix = cep.replace('-', '')[:5]
            logger.info(f"🗺️ DEBUG: CEP prefix: '{cep_prefix}'")
            if cep_prefix in CEPS_ROTA_SEQUENCIAL:
                periodo = CEPS_ROTA_SEQUENCIAL[cep_prefix]["periodo"]
                cidade = CEPS_ROTA_SEQUENCIAL[cep_prefix]["cidade"]
                logger.info(f"🗺️ Rota sequencial: {cidade} → Período ideal: {periodo.upper()}")
                return periodo
            else:
                logger.info(f"🗺️ DEBUG: CEP prefix '{cep_prefix}' não encontrado em CEPS_ROTA_SEQUENCIAL")

        # Análise textual como fallback
        if any(cidade in endereco_lower for cidade in ['tijucas']):
            logger.info("🗺️ Tijucas detectado → Período ideal: MANHÃ")
            return "manha"
        elif any(cidade in endereco_lower for cidade in ['itapema']):
            logger.info("🗺️ Itapema detectado → Período ideal: MANHÃ")
            return "manha"
        elif any(cidade in endereco_lower for cidade in ['balneário camboriú', 'balneario camboriu', 'bc']):
            logger.info("🗺️ Balneário Camboriú detectado → Período: APENAS TARDE (nunca manhã)")
            return "tarde"
        elif any(cidade in endereco_lower for cidade in ['itajaí', 'itajai']):
            logger.info("🗺️ Itajaí detectado → Período: APENAS TARDE (nunca manhã)")
            return "tarde"
        elif any(cidade in endereco_lower for cidade in ['navegantes']):
            logger.info("🗺️ Navegantes detectado → Período: APENAS TARDE (nunca manhã)")
            return "tarde"
        else:
            logger.info("🗺️ Cidade não identificada na rota sequencial → Período: QUALQUER")
            return "qualquer"

    except Exception as e:
        logger.error(f"❌ Erro ao determinar período ideal: {e}")
        return "qualquer"

async def verificar_conflito_grupos_logisticos(data_verificacao: datetime, grupo_solicitado: str, technician_id: str, supabase) -> dict:
    """
    🚫 Verifica se já existem agendamentos de outros grupos logísticos no mesmo dia
    Evita misturar Grupo A/B com Grupo C no mesmo dia
    """
    try:
        data_str = data_verificacao.strftime('%Y-%m-%d')
        logger.info(f"🔍 Verificando conflitos de grupos para {data_str} - Grupo solicitado: {grupo_solicitado}")

        # Buscar todos os agendamentos do técnico no dia
        response = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).execute()

        grupos_existentes = set()
        agendamentos_dia = []

        if response.data:
            for os in response.data:
                scheduled_date_str = os.get('scheduled_date', '')
                if scheduled_date_str.startswith(data_str):
                    endereco = os.get('pickup_address', '')
                    if endereco:
                        grupo = determine_logistics_group(endereco)
                        grupos_existentes.add(grupo)
                        agendamentos_dia.append({
                            'os': os.get('order_number', 'N/A'),
                            'endereco': endereco[:50] + '...' if len(endereco) > 50 else endereco,
                            'grupo': grupo
                        })

        # Verificar conflitos
        conflito = False
        motivo = ""

        if grupos_existentes:
            logger.info(f"📊 Grupos existentes em {data_str}: {list(grupos_existentes)}")

            # Regra: Não misturar Grupo C com A/B
            if grupo_solicitado == 'C' and ('A' in grupos_existentes or 'B' in grupos_existentes):
                conflito = True
                motivo = f"Dia já tem Grupo A/B: {list(grupos_existentes)}"
            elif grupo_solicitado in ['A', 'B'] and 'C' in grupos_existentes:
                conflito = True
                motivo = f"Dia já tem Grupo C"

            if conflito:
                logger.warning(f"🚫 CONFLITO DETECTADO em {data_str}: {motivo}")
                for ag in agendamentos_dia:
                    logger.info(f"   - OS {ag['os']}: {ag['endereco']} (Grupo {ag['grupo']})")
        else:
            logger.info(f"✅ Nenhum agendamento encontrado em {data_str}")

        return {
            "conflito": conflito,
            "motivo": motivo,
            "grupos_existentes": list(grupos_existentes),
            "agendamentos_dia": agendamentos_dia,
            "data": data_str
        }

    except Exception as e:
        logger.error(f"❌ Erro ao verificar conflitos de grupos: {e}")
        return {"conflito": False, "motivo": "Erro na verificação"}

async def verificar_grupo_c_consecutivo(data_verificacao: datetime, technician_id: str, supabase) -> bool:
    """
    🚫 Verifica se já existe agendamento Grupo C no dia anterior
    Evita agendar Grupo C em dias consecutivos
    """
    try:
        # Data do dia anterior
        dia_anterior = data_verificacao - timedelta(days=1)
        data_anterior_str = dia_anterior.strftime('%Y-%m-%d')

        # Buscar agendamentos do técnico no dia anterior
        response = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).execute()

        if response.data:
            for os in response.data:
                scheduled_date_str = os.get('scheduled_date', '')
                if scheduled_date_str.startswith(data_anterior_str):
                    # Verificar se é Grupo C baseado no endereço
                    endereco = os.get('pickup_address', '')
                    if endereco:
                        grupo = determine_logistics_group(endereco)
                        if grupo == 'C':
                            logger.info(f"🚫 Grupo C encontrado no dia anterior ({data_anterior_str}): OS {os.get('order_number', 'N/A')}")
                            return True

        return False

    except Exception as e:
        logger.error(f"❌ Erro ao verificar Grupo C consecutivo: {e}")
        return False

def determine_logistics_group(endereco: str, coordinates: Optional[Tuple[float, float]] = None) -> str:
    """
    Determina o grupo logístico baseado no endereço e/ou coordenadas
    """
    # Prioridade 0: Validação específica para cidades do Grupo C (override)
    endereco_lower = endereco.lower()
    cidades_grupo_c = [
        'balneário camboriú', 'balneario camboriu', 'bc',
        'itajaí', 'itajai', 'navegantes', 'tijucas', 'itapema'
    ]

    if any(cidade in endereco_lower for cidade in cidades_grupo_c):
        logger.info(f"🎯 OVERRIDE: {endereco} → GRUPO C (cidade específica)")
        return 'C'

    # Prioridade 1: Usar coordenadas se disponíveis
    if coordinates:
        grupo_coords = determine_logistics_group_by_coordinates(coordinates)
        logger.info(f"🗺️ Coordenadas: {coordinates} → GRUPO {grupo_coords}")
        return grupo_coords

    # Prioridade 2: Usar CEP extraído do endereço
    cep = extract_cep_from_address(endereco)
    if cep:
        grupo_cep = determine_logistics_group_by_cep(cep)
        logger.info(f"📮 CEP: {cep} → GRUPO {grupo_cep}")
        return grupo_cep

    # Prioridade 3: Análise textual do endereço
    if any(cidade in endereco_lower for cidade in ['florianópolis', 'florianopolis']):
        logger.info(f"🏙️ Análise textual: {endereco} → GRUPO A")
        return 'A'
    elif any(cidade in endereco_lower for cidade in ['são josé', 'sao jose', 'palhoça', 'palhoca', 'biguaçu', 'biguacu']):
        logger.info(f"🌆 Análise textual: {endereco} → GRUPO B")
        return 'B'
    else:
        logger.info(f"🏖️ Análise textual: {endereco} → GRUPO C (padrão)")
        return 'C'

# Função para obter técnicos do banco de dados
async def obter_tecnicos_do_banco() -> Dict[str, Dict[str, Any]]:
    """
    Obtém técnicos ativos do Supabase e mapeia suas especialidades
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table("technicians").select("*").eq("is_active", True).execute()

        tecnicos_config = {}

        for tecnico in response.data:
            # Mapear especialidades baseado no nome/descrição
            especialidades = []
            nome_lower = tecnico["name"].lower()

            # Analisar especialidades do banco
            if tecnico.get("specialties"):
                for spec in tecnico["specialties"]:
                    spec_lower = spec.lower()
                    if "coifa" in spec_lower:
                        especialidades.extend(["coifa", "depurador", "exaustor", "ventilacao"])
                    elif "gas" in spec_lower or "fogao" in spec_lower:
                        especialidades.extend(["fogao", "cooktop", "forno", "micro-ondas"])
                    elif "geral" in spec_lower:
                        especialidades.extend(["fogao", "coifa", "forno", "geral"])

            # Fallback baseado no nome
            if not especialidades:
                if "marcelo" in nome_lower:
                    especialidades = ["coifa", "depurador", "exaustor", "ventilacao"]
                elif "paulo" in nome_lower or "betoni" in nome_lower:
                    especialidades = ["fogao", "cooktop", "forno", "micro-ondas", "lava-loucas"]
                else:
                    especialidades = ["geral", "fogao", "coifa"]

            # Determinar grupos preferenciais baseado nas especialidades
            grupos_preferenciais = ["A", "B", "C"]  # Padrão: todos os grupos
            if "coifa" in especialidades:
                grupos_preferenciais = ["A", "B"]  # Coifas mais comuns em grupos A e B

            # Criar chave única
            chave = tecnico["name"].lower().replace(" ", "_").replace("ç", "c")

            tecnicos_config[chave] = {
                "id": tecnico["id"],
                "nome": tecnico["name"],
                "email": tecnico["email"],
                "telefone": tecnico.get("phone", ""),
                "especialidades": especialidades,
                "grupos_preferenciais": grupos_preferenciais,
                "experiencia_anos": 10 if "marcelo" in nome_lower else 12,  # Baseado no conhecimento
                "rating": 4.8 if "marcelo" in nome_lower else 4.9,
                "capacidade_diaria": 6 if "marcelo" in nome_lower else 8,
                "ativo": tecnico["is_active"]
            }

        logger.info(f"📋 Técnicos carregados do banco: {list(tecnicos_config.keys())}")

        # 🔍 DEBUG: Log detalhado dos técnicos carregados
        for chave, tecnico in tecnicos_config.items():
            logger.info(f"   - {chave}: ID={tecnico['id']}, Nome={tecnico['nome']}, Email={tecnico['email']}")

        return tecnicos_config

    except Exception as e:
        logger.error(f"Erro ao carregar técnicos do banco: {e}")
        # Fallback para configuração mínima
        return {
            "marcelo": {
                "id": "bf99a281-02a2-49e1-8a41-2793ebbaed5d",
                "nome": "Marcelo",
                "email": "marcelo@gmail.com",
                "telefone": "(48) 99999-9999",
                "especialidades": ["coifa", "depurador", "exaustor"],
                "grupos_preferenciais": ["A", "B"],
                "experiencia_anos": 8,
                "rating": 4.8,
                "capacidade_diaria": 6,
                "ativo": True
            },
            "paulo_cesar_betoni": {
                "id": "5962dfe2-b561-40bd-a130-ad348b0bf8d8",
                "nome": "Paulo Cesar Betoni",
                "email": "betonipaulo@gmail.com",
                "telefone": "(48) 99649-3656",
                "especialidades": ["fogao", "cooktop", "forno", "gas"],
                "grupos_preferenciais": ["A", "B", "C"],
                "experiencia_anos": 12,
                "rating": 4.9,
                "capacidade_diaria": 8,
                "ativo": True
            }
        }

async def calcular_score_tecnico(tecnico_key: str, equipamentos: List[str], grupo_logistico: str, tecnicos_config: Dict, urgente: bool = False) -> float:
    """
    Calcula um score para determinar o melhor técnico para o atendimento
    """
    tecnico = tecnicos_config.get(tecnico_key)
    if not tecnico or not tecnico["ativo"]:
        return 0.0

    score = 0.0

    # 1. ESPECIALIDADE (peso 40%)
    especialidade_score = 0.0
    for equipamento in equipamentos:
        equipamento_lower = equipamento.lower()
        for especialidade in tecnico["especialidades"]:
            if especialidade in equipamento_lower or equipamento_lower in especialidade:
                especialidade_score += 10.0
                break
        else:
            # Se não tem especialidade específica, mas é generalista
            if "geral" in tecnico["especialidades"]:
                especialidade_score += 5.0

    score += (especialidade_score / len(equipamentos)) * 0.4

    # 2. GRUPO LOGÍSTICO (peso 25%)
    if grupo_logistico in tecnico["grupos_preferenciais"]:
        if tecnico["grupos_preferenciais"][0] == grupo_logistico:  # Grupo preferencial principal
            score += 25.0 * 0.25
        else:
            score += 15.0 * 0.25
    else:
        score += 5.0 * 0.25  # Pode atender, mas não é preferencial

    # 3. EXPERIÊNCIA (peso 15%)
    experiencia_score = min(tecnico["experiencia_anos"] * 2, 20)  # Max 20 pontos
    score += experiencia_score * 0.15

    # 4. RATING (peso 10%)
    rating_score = tecnico["rating"] * 4  # Max 20 pontos (5.0 * 4)
    score += rating_score * 0.10

    # 5. CAPACIDADE (peso 10%)
    capacidade_score = min(tecnico["capacidade_diaria"] * 2, 20)  # Max 20 pontos
    score += capacidade_score * 0.10

    # BÔNUS PARA URGENTE
    if urgente:
        if grupo_logistico in tecnico["grupos_preferenciais"][:2]:  # Top 2 grupos preferenciais
            score += 10.0

    return round(score, 2)

async def verificar_disponibilidade_tecnico(tecnico_key: str, data_inicio: datetime, tecnicos_config: Dict, dias: int = 1) -> Dict[str, Any]:
    """
    Verifica a disponibilidade real do técnico no Supabase
    """
    try:
        supabase = get_supabase_client()
        tecnico = tecnicos_config.get(tecnico_key)

        if not tecnico:
            return {"disponivel": False, "carga_trabalho": 100, "proximos_horarios": []}

        # Buscar agendamentos existentes do técnico
        data_fim = data_inicio + timedelta(days=dias)

        response = supabase.table("service_orders").select("*").gte(
            "scheduled_date", data_inicio.strftime('%Y-%m-%d')
        ).lte(
            "scheduled_date", data_fim.strftime('%Y-%m-%d')
        ).ilike("technician_name", f"%{tecnico['nome']}%").execute()

        agendamentos_existentes = len(response.data) if response.data else 0
        capacidade_total = tecnico["capacidade_diaria"] * dias
        carga_trabalho = (agendamentos_existentes / capacidade_total) * 100

        return {
            "disponivel": carga_trabalho < 90,  # Disponível se carga < 90%
            "carga_trabalho": round(carga_trabalho, 1),
            "agendamentos_existentes": agendamentos_existentes,
            "capacidade_total": capacidade_total
        }

    except Exception as e:
        logger.error(f"Erro ao verificar disponibilidade do técnico {tecnico_key}: {e}")
        return {"disponivel": True, "carga_trabalho": 0, "agendamentos_existentes": 0}

async def determinar_tecnico_otimizado(equipamentos: List[str], grupo_logistico: str, urgente: bool = False) -> Dict[str, Any]:
    """
    Determina o melhor técnico usando algoritmo de scoring inteligente
    """
    logger.info(f"🎯 Determinando técnico para equipamentos: {equipamentos}, grupo: {grupo_logistico}, urgente: {urgente}")

    # Obter técnicos do banco de dados
    tecnicos_config = await obter_tecnicos_do_banco()

    if not tecnicos_config:
        logger.error("❌ Nenhum técnico encontrado no banco de dados")
        return {
            "tecnico_id": "fallback",
            "nome": "Técnico Disponível",
            "email": "contato@fixfogoes.com.br",
            "telefone": "(48) 98833-2664",
            "especialidades": ["geral"],
            "score": 0,
            "motivo_selecao": "Fallback - nenhum técnico encontrado",
            "alternativas": []
        }

    # Calcular score para todos os técnicos
    scores = {}
    for tecnico_key in tecnicos_config.keys():
        score = await calcular_score_tecnico(tecnico_key, equipamentos, grupo_logistico, tecnicos_config, urgente)
        scores[tecnico_key] = score
        logger.info(f"📊 {tecnicos_config[tecnico_key]['nome']}: {score} pontos")

    # Ordenar por score (maior primeiro)
    tecnicos_ordenados = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    # Retornar informações do melhor técnico
    melhor_tecnico_key = tecnicos_ordenados[0][0]
    melhor_tecnico = tecnicos_config[melhor_tecnico_key]
    melhor_score = tecnicos_ordenados[0][1]

    resultado = {
        "tecnico_id": melhor_tecnico["id"],
        "nome": melhor_tecnico["nome"],
        "email": melhor_tecnico["email"],
        "telefone": melhor_tecnico["telefone"],
        "especialidades": melhor_tecnico["especialidades"],
        "score": melhor_score,
        "motivo_selecao": f"Melhor match para {', '.join(equipamentos)} no grupo {grupo_logistico}",
        "alternativas": [
            {
                "nome": tecnicos_config[t[0]]["nome"],
                "score": t[1]
            } for t in tecnicos_ordenados[1:3] if len(tecnicos_ordenados) > 1  # Top alternativas
        ]
    }

    logger.info(f"🏆 Técnico selecionado: {resultado['nome']} ({resultado['score']} pontos)")
    return resultado

async def obter_horarios_disponiveis_otimizados(
    data_inicio: datetime,
    dias: int,
    grupo_logistico: str,
    urgente: bool,
    endereco: str = "",
    coordenadas: Optional[Tuple[float, float]] = None
) -> List[Dict[str, Any]]:
    """
    Obtém horários disponíveis otimizados por grupo logístico, considerando:
    - Conflitos de agendamentos existentes
    - Carga de trabalho por grupo logístico
    - Otimização de rotas e deslocamentos
    - Priorização por urgência
    """
    try:
        supabase = get_supabase_client()

        # 1. Obter horários base (já filtra conflitos)
        horarios_base = await obter_horarios_disponiveis(data_inicio, dias)

        # 2. Analisar carga de trabalho por grupo logístico nos próximos dias
        carga_por_grupo = await analisar_carga_trabalho_por_grupo(data_inicio, dias)

        # 3. Aplicar otimizações inteligentes
        horarios_otimizados = []

        for horario in horarios_base:
            # Calcular score de prioridade
            score = 0
            hora = int(horario['hora_inicio'].split(':')[0])
            data_horario = datetime.strptime(horario['data'], '%Y-%m-%d')

            # 3.1. OTIMIZAÇÃO POR GRUPO LOGÍSTICO - HORÁRIOS COMERCIAIS
            # Filtro: Apenas horários comerciais (9h-11h e 13h-17h)
            if not ((9 <= hora <= 10) or (13 <= hora <= 16)):
                score -= 1000  # Penalização severa para horários fora do comercial
                continue

            if grupo_logistico == 'A':
                # Grupo A: Florianópolis - Prioridade manhã (menos trânsito)
                if 9 <= hora <= 10:
                    score += 15  # Manhã ideal
                elif 14 <= hora <= 16:
                    score += 10  # Tarde boa
                elif 13 <= hora <= 13:
                    score += 8   # Início tarde
                else:
                    score += 5   # Outros horários

            elif grupo_logistico == 'B':
                # Grupo B: Grande Florianópolis - Prioridade tarde (evita rush matinal)
                if 13 <= hora <= 16:
                    score += 15  # Tarde ideal
                elif 9 <= hora <= 10:
                    score += 12  # Manhã boa
                else:
                    score += 6   # Outros horários

            else:  # Grupo C
                # Grupo C: Litoral/Interior - Prioridade tarde (viagens longas)
                if 14 <= hora <= 16:
                    score += 15  # Tarde ideal para viagens longas
                elif 9 <= hora <= 10:
                    score += 10  # Manhã com tempo de deslocamento
                elif 13 <= hora <= 13:
                    score += 8   # Início tarde
                else:
                    score += 5   # Outros horários

            # 3.2. ANÁLISE DE CARGA DE TRABALHO
            data_str = data_horario.strftime('%Y-%m-%d')
            carga_dia = carga_por_grupo.get(data_str, {}).get(grupo_logistico, 0)

            if carga_dia < 30:  # Baixa carga
                score += 10
            elif carga_dia < 60:  # Média carga
                score += 5
            elif carga_dia < 80:  # Alta carga
                score += 2
            else:  # Sobrecarga
                score -= 5

            # 3.3. VERIFICAÇÃO DE CONFLITOS DE GRUPOS (REGRA CRÍTICA)
            if grupo_logistico == 'C':
                # GRUPO C: Nunca no mesmo dia que grupos A ou B
                conflito_grupos = await verificar_conflito_grupos_no_dia(data_str, 'C')
                if conflito_grupos:
                    score -= 1000  # Penalização severa para eliminar da lista
                    logger.info(f"❌ Grupo C bloqueado em {data_str} - há agendamentos A/B no mesmo dia")

            # 3.4. OTIMIZAÇÃO DE ROTAS (se temos coordenadas)
            if coordenadas and score > 0:  # Só calcular se não foi penalizado
                # Verificar se há outros agendamentos próximos no mesmo dia
                bonus_rota = await calcular_bonus_rota(data_str, hora, coordenadas, grupo_logistico)
                score += bonus_rota

            # 3.5. PRIORIZAÇÃO POR URGÊNCIA - HORÁRIOS COMERCIAIS
            if urgente and score > 0:  # Só aplicar se não foi penalizado
                if grupo_logistico in ['A', 'B'] and ((9 <= hora <= 10) or (13 <= hora <= 16)):
                    score += 25  # Urgente em horário comercial
                elif grupo_logistico == 'C' and ((9 <= hora <= 10) or (13 <= hora <= 16)):
                    score += 20  # Urgente com tempo de deslocamento
                else:
                    score += 15  # Urgente em outros horários

            # 3.6. BONUS POR DIA DA SEMANA (só se não foi penalizado)
            if score > 0:
                dia_semana = data_horario.weekday()  # 0=segunda, 6=domingo
                if dia_semana < 5:  # Segunda a sexta
                    score += 5
                elif dia_semana == 5:  # Sábado
                    score += 2
                # Domingo = sem bonus

                # 3.7. PENALIZAÇÃO POR HORÁRIOS DE PICO - Removido (horários fora do comercial já filtrados)

            horario['score_otimizacao'] = score
            horario['grupo_logistico'] = grupo_logistico
            horario['carga_dia'] = carga_dia
            horarios_otimizados.append(horario)

        # 4. Filtrar horários com score negativo (bloqueados) e ordenar
        horarios_validos = [h for h in horarios_otimizados if h['score_otimizacao'] > 0]
        horarios_validos.sort(key=lambda x: x['score_otimizacao'], reverse=True)

        # 5. Garantir que sempre temos pelo menos algumas opções
        if not horarios_validos and horarios_otimizados:
            # Se todos foram bloqueados, pegar os com menor penalização
            horarios_validos = sorted(horarios_otimizados, key=lambda x: x['score_otimizacao'], reverse=True)[:3]
            logger.warning(f"⚠️ Todos os horários foram penalizados para grupo {grupo_logistico}, oferecendo os melhores disponíveis")

        # 6. Log da otimização
        logger.info(f"🎯 Horários otimizados para grupo {grupo_logistico}:")
        logger.info(f"   📊 {len(horarios_validos)} opções válidas de {len(horarios_base)} disponíveis")
        logger.info(f"   🏆 Melhor score: {horarios_validos[0]['score_otimizacao'] if horarios_validos else 0}")
        logger.info(f"   📈 Carga média do grupo: {sum(carga_por_grupo.get(d, {}).get(grupo_logistico, 0) for d in carga_por_grupo) / max(len(carga_por_grupo), 1):.1f}%")

        return horarios_validos

    except Exception as e:
        logger.error(f"Erro na otimização de horários: {e}")
        # Fallback para função original
        return await obter_horarios_disponiveis(data_inicio, dias)

# Função para obter horários disponíveis
async def obter_horarios_disponiveis(data_inicio: datetime, dias: int = 5) -> List[Dict[str, Any]]:
    """Obtém horários disponíveis dos técnicos nos próximos dias"""
    # 🕐 LOG DO HORÁRIO DE REFERÊNCIA PARA A PESQUISA
    agora_brasil = datetime.now(pytz.timezone('America/Sao_Paulo'))
    logger.info(f"🔍 PESQUISA DE HORÁRIOS - Referência: {agora_brasil.strftime('%d/%m/%Y %H:%M:%S (Brasília)')}")
    logger.info(f"🔍 PESQUISA DE HORÁRIOS - Data início original: {data_inicio.strftime('%d/%m/%Y %H:%M:%S')}")

    # 🔍 VALIDAR DATA DE INÍCIO ANTES DA PESQUISA
    data_inicio = validar_data_pesquisa(data_inicio, "pesquisa de horários")
    logger.info(f"🔍 PESQUISA DE HORÁRIOS - Data início validada: {data_inicio.strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"🔍 PESQUISA DE HORÁRIOS - Dias a pesquisar: {dias}")

    supabase = get_supabase_client()
    horarios_disponiveis = []

    # Configuração de horários de trabalho - HORÁRIOS COMERCIAIS
    # MANHÃ: 9h às 11h | TARDE: 13h às 17h | SEGUNDA A SÁBADO
    HORA_INICIO_MANHA = 9   # 9h
    HORA_FIM_MANHA = 11     # 11h (até 10:59)
    HORA_INICIO_TARDE = 13  # 13h
    HORA_FIM_TARDE = 17     # 17h (até 16:59)
    INTERVALO_ALMOCO_INICIO = 11  # 11h
    INTERVALO_ALMOCO_FIM = 13     # 13h

    # Timezone do Brasil
    tz_brasil = pytz.timezone('America/Sao_Paulo')

    for i in range(dias):
        data_atual = data_inicio + timedelta(days=i)

        # Pular apenas domingo (trabalhar segunda a sábado)
        if data_atual.weekday() >= 6:  # 6=domingo
            continue

        # Buscar agendamentos existentes para esta data
        data_str = data_atual.strftime('%Y-%m-%d')

        try:
            # Buscar agendamentos AI (múltiplos formatos de data)
            response_ai = supabase.table("agendamentos_ai").select("*").or_(
                f"data_agendada.gte.{data_str}T00:00:00,data_agendada.lt.{data_str}T23:59:59"
            ).execute()
            agendamentos_ai = response_ai.data if response_ai.data else []

            # Buscar ordens de serviço (múltiplos status ativos)
            response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).in_(
                "status", ["scheduled", "in_progress", "on_the_way", "scheduled"]
            ).execute()
            ordens_servico = response_os.data if response_os.data else []

            # Buscar também agendamentos por técnico específico
            response_tech = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).not_.is_("technician_name", "null").execute()
            agendamentos_tecnicos = response_tech.data if response_tech.data else []

            # Combinar todas as ordens de serviço
            ordens_servico.extend([os for os in agendamentos_tecnicos if os not in ordens_servico])

            logger.info(f"📅 {data_str}: {len(agendamentos_ai)} agendamentos AI + {len(ordens_servico)} ordens de serviço")

        except Exception as e:
            logger.error(f"Erro ao buscar agendamentos para {data_str}: {e}")
            agendamentos_ai = []
            ordens_servico = []

        # Gerar slots de horários disponíveis - HORÁRIOS COMERCIAIS
        # MANHÃ: 9h às 11h | TARDE: 13h às 17h
        horarios_comerciais = []

        # Adicionar horários da manhã (9h às 10h)
        for hora in range(HORA_INICIO_MANHA, HORA_FIM_MANHA):
            horarios_comerciais.append(hora)

        # Adicionar horários da tarde (13h às 16h)
        for hora in range(HORA_INICIO_TARDE, HORA_FIM_TARDE):
            horarios_comerciais.append(hora)

        for hora in horarios_comerciais:
            # FILTRO: Apenas horários comerciais (9h-11h e 13h-17h)
            if not ((9 <= hora <= 10) or (13 <= hora <= 16)):
                continue

            horario_inicio = data_atual.replace(hour=hora, minute=0, second=0, microsecond=0)
            horario_fim = horario_inicio + timedelta(hours=2)  # Slots de 2 horas

            # Verificar se há conflitos com lógica melhorada
            conflito = False
            motivo_conflito = ""

            # Verificar agendamentos AI
            for ag in agendamentos_ai:
                if ag.get('data_agendada'):
                    try:
                        # Suportar múltiplos formatos de data
                        data_ag_str = ag['data_agendada']
                        if 'T' in data_ag_str:
                            data_ag = datetime.fromisoformat(data_ag_str.replace('Z', '+00:00'))
                        else:
                            data_ag = datetime.strptime(data_ag_str, '%Y-%m-%d %H:%M:%S')

                        # Verificar sobreposição de horários (com margem de 30min)
                        margem = timedelta(minutes=30)
                        if (horario_inicio - margem) <= data_ag < (horario_fim + margem):
                            conflito = True
                            motivo_conflito = f"Agendamento AI às {data_ag.strftime('%H:%M')}"
                            break
                    except Exception as e:
                        logger.warning(f"Erro ao processar agendamento AI: {e}")
                        continue

            # Verificar ordens de serviço
            if not conflito:
                for os in ordens_servico:
                    if os.get('scheduled_time'):
                        try:
                            # Converter horário da OS para datetime
                            hora_os_str = os['scheduled_time']
                            if ':' in hora_os_str:
                                hora_os, min_os = map(int, hora_os_str.split(':')[:2])
                                horario_os = data_atual.replace(hour=hora_os, minute=min_os, second=0, microsecond=0)

                                # Verificar sobreposição (OS geralmente dura 1-2 horas)
                                duracao_os = timedelta(hours=2)  # Assumir 2 horas por OS
                                margem = timedelta(minutes=30)

                                if (horario_inicio - margem) <= horario_os < (horario_fim + margem) or \
                                   (horario_os - margem) <= horario_inicio < (horario_os + duracao_os + margem):
                                    conflito = True
                                    motivo_conflito = f"OS às {hora_os_str} - {os.get('client_name', 'Cliente')}"
                                    break
                        except Exception as e:
                            logger.warning(f"Erro ao processar OS: {e}")
                            continue

            if conflito:
                logger.debug(f"⚠️ Conflito em {data_str} {hora:02d}:00 - {motivo_conflito}")

            if not conflito:
                # Sistema agenda para horário específico, mas mostra faixa para o cliente
                hora_fim_display = hora + 1  # Faixa de 1 hora para o cliente (ex: 9h-10h)

                horarios_disponiveis.append({
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "hora_agendamento": f"{hora:02d}:00",  # Horário real do agendamento (ex: 09:00)
                    "hora_inicio": f"{hora:02d}:00",       # Para exibição ao cliente (ex: 09:00)
                    "hora_fim": f"{hora_fim_display:02d}:00",  # Para exibição ao cliente (ex: 10:00)
                    "datetime": horario_inicio.isoformat(),
                    "datetime_agendamento": horario_inicio.isoformat(),  # Horário exato para agendar
                    "data_formatada": data_atual.strftime('%d/%m/%Y'),
                    "dia_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"][data_atual.weekday()]
                })

    logger.info(f"🗓️ Total de horários disponíveis encontrados: {len(horarios_disponiveis)}")
    return horarios_disponiveis

async def analisar_carga_trabalho_por_grupo(data_inicio: datetime, dias: int) -> Dict[str, Dict[str, float]]:
    """
    Analisa a carga de trabalho por grupo logístico nos próximos dias
    """
    try:
        supabase = get_supabase_client()
        carga_por_grupo = {}

        for i in range(dias):
            data_atual = data_inicio + timedelta(days=i)
            data_str = data_atual.strftime('%Y-%m-%d')

            # Buscar agendamentos do dia
            response_ai = supabase.table("agendamentos_ai").select("*").gte(
                "data_agendada", f"{data_str}T00:00:00"
            ).lt("data_agendada", f"{data_str}T23:59:59").execute()

            response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).execute()

            agendamentos_ai = response_ai.data if response_ai.data else []
            ordens_servico = response_os.data if response_os.data else []

            # Contar por grupo logístico
            grupos_count = {'A': 0, 'B': 0, 'C': 0}

            # Analisar agendamentos AI
            for ag in agendamentos_ai:
                grupo = ag.get('grupo_logistico', 'B')  # Padrão B
                grupos_count[grupo] += 1

            # Analisar ordens de serviço (estimar grupo pelo endereço)
            for os in ordens_servico:
                endereco_os = os.get('pickup_address', '')
                grupo = determine_logistics_group(endereco_os) if endereco_os else 'B'
                grupos_count[grupo] += 1

            # Calcular percentual de carga (assumindo capacidade máxima de 8 atendimentos por grupo por dia)
            capacidade_maxima = 8
            carga_por_grupo[data_str] = {
                'A': (grupos_count['A'] / capacidade_maxima) * 100,
                'B': (grupos_count['B'] / capacidade_maxima) * 100,
                'C': (grupos_count['C'] / capacidade_maxima) * 100
            }

        return carga_por_grupo

    except Exception as e:
        logger.error(f"Erro ao analisar carga de trabalho: {e}")
        return {}

async def buscar_agendamentos_rota_sequencial(periodo_ideal: str, agora: datetime, supabase) -> List[Dict]:
    """
    🗺️ Busca agendamentos na mesma rota sequencial (manhã ou tarde)
    """
    try:
        data_inicio = agora.strftime('%Y-%m-%d')
        data_fim = (agora + timedelta(days=15)).strftime('%Y-%m-%d')

        # Definir cidades do período
        if periodo_ideal == "manha":
            cidades_periodo = ["Tijucas", "Itapema"]
        elif periodo_ideal == "tarde":
            cidades_periodo = ["Balneário Camboriú", "Itajaí", "Navegantes"]
        else:
            cidades_periodo = []

        if not cidades_periodo:
            return []

        # Buscar agendamentos das cidades do período
        agendamentos_periodo = []
        for cidade in cidades_periodo:
            response = supabase.table("agendamentos_ai").select("*").ilike(
                "endereco", f"%{cidade}%"
            ).gte(
                "data_agendada", data_inicio
            ).lte(
                "data_agendada", data_fim
            ).eq("status", "pendente").execute()

            if response.data:
                for ag in response.data:
                    ag['cidade_detectada'] = cidade
                    agendamentos_periodo.extend(response.data)

        logger.info(f"🗺️ Encontrados {len(agendamentos_periodo)} agendamentos na rota {periodo_ideal}")
        return agendamentos_periodo

    except Exception as e:
        logger.error(f"❌ Erro ao buscar agendamentos da rota: {e}")
        return []

async def estrategia_rota_manha(
    technician_id: str, technician_name: str, endereco: str,
    agendamentos_rota: List[Dict], urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🌅 ESTRATÉGIA MANHÃ: Tijucas (35km) → Itapema (55km)
    Horários: 9h-11h (começar cedo para otimizar deslocamento)

    🚫 REGRA: BC, Itajaí, Navegantes NUNCA no período da manhã
    """
    logger.info("🌅 Aplicando estratégia ROTA MANHÃ (Tijucas → Itapema)")
    logger.info(f"🌅 DEBUG: Técnico ID: {technician_id}, Endereço: {endereco}")
    logger.info(f"🌅 DEBUG: Agendamentos na rota: {len(agendamentos_rota)}")

    # 🚫 VALIDAÇÃO: BC, Itajaí, Navegantes não podem ser agendados de manhã
    endereco_lower = endereco.lower()
    cidades_bloqueadas = ['balneário camboriú', 'balneario camboriu', 'bc', 'itajaí', 'itajai', 'navegantes']

    if any(cidade in endereco_lower for cidade in cidades_bloqueadas):
        logger.warning(f"🚫 BLOQUEIO MANHÃ: {endereco} não pode ser agendado de manhã")
        logger.info("🔄 Redirecionando para estratégia de tarde...")
        return await estrategia_rota_tarde(technician_id, technician_name, endereco, agendamentos_rota, urgente, agora, supabase)

    # Horários otimizados para manhã (rota sequencial) - HORÁRIOS COMERCIAIS
    horarios_manha = [
        {"hora": 9, "texto": "9h e 10h", "score": 25},   # Manhã ideal
        {"hora": 10, "texto": "10h e 11h", "score": 22}  # Manhã boa
    ]

    resultado = await processar_horarios_rota_sequencial(
        technician_id, horarios_manha, agendamentos_rota,
        "MANHÃ", endereco, urgente, agora, supabase
    )

    logger.info(f"🌅 DEBUG: Horários gerados pela estratégia manhã: {len(resultado)}")
    for i, h in enumerate(resultado):
        logger.info(f"🌅 DEBUG: Horário {i+1}: {h.get('texto', 'N/A')}")

    return resultado

async def estrategia_rota_tarde(
    technician_id: str, technician_name: str, endereco: str,
    agendamentos_rota: List[Dict], urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🌇 ESTRATÉGIA TARDE: BC (75km) → Itajaí (95km) → Navegantes (105km)
    Horários: 13h-17h (após almoço, tempo para deslocamento longo)
    """
    logger.info("🌇 Aplicando estratégia ROTA TARDE (BC → Itajaí → Navegantes)")

    # Horários otimizados para tarde (rota sequencial) - HORÁRIOS COMERCIAIS
    horarios_tarde = [
        {"hora": 13, "texto": "13h e 14h", "score": 25}, # Pós-almoço (ideal)
        {"hora": 14, "texto": "14h e 15h", "score": 22}, # Tarde cedo (ótimo)
        {"hora": 15, "texto": "15h e 16h", "score": 20}, # Tarde (bom)
        {"hora": 16, "texto": "16h e 17h", "score": 18}  # Final tarde (ok)
    ]

    return await processar_horarios_rota_sequencial(
        technician_id, horarios_tarde, agendamentos_rota,
        "TARDE", endereco, urgente, agora, supabase
    )

async def estrategia_rota_flexivel(
    technician_id: str, technician_name: str, coordenadas: Optional[Tuple[float, float]],
    urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🔄 ESTRATÉGIA FLEXÍVEL: Para cidades não mapeadas na rota sequencial
    """
    logger.info("🔄 Aplicando estratégia FLEXÍVEL (cidade não mapeada)")

    # Horários balanceados - HORÁRIOS COMERCIAIS
    horarios_flexiveis = [
        {"hora": 9, "texto": "9h e 10h", "score": 18},
        {"hora": 10, "texto": "10h e 11h", "score": 16},
        {"hora": 14, "texto": "14h e 15h", "score": 20},
        {"hora": 15, "texto": "15h e 16h", "score": 18},
        {"hora": 16, "texto": "16h e 17h", "score": 14}
    ]

    return await processar_horarios_rota_sequencial(
        technician_id, horarios_flexiveis, [],
        "FLEXÍVEL", "", urgente, agora, supabase
    )

async def processar_horarios_rota_sequencial(
    technician_id: str, horarios_prioritarios: List[Dict], agendamentos_rota: List[Dict],
    tipo_rota: str, endereco: str, urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🎯 Processa horários com otimização da rota sequencial
    """
    logger.info(f"🎯 DEBUG: Processando horários rota sequencial - Tipo: {tipo_rota}")
    logger.info(f"🎯 DEBUG: Técnico ID: {technician_id}, Urgente: {urgente}")
    logger.info(f"🎯 DEBUG: Horários prioritários: {len(horarios_prioritarios)}")

    horarios_disponiveis = []
    inicio = calcular_data_inicio_otimizada(urgente)
    logger.info(f"🎯 DEBUG: Data início busca: {inicio.strftime('%Y-%m-%d')}")

    # Agrupar agendamentos por data
    agendamentos_por_data = {}
    for ag in agendamentos_rota:
        data_ag = ag['data_agendada'][:10]
        if data_ag not in agendamentos_por_data:
            agendamentos_por_data[data_ag] = []
        agendamentos_por_data[data_ag].append(ag)

    logger.info(f"🎯 DEBUG: Agendamentos agrupados por data: {list(agendamentos_por_data.keys())}")

    # Verificar próximos 10 dias úteis
    for dia_offset in range(10):
        data_verificacao = inicio + timedelta(days=dia_offset)

        if data_verificacao.weekday() >= 5:  # Pular fins de semana
            continue

        data_str = data_verificacao.strftime('%Y-%m-%d')

        # Bonus por agrupamento na mesma rota
        bonus_agrupamento = len(agendamentos_por_data.get(data_str, [])) * 15

        for horario_info in horarios_prioritarios:
            if len(horarios_disponiveis) >= 3:
                break

            logger.info(f"🎯 DEBUG: Verificando horário {horario_info['hora']}h em {data_str}")

            # Verificar disponibilidade do técnico
            disponivel = await verificar_horario_tecnico_disponivel(
                technician_id, data_str, horario_info["hora"]
            )

            logger.info(f"🎯 DEBUG: Técnico {technician_id} disponível em {data_str} às {horario_info['hora']}h: {disponivel}")

            if disponivel:
                score_total = horario_info["score"] + bonus_agrupamento + (20 if urgente else 0)

                # Criar horário otimizado
                horario_dt = data_verificacao.replace(
                    hour=horario_info["hora"], minute=0, second=0, microsecond=0
                )

                dias_semana = {
                    'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                    'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                    'Friday': 'Sexta-feira'
                }

                dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                # Texto personalizado por rota
                if bonus_agrupamento > 0:
                    texto_rota = f"Previsão de chegada entre {horario_info['texto']} - {data_formatada} (Rota {tipo_rota} otimizada)"
                else:
                    texto_rota = f"Previsão de chegada entre {horario_info['texto']} - {data_formatada} (Rota {tipo_rota})"

                horarios_disponiveis.append({
                    "numero": len(horarios_disponiveis) + 1,
                    "texto": texto_rota,
                    "datetime_agendamento": horario_dt.isoformat(),
                    "dia_semana": data_formatada,
                    "hora_agendamento": f"{horario_info['hora']:02d}:00",
                    "score_otimizacao": score_total,
                    "grupo_logistico": "C",
                    "tipo_rota": tipo_rota,
                    "agendamentos_agrupados": len(agendamentos_por_data.get(data_str, []))
                })

                logger.info(f"✅ Rota {tipo_rota}: {data_formatada} {horario_info['hora']}h (Score: {score_total}, Agrupados: {len(agendamentos_por_data.get(data_str, []))})")

        if len(horarios_disponiveis) >= 3:
            break

    # Ordenar por score (melhor otimização primeiro)
    horarios_disponiveis.sort(key=lambda x: x.get("score_otimizacao", 0), reverse=True)

    return horarios_disponiveis[:3]

async def buscar_dias_com_agendamentos_grupo_c(agora: datetime, supabase) -> List[Dict]:
    """
    🔍 Busca dias que já têm agendamentos do Grupo C nos próximos 15 dias
    """
    try:
        data_inicio = agora.strftime('%Y-%m-%d')
        data_fim = (agora + timedelta(days=15)).strftime('%Y-%m-%d')

        # Buscar agendamentos Grupo C existentes
        response = supabase.table("agendamentos_ai").select("*").eq(
            "grupo_logistico", "C"
        ).gte(
            "data_agendada", data_inicio
        ).lte(
            "data_agendada", data_fim
        ).eq("status", "pendente").execute()

        agendamentos = response.data if response.data else []

        # Agrupar por data
        dias_agrupados = {}
        for ag in agendamentos:
            data_ag = ag['data_agendada'][:10]  # YYYY-MM-DD
            if data_ag not in dias_agrupados:
                dias_agrupados[data_ag] = []
            dias_agrupados[data_ag].append(ag)

        return [{"data": data, "agendamentos": ags} for data, ags in dias_agrupados.items()]

    except Exception as e:
        logger.error(f"❌ Erro ao buscar dias Grupo C: {e}")
        return []

async def buscar_agendamentos_proximos_grupo_c(coordenadas: Optional[Tuple[float, float]], agora: datetime, supabase) -> List[Dict]:
    """
    📍 Busca agendamentos Grupo C próximos geograficamente (raio de 20km)
    """
    try:
        if not coordenadas:
            return []

        data_inicio = agora.strftime('%Y-%m-%d')
        data_fim = (agora + timedelta(days=15)).strftime('%Y-%m-%d')

        # Buscar todos agendamentos Grupo C com coordenadas
        response = supabase.table("agendamentos_ai").select("*").eq(
            "grupo_logistico", "C"
        ).gte(
            "data_agendada", data_inicio
        ).lte(
            "data_agendada", data_fim
        ).eq("status", "pendente").not_.is_("coordenadas", "null").execute()

        agendamentos = response.data if response.data else []
        agendamentos_proximos = []

        for ag in agendamentos:
            if ag.get('coordenadas'):
                try:
                    coords_ag = ag['coordenadas']
                    if isinstance(coords_ag, list) and len(coords_ag) == 2:
                        distancia = calculate_distance(coordenadas, tuple(coords_ag))
                        if distancia <= 20:  # 20km de raio
                            ag['distancia'] = distancia
                            agendamentos_proximos.append(ag)
                except:
                    continue

        # Ordenar por distância
        agendamentos_proximos.sort(key=lambda x: x.get('distancia', 999))

        return agendamentos_proximos

    except Exception as e:
        logger.error(f"❌ Erro ao buscar agendamentos próximos: {e}")
        return []

async def agrupar_com_agendamentos_existentes(
    technician_id: str, technician_name: str, dias_com_grupo_c: List[Dict],
    agendamentos_proximos: List[Dict], urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🎯 Agrupa novo agendamento com existentes do Grupo C
    """
    logger.info("🎯 Agrupando com agendamentos Grupo C existentes")

    horarios_otimizados = []

    # Priorizar dias com mais agendamentos (melhor aproveitamento)
    dias_ordenados = sorted(dias_com_grupo_c, key=lambda x: len(x['agendamentos']), reverse=True)

    for dia_info in dias_ordenados[:5]:  # Top 5 dias
        data_str = dia_info['data']
        agendamentos_dia = dia_info['agendamentos']

        # Horários preferenciais para Grupo C (tarde)
        horarios_grupo_c = [14, 15, 16, 17]

        for hora in horarios_grupo_c:
            if len(horarios_otimizados) >= 3:
                break

            # Verificar disponibilidade do técnico
            disponivel = await verificar_horario_tecnico_disponivel(technician_id, data_str, hora)

            if disponivel:
                # Calcular score de agrupamento
                score_agrupamento = len(agendamentos_dia) * 10  # Bonus por agendamento existente

                # Bonus por proximidade geográfica
                bonus_proximidade = 0
                for ag_proximo in agendamentos_proximos:
                    if ag_proximo['data_agendada'][:10] == data_str:
                        bonus_proximidade += 15

                score_total = score_agrupamento + bonus_proximidade + (20 if urgente else 0)

                # Criar horário otimizado
                data_dt = datetime.strptime(data_str, '%Y-%m-%d')
                horario_dt = data_dt.replace(hour=hora, minute=0, second=0, microsecond=0)

                dias_semana = {
                    'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                    'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                    'Friday': 'Sexta-feira'
                }

                dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                horarios_otimizados.append({
                    "numero": len(horarios_otimizados) + 1,
                    "texto": f"Previsão de chegada entre {hora}h e {hora+1}h - {data_formatada} (Rota otimizada)",
                    "datetime_agendamento": horario_dt.isoformat(),
                    "dia_semana": data_formatada,
                    "hora_agendamento": f"{hora:02d}:00",
                    "score_otimizacao": score_total,
                    "grupo_logistico": "C",
                    "agendamentos_agrupados": len(agendamentos_dia)
                })

                logger.info(f"✅ Agrupamento C: {data_formatada} {hora}h (Score: {score_total}, Agrupados: {len(agendamentos_dia)})")

    # Se não encontrou suficientes, completar com novo dia
    if len(horarios_otimizados) < 3:
        horarios_novos = await criar_novo_dia_grupo_c(technician_id, technician_name, None, urgente, agora, supabase)
        horarios_otimizados.extend(horarios_novos[:3-len(horarios_otimizados)])

    return horarios_otimizados[:3]

async def criar_novo_dia_grupo_c(
    technician_id: str, technician_name: str, coordenadas: Optional[Tuple[float, float]],
    urgente: bool, agora: datetime, supabase
) -> List[Dict]:
    """
    🆕 Cria novo dia otimizado para agendamentos Grupo C
    """
    logger.info("🆕 Criando novo dia para Grupo C")

    horarios_disponiveis = []
    inicio = agora + timedelta(days=3 if not urgente else 1)  # Grupo C precisa mais tempo

    # Horários ideais para Grupo C (tarde para viagens longas)
    horarios_grupo_c = [
        {"hora": 14, "texto": "14h e 15h", "score": 20},
        {"hora": 15, "texto": "15h e 16h", "score": 18},
        {"hora": 16, "texto": "16h e 17h", "score": 15}
    ]

    for dia_offset in range(10):
        data_verificacao = inicio + timedelta(days=dia_offset)

        if data_verificacao.weekday() >= 5:  # Pular fins de semana
            continue

        data_str = data_verificacao.strftime('%Y-%m-%d')

        # Verificar se não há conflito com grupos A/B
        conflito = await verificar_conflito_grupos_no_dia(data_str, 'C')
        if conflito:
            continue

        for horario_info in horarios_grupo_c:
            if len(horarios_disponiveis) >= 3:
                break

            disponivel = await verificar_horario_tecnico_disponivel(
                technician_id, data_str, horario_info["hora"]
            )

            if disponivel:
                horario_dt = data_verificacao.replace(
                    hour=horario_info["hora"], minute=0, second=0, microsecond=0
                )

                dias_semana = {
                    'Monday': 'Segunda-feira', 'Tuesday': 'Terça-feira',
                    'Wednesday': 'Quarta-feira', 'Thursday': 'Quinta-feira',
                    'Friday': 'Sexta-feira'
                }

                dia_semana_pt = dias_semana.get(horario_dt.strftime('%A'), horario_dt.strftime('%A'))
                data_formatada = f"{dia_semana_pt}, {horario_dt.strftime('%d/%m/%Y')}"

                score_total = horario_info["score"] + (15 if urgente else 0)

                horarios_disponiveis.append({
                    "numero": len(horarios_disponiveis) + 1,
                    "texto": f"Previsão de chegada entre {horario_info['texto']} - {data_formatada} (Dia dedicado)",
                    "datetime_agendamento": horario_dt.isoformat(),
                    "dia_semana": data_formatada,
                    "hora_agendamento": f"{horario_info['hora']:02d}:00",
                    "score_otimizacao": score_total,
                    "grupo_logistico": "C",
                    "novo_dia_grupo_c": True
                })

                logger.info(f"✅ Novo dia C: {data_formatada} {horario_info['hora']}h (Score: {score_total})")

        if len(horarios_disponiveis) >= 3:
            break

    return horarios_disponiveis

async def calcular_score_dia(data_str: str, grupo: str, supabase) -> float:
    """
    📊 Calcula score do dia baseado na carga de trabalho
    """
    try:
        # Contar agendamentos existentes no dia
        response = supabase.table("agendamentos_ai").select("*").eq(
            "data_agendada", data_str
        ).execute()

        agendamentos_dia = len(response.data) if response.data else 0

        # Score baseado na carga (menos agendamentos = melhor score)
        if agendamentos_dia == 0:
            return 15  # Dia vazio
        elif agendamentos_dia <= 2:
            return 10  # Baixa carga
        elif agendamentos_dia <= 4:
            return 5   # Média carga
        else:
            return 0   # Alta carga

    except Exception as e:
        logger.error(f"❌ Erro ao calcular score do dia: {e}")
        return 5

async def calcular_bonus_rota_inteligente(data_str: str, hora: int, coordenadas: Tuple[float, float], grupo: str, supabase) -> float:
    """
    🗺️ Calcula bonus por otimização de rota (agendamentos próximos)
    """
    try:
        # Buscar agendamentos no mesmo dia
        response = supabase.table("agendamentos_ai").select("*").eq(
            "data_agendada", data_str
        ).not_.is_("coordenadas", "null").execute()

        agendamentos = response.data if response.data else []
        bonus_total = 0

        for ag in agendamentos:
            if ag.get('coordenadas'):
                try:
                    coords_ag = ag['coordenadas']
                    if isinstance(coords_ag, list) and len(coords_ag) == 2:
                        distancia = calculate_distance(coordenadas, tuple(coords_ag))

                        # Bonus por proximidade
                        if distancia <= 5:    # Muito próximo
                            bonus_total += 10
                        elif distancia <= 10: # Próximo
                            bonus_total += 5
                        elif distancia <= 15: # Razoável
                            bonus_total += 2
                except:
                    continue

        return min(bonus_total, 20)  # Máximo 20 pontos de bonus

    except Exception as e:
        logger.error(f"❌ Erro ao calcular bonus de rota: {e}")
        return 0

async def calcular_bonus_rota(data_str: str, hora: int, coordenadas: Tuple[float, float], grupo_logistico: str) -> float:
    """
    Calcula bonus de rota baseado em agendamentos próximos no mesmo dia
    """
    try:
        supabase = get_supabase_client()
        bonus = 0.0

        # Buscar agendamentos do mesmo dia
        response_ai = supabase.table("agendamentos_ai").select("*").gte(
            "data_agendada", f"{data_str}T00:00:00"
        ).lt("data_agendada", f"{data_str}T23:59:59").execute()

        response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).execute()

        agendamentos_ai = response_ai.data if response_ai.data else []
        ordens_servico = response_os.data if response_os.data else []

        # Verificar proximidade com outros agendamentos
        for ag in agendamentos_ai:
            if ag.get('endereco'):
                # Estimar coordenadas do agendamento existente
                coords_ag = await geocodificar_endereco(ag['endereco'])
                if coords_ag:
                    distancia = calculate_distance(coordenadas, coords_ag)

                    # Bonus por proximidade (até 5km = bonus máximo)
                    if distancia <= 2:
                        bonus += 5  # Muito próximo
                    elif distancia <= 5:
                        bonus += 3  # Próximo
                    elif distancia <= 10:
                        bonus += 1  # Relativamente próximo

        # Bonus adicional se há concentração no mesmo grupo logístico
        agendamentos_mesmo_grupo = sum(1 for ag in agendamentos_ai if ag.get('grupo_logistico') == grupo_logistico)
        if agendamentos_mesmo_grupo >= 2:
            bonus += 2  # Otimização de rota por grupo

        return min(bonus, 10)  # Máximo 10 pontos de bonus

    except Exception as e:
        logger.error(f"Erro ao calcular bonus de rota: {e}")
        return 0.0

async def verificar_conflito_grupos_no_dia(data_str: str, grupo_solicitado: str) -> bool:
    """
    Verifica se há conflito de grupos no mesmo dia.
    REGRA: Grupo C nunca no mesmo dia que grupos A ou B
    """
    try:
        supabase = get_supabase_client()

        if grupo_solicitado != 'C':
            return False  # Grupos A e B podem coexistir

        # Buscar agendamentos do dia
        response_ai = supabase.table("agendamentos_ai").select("*").gte(
            "data_agendada", f"{data_str}T00:00:00"
        ).lt("data_agendada", f"{data_str}T23:59:59").execute()

        response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).execute()

        agendamentos_ai = response_ai.data if response_ai.data else []
        ordens_servico = response_os.data if response_os.data else []

        # Verificar se há agendamentos dos grupos A ou B
        for ag in agendamentos_ai:
            grupo_ag = ag.get('grupo_logistico', 'B')  # Padrão B
            if grupo_ag in ['A', 'B']:
                logger.info(f"🚫 Conflito detectado: Grupo C solicitado em {data_str}, mas há agendamento grupo {grupo_ag}")
                return True

        # Verificar ordens de serviço (estimar grupo pelo endereço)
        for os in ordens_servico:
            endereco_os = os.get('pickup_address', '')
            if endereco_os:
                grupo_os = determine_logistics_group(endereco_os)
                if grupo_os in ['A', 'B']:
                    logger.info(f"🚫 Conflito detectado: Grupo C solicitado em {data_str}, mas há OS grupo {grupo_os}")
                    return True

        return False  # Sem conflitos

    except Exception as e:
        logger.error(f"Erro ao verificar conflito de grupos: {e}")
        return False  # Em caso de erro, permitir agendamento

def processar_escolha_horario(horario_escolhido: str, horarios_disponiveis: List[Dict]) -> Optional[Dict]:
    """
    Processa a escolha do cliente (número 1, 2, 3 ou horário ISO)
    Retorna o horário selecionado com datetime_agendamento correto
    """
    try:
        # Verificar se é um número (1, 2, 3)
        if horario_escolhido.strip().isdigit():
            opcao = int(horario_escolhido.strip())
            if 1 <= opcao <= len(horarios_disponiveis):
                horario_selecionado = horarios_disponiveis[opcao - 1]
                # Log seguro - verificar se campos existem
                dia_info = horario_selecionado.get('dia_semana', horario_selecionado.get('texto', 'N/A'))
                hora_info = horario_selecionado.get('hora_agendamento', 'N/A')
                logger.info(f"✅ Cliente escolheu opção {opcao}: {dia_info} às {hora_info}")
                logger.info(f"🎯 Horário selecionado completo: {horario_selecionado}")
                return horario_selecionado
            else:
                logger.warning(f"⚠️ Opção inválida: {opcao}. Disponíveis: 1-{len(horarios_disponiveis)}")
                return None

        # Verificar se é um horário ISO (fallback)
        else:
            try:
                horario_dt = datetime.fromisoformat(horario_escolhido)
                # Procurar horário correspondente na lista
                for horario in horarios_disponiveis:
                    if horario['datetime_agendamento'] == horario_escolhido:
                        logger.info(f"✅ Cliente escolheu horário ISO: {horario_dt}")
                        return horario

                logger.warning(f"⚠️ Horário ISO não encontrado na lista: {horario_escolhido}")
                return None

            except:
                logger.warning(f"⚠️ Formato de horário inválido: {horario_escolhido}")
                return None

    except Exception as e:
        logger.error(f"Erro ao processar escolha de horário: {e}")
        return None

async def verificar_horario_ainda_disponivel(data_horario: str, tecnico_nome: str = None) -> bool:
    """
    Verifica se um horário específico ainda está disponível antes de confirmar
    """
    try:
        supabase = get_supabase_client()

        # Converter string para datetime
        horario_dt = datetime.fromisoformat(data_horario)
        data_str = horario_dt.strftime('%Y-%m-%d')
        hora_str = horario_dt.strftime('%H:%M')

        # Buscar conflitos em agendamentos AI
        response_ai = supabase.table("agendamentos_ai").select("*").gte(
            "data_agendada", f"{data_str}T00:00:00"
        ).lt("data_agendada", f"{data_str}T23:59:59").execute()

        # Buscar conflitos em ordens de serviço
        response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).execute()

        agendamentos_ai = response_ai.data if response_ai.data else []
        ordens_servico = response_os.data if response_os.data else []

        # Verificar conflitos
        margem = timedelta(hours=1)  # Margem de 1 hora

        for ag in agendamentos_ai:
            if ag.get('data_agendada'):
                try:
                    data_ag = datetime.fromisoformat(ag['data_agendada'].replace('Z', '+00:00'))
                    if abs((horario_dt - data_ag).total_seconds()) < margem.total_seconds():
                        logger.warning(f"⚠️ Conflito encontrado com agendamento AI: {ag.get('nome')} às {data_ag}")
                        return False
                except:
                    continue

        for os in ordens_servico:
            if os.get('scheduled_time'):
                try:
                    hora_os = int(os['scheduled_time'].split(':')[0])
                    if abs(horario_dt.hour - hora_os) <= 1:  # Margem de 1 hora
                        logger.warning(f"⚠️ Conflito encontrado com OS: {os.get('client_name')} às {os['scheduled_time']}")
                        return False
                except:
                    continue

        logger.info(f"✅ Horário {data_horario} ainda disponível")
        return True

    except Exception as e:
        logger.error(f"Erro ao verificar disponibilidade do horário: {e}")
        return False  # Por segurança, considerar indisponível se houver erro

# Função para inserir agendamento no Supabase - DESABILITADA PARA ETAPA 1
async def inserir_agendamento(agendamento: Dict[str, Any]) -> Dict[str, Any]:
    # ❌ FUNÇÃO DESABILITADA - NÃO CRIAR PRÉ-AGENDAMENTO NA ETAPA 1
    logger.info(f"🚫 FUNÇÃO inserir_agendamento DESABILITADA - não criando pré-agendamento")
    return {"success": False, "error": "Função desabilitada - usar apenas ETAPA 2"}

async def verificar_duplicata_agendamento(data: dict) -> dict:
    """
    🛡️ Verificação inteligente de duplicatas de agendamento
    """
    try:
        supabase = get_supabase_client()

        # Extrair dados para verificação
        cpf = data.get("cpf", "").strip()
        telefone = data.get("telefone", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()
        nome = data.get("nome", "").strip()

        # Janela de tempo para verificação (últimas 4 horas - mais rigorosa)
        agora = datetime.now()
        janela_tempo = agora - timedelta(hours=4)

        logger.info(f"🛡️ Verificando duplicatas para: CPF={cpf}, Tel={telefone}, Nome={nome}")

        # 1. VERIFICAR DUPLICATAS EXATAS EM SERVICE_ORDERS
        if cpf or telefone:
            query = supabase.table("service_orders").select("*")

            if cpf:
                query = query.eq("client_cpf_cnpj", cpf)
            elif telefone:
                query = query.eq("client_phone", telefone)

            response = query.gte("created_at", janela_tempo.isoformat()).execute()

            if response.data:
                for os in response.data:
                    # Verificar similaridade dos dados
                    similaridade = 0
                    total_checks = 0

                    # Comparar equipamento
                    if equipamento and os.get("equipment_type"):
                        total_checks += 1
                        if equipamento.lower() in os.get("equipment_type", "").lower():
                            similaridade += 1

                    # Comparar endereço
                    if endereco and os.get("pickup_address"):
                        total_checks += 1
                        endereco_os = os.get("pickup_address", "").lower()
                        if any(palavra in endereco_os for palavra in endereco.lower().split() if len(palavra) > 3):
                            similaridade += 1

                    # Comparar nome
                    if nome and os.get("client_name"):
                        total_checks += 1
                        if nome.lower() in os.get("client_name", "").lower():
                            similaridade += 1

                    # Se similaridade > 60%, considerar duplicata (mais rigoroso)
                    if total_checks > 0 and (similaridade / total_checks) > 0.6:
                        tempo_criacao = datetime.fromisoformat(os.get("created_at", "").replace("Z", "+00:00"))
                        minutos_atras = int((agora - tempo_criacao.replace(tzinfo=None)).total_seconds() / 60)

                        logger.warning(f"🚨 DUPLICATA DETECTADA: OS {os.get('order_number')} criada há {minutos_atras} minutos")

                        return {
                            "is_duplicate": True,
                            "duplicate_type": "exact",
                            "existing_os": os,
                            "minutes_ago": minutos_atras,
                            "similarity_score": round((similaridade / total_checks) * 100, 1)
                        }

        # 2. VERIFICAR DUPLICATAS EM AGENDAMENTOS_AI (pré-agendamentos) - MAIS RIGOROSO
        if telefone:
            response_ai = supabase.table("agendamentos_ai").select("*").eq(
                "telefone", telefone
            ).gte("created_at", janela_tempo.isoformat()).execute()

            if response_ai.data and len(response_ai.data) > 0:
                # Verificar se há pré-agendamentos muito recentes (últimos 30 minutos)
                janela_recente = agora - timedelta(minutes=30)
                agendamentos_recentes = [
                    ag for ag in response_ai.data
                    if datetime.fromisoformat(ag.get("created_at", "").replace("Z", "+00:00")).replace(tzinfo=None) > janela_recente
                ]

                if agendamentos_recentes:
                    logger.warning(f"🚨 PRÉ-AGENDAMENTO RECENTE: {len(agendamentos_recentes)} para telefone {telefone} nos últimos 30 min")

                    return {
                        "is_duplicate": True,
                        "duplicate_type": "recent_pre_scheduling",
                        "count": len(agendamentos_recentes),
                        "latest": agendamentos_recentes[0],
                        "minutes_ago": int((agora - datetime.fromisoformat(agendamentos_recentes[0].get("created_at", "").replace("Z", "+00:00")).replace(tzinfo=None)).total_seconds() / 60)
                    }

        logger.info("✅ Nenhuma duplicata detectada")
        return {"is_duplicate": False}

    except Exception as e:
        logger.error(f"❌ Erro na verificação de duplicatas: {e}")
        return {"is_duplicate": False}

# Endpoint para ETAPA 1 - Neural Chain 1 do ClienteChat
@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """
    🎯 ENDPOINT INTELIGENTE: Detecta automaticamente ETAPA 1 ou ETAPA 2 com proteção anti-duplicata
    """
    try:
        # 🕐 SEMPRE VERIFICAR HORÁRIO REAL ANTES DE QUALQUER OPERAÇÃO
        info_horario = verificar_horario_real_sistema()

        data = await request.json()
        logger.info(f"🚀 NEURAL CHAIN 1: Executando consulta de disponibilidade")
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")

        # Log do horário de referência para as pesquisas
        logger.info(f"📅 HORÁRIO DE REFERÊNCIA PARA PESQUISAS: {info_horario['brasil']['formatted']}")

        # 💰 LOG DO VALOR DO SERVIÇO
        valor_servico = data.get("valor_servico")
        if valor_servico:
            logger.info(f"💰 VALOR DO SERVIÇO recebido do ClienteChat: R$ {valor_servico}")
        else:
            logger.warning(f"⚠️ VALOR DO SERVIÇO não informado pelo ClienteChat")

        # 🛡️ VERIFICAÇÃO ANTI-DUPLICATA
        duplicata_check = await verificar_duplicata_agendamento(data)

        if duplicata_check["is_duplicate"]:
            if duplicata_check["duplicate_type"] == "exact":
                os_existente = duplicata_check["existing_os"]
                minutos = duplicata_check["minutes_ago"]

                mensagem_duplicata = f"""🚨 *Agendamento já existe!*

Detectamos que você já tem um agendamento recente:

📋 *OS:* {os_existente.get('order_number', 'N/A')}
👤 *Cliente:* {os_existente.get('client_name', 'N/A')}
🔧 *Equipamento:* {os_existente.get('equipment_type', 'N/A')}
⏰ *Criado há:* {minutos} minutos

✅ *Seu agendamento está confirmado!*

Se precisar de alterações, entre em contato:
📞 (48) 98833-2664"""

                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "message": mensagem_duplicata,
                        "duplicate_detected": True,
                        "existing_order": os_existente.get('order_number'),
                        "action": "duplicate_warning"
                    }
                )

            elif duplicata_check["duplicate_type"] in ["pre_scheduling", "recent_pre_scheduling"]:
                count = duplicata_check["count"]
                minutos = duplicata_check.get("minutes_ago", 0)

                if duplicata_check["duplicate_type"] == "recent_pre_scheduling":
                    mensagem_multiplos = f"""🚨 *Agendamento em andamento!*

Detectamos uma tentativa de agendamento há {minutos} minutos.

⏳ *Seu agendamento está sendo processado...*

Por favor, aguarde alguns instantes e evite clicar novamente.
Se não receber confirmação em 5 minutos, tente novamente."""
                else:
                    mensagem_multiplos = f"""⚠️ *Múltiplas tentativas detectadas*

Encontramos {count} tentativas de agendamento recentes.

🔄 *Processando seu agendamento...*

Por favor, aguarde alguns instantes e evite clicar novamente.

📞 Dúvidas: (48) 98833-2664"""

                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "message": mensagem_multiplos,
                        "duplicate_detected": True,
                        "multiple_attempts": count,
                        "action": "wait_processing"
                    }
                )

        # 🧠 DETECÇÃO INTELIGENTE DE ETAPA
        logger.info("🔍 DEBUG: Iniciando detecção inteligente de etapa")
        horario_escolhido = data.get("horario_escolhido", "1").strip()
        telefone = data.get("telefone", "").strip()
        logger.info(f"🔍 DEBUG: horario_escolhido='{horario_escolhido}', telefone='{telefone}'")

        # Verificar se há pré-agendamento recente
        supabase = get_supabase_client()
        tres_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=10)
        response_busca = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone
        ).eq("status", "pendente").gte("created_at", tres_minutos_atras.isoformat()).order("created_at", desc=True).limit(1).execute()

        tem_pre_agendamento = bool(response_busca.data)
        logger.info(f"🔍 DEBUG: Pré-agendamentos encontrados: {len(response_busca.data) if response_busca.data else 0}")

        if tem_pre_agendamento:
            # ETAPA 2: CONFIRMAÇÃO
            logger.info(f"🎯 ETAPA 2 DETECTADA: Cliente escolheu opção '{horario_escolhido}' - confirmando agendamento")
            return await processar_etapa_2_confirmacao(horario_escolhido, telefone)
        else:
            # ETAPA 1: CONSULTA
            logger.info(f"🎯 ETAPA 1 DETECTADA: Primeira consulta - gerando opções de horário")
            resultado_consulta = await consultar_disponibilidade_interna(data)

            # Criar pré-agendamento
            if hasattr(resultado_consulta, 'status_code') and resultado_consulta.status_code == 200:
                logger.info("💾 ETAPA 1: Criando pré-agendamento após consulta bem-sucedida")
                await criar_pre_agendamento_etapa1(data, telefone)

            return resultado_consulta

    except Exception as e:
        logger.error(f"❌ Erro no agendamento inteligente: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Erro interno do servidor"}
        )

async def criar_pre_agendamento_etapa1(data: dict, telefone: str):
    """
    Cria pré-agendamento após ETAPA 1 bem-sucedida
    """
    try:
        supabase = get_supabase_client()

        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        complemento = data.get("complemento", "").strip()  # 🏠 NOVO: Complemento do endereço
        equipamentos = []
        problemas = []
        tipos_atendimento = []

        # Coletar dados de múltiplos equipamentos
        for i in range(1, 4):
            equip = data.get(f"equipamento_{i}" if i > 1 else "equipamento", "").strip()
            problema = data.get(f"problema_{i}" if i > 1 else "problema", "").strip()
            tipo_atend = data.get(f"tipo_atendimento_{i}", "em_domicilio").strip()

            if equip:
                equipamentos.append(equip)
                problemas.append(problema)
                tipos_atendimento.append(tipo_atend)

        # Dados do pré-agendamento
        pre_agendamento_data = {
            "nome": nome,
            "endereco": endereco,
            "complemento": complemento,  # 🏠 NOVO: Complemento do endereço
            "telefone": telefone,
            "cpf": data.get("cpf", ""),
            "email": data.get("email", ""),
            # Equipamentos individuais
            "equipamento": equipamentos[0] if equipamentos else "",
            "equipamento_2": equipamentos[1] if len(equipamentos) > 1 else "",
            "equipamento_3": equipamentos[2] if len(equipamentos) > 2 else "",
            "equipamentos": equipamentos,  # Array completo
            # Problemas individuais
            "problema": problemas[0] if problemas else "",
            "problema_2": problemas[1] if len(problemas) > 1 else "",
            "problema_3": problemas[2] if len(problemas) > 2 else "",
            "problemas": problemas,  # Array completo
            # Tipos de atendimento individuais
            "tipo_atendimento_1": tipos_atendimento[0] if tipos_atendimento else "em_domicilio",
            "tipo_atendimento_2": tipos_atendimento[1] if len(tipos_atendimento) > 1 else "",
            "tipo_atendimento_3": tipos_atendimento[2] if len(tipos_atendimento) > 2 else "",
            # 💰 SALVAR TODOS OS VALORES DO CLIENTECHAT nas colunas corretas
            "valor_os_1": float(data.get("valor_os_1") or data.get("valor_servico") or 0),
            "valor_os_2": float(data.get("valor_os_2") or 0),
            "valor_os_3": float(data.get("valor_os_3") or 0),
            # Status e outros campos
            "status": "pendente",
            "urgente": data.get("urgente", "não").lower() == "sim"
        }

        # Debug: Log dos dados antes de inserir
        logger.info(f"💾 ETAPA 1: Dados do pré-agendamento:")
        logger.info(f"   - Nome: {nome}")
        logger.info(f"   - Endereço: {endereco}")
        logger.info(f"   - Complemento: {complemento}")
        logger.info(f"   - Equipamentos: {equipamentos}")
        logger.info(f"   - Problemas: {problemas}")
        logger.info(f"   - Tipos atendimento: {tipos_atendimento}")
        logger.info(f"   - Valores: valor_os_1={pre_agendamento_data.get('valor_os_1')}, valor_os_2={pre_agendamento_data.get('valor_os_2')}, valor_os_3={pre_agendamento_data.get('valor_os_3')}")

        # Inserir no banco
        response = supabase.table("agendamentos_ai").insert(pre_agendamento_data).execute()
        logger.info(f"💾 ETAPA 1: Pré-agendamento criado com ID: {response.data[0]['id']}")

    except Exception as e:
        logger.error(f"❌ Erro ao criar pré-agendamento: {e}")

# Endpoint para confirmação de agendamento (ETAPA 2) - Neural Chain 2
@app.post("/agendamento-inteligente-confirmacao")
async def agendamento_inteligente_confirmacao(request: Request):
    """
    ETAPA 2: Confirmação final usando dados da tabela agendamentos_ai
    Recebe apenas: opcao_escolhida + telefone_contato
    """
    try:
        data = await request.json()
        logger.info(f"🚀 ETAPA 2: Confirmação recebida - dados: {data}")

        # Extrair dados essenciais
        opcao_escolhida = data.get("opcao_escolhida", "").strip()
        telefone_contato = data.get("telefone_contato", "").strip()

        logger.info(f"🔍 ETAPA 2: opcao_escolhida='{opcao_escolhida}', telefone='{telefone_contato}'")

        # 🧠 SISTEMA DE INTERPRETAÇÃO INTELIGENTE E FLEXÍVEL
        opcao_normalizada = interpretar_opcao_flexivel(opcao_escolhida)

        logger.info(f"🔍 ETAPA 2: Resultado da interpretação: '{opcao_escolhida}' → '{opcao_normalizada}'")

        if opcao_normalizada:
            logger.info(f"✅ ETAPA 2: Opção interpretada: '{opcao_escolhida}' → '{opcao_normalizada}'")

        if not opcao_normalizada:
            logger.error(f"❌ ETAPA 2: Opção inválida recebida: '{opcao_escolhida}'")
            logger.error(f"❌ ETAPA 2: Opções válidas: 1, 2, 3, manhã, tarde, ou horários específicos")
            logger.error(f"❌ ETAPA 2: Debug - opcao_lower seria: '{opcao_escolhida.lower().strip()}'")
            return JSONResponse(
                status_code=200,  # Mudando para 200 para não quebrar o fluxo
                content={
                    "success": False,
                    "message": f"❌ *Opção não reconhecida:* '{opcao_escolhida}'\n\n"
                              f"📝 *Por favor, responda com:*\n"
                              f"• *1*, *2* ou *3* (número da opção)\n"
                              f"• *9h*, *14h*, *16h* (horário desejado)\n"
                              f"• *manhã* ou *tarde* (período)\n"
                              f"• *quinta*, *sexta*, *segunda* (dia)\n\n"
                              f"💡 *Exemplo:* Digite *1* ou *9h* para o primeiro horário",
                    "action": "retry_selection"
                }
            )

        logger.info(f"✅ ETAPA 2: Opção normalizada: '{opcao_escolhida}' → '{opcao_normalizada}'")

        if not telefone_contato:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Telefone não informado."}
            )

        # Buscar pré-agendamento mais recente por telefone
        supabase = get_supabase_client()
        dois_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=2)

        logger.info(f"🔍 ETAPA 2: Buscando pré-agendamento por telefone {telefone_contato}")
        response_busca = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone_contato
        ).eq("status", "pendente").gte(
            "created_at", dois_minutos_atras.isoformat()
        ).order("created_at", desc=True).limit(1).execute()

        if not response_busca.data:
            logger.error(f"❌ ETAPA 2: Nenhum pré-agendamento encontrado para telefone {telefone_contato}")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Pré-agendamento não encontrado. Inicie o processo novamente."}
            )

        pre_agendamento = response_busca.data[0]
        agendamento_id = pre_agendamento["id"]
        logger.info(f"✅ ETAPA 2: Pré-agendamento encontrado: {agendamento_id}")

        # Processar confirmação final
        return await processar_confirmacao_final(pre_agendamento, opcao_normalizada)

    except Exception as e:
        logger.error(f"❌ ETAPA 2: Erro ao processar confirmação: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar confirmação: {str(e)}"}
        )

# Função para processar confirmação final (ETAPA 2)
async def processar_confirmacao_final(pre_agendamento: dict, opcao_escolhida: str):
    """
    Processa a confirmação final usando dados do pré-agendamento
    """
    try:
        logger.info(f"🔄 ETAPA 2: Processando confirmação final - opção {opcao_escolhida}")

        # Extrair dados do pré-agendamento
        horarios_oferecidos = pre_agendamento.get("horarios_oferecidos", [])
        tecnico_sugerido = pre_agendamento.get("tecnico_sugerido", "Simão")
        urgente = pre_agendamento.get("urgente", False)

        # Verificar se horarios_oferecidos é string (JSON) e converter
        if isinstance(horarios_oferecidos, str):
            import json
            try:
                horarios_oferecidos = json.loads(horarios_oferecidos)
            except:
                logger.error(f"❌ Erro ao parsear horarios_oferecidos: {horarios_oferecidos}")
                horarios_oferecidos = []

        logger.info(f"🔍 ETAPA 2: Horários oferecidos: {horarios_oferecidos}")
        logger.info(f"🔍 ETAPA 2: Tipo: {type(horarios_oferecidos)}")

        # Validar opção escolhida
        opcao_index = int(opcao_escolhida) - 1
        if opcao_index < 0 or opcao_index >= len(horarios_oferecidos):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Opção de horário inválida."}
            )

        horario_selecionado = horarios_oferecidos[opcao_index]
        logger.info(f"🔍 ETAPA 2: Horário selecionado: {horario_selecionado}")
        logger.info(f"🔍 ETAPA 2: Tipo do horário selecionado: {type(horario_selecionado)}")

        # Verificar se é dict ou string
        if isinstance(horario_selecionado, dict):
            horario_escolhido = horario_selecionado.get('datetime_agendamento')
        else:
            # Se for string, usar como está (fallback)
            horario_escolhido = horario_selecionado

        logger.info(f"✅ ETAPA 2: Datetime agendamento: {horario_escolhido}")

        # ✅ USAR DADOS REAIS DO PRÉ-AGENDAMENTO (não hardcoded)
        dados_reais = {
            "nome": pre_agendamento.get("nome", "Cliente"),
            "telefone": pre_agendamento.get("telefone", ""),
            "endereco": pre_agendamento.get("endereco", ""),
            "complemento": pre_agendamento.get("complemento", ""),  # 🏠 NOVO: Complemento do endereço
            "equipamento": pre_agendamento.get("equipamento", ""),
            "problema": pre_agendamento.get("problema", ""),  # ✅ PROBLEMA REAL DO CLIENTE
            "cpf": pre_agendamento.get("cpf", ""),
            "email": pre_agendamento.get("email", ""),
            "tecnico": tecnico_sugerido,
            "urgente": urgente,
            "horario_agendado": horario_escolhido,
            "tipo_atendimento": pre_agendamento.get("tipo_atendimento_1", "em_domicilio"),  # ✅ TIPO REAL
            "valor_os": obter_valor_servico(
                pre_agendamento.get("tipo_atendimento_1", "em_domicilio"),
                pre_agendamento.get("valor_servico")  # Valor deve estar salvo no pré-agendamento
            )
        }

        logger.info(f"✅ ETAPA 2: Usando dados reais do pré-agendamento:")
        logger.info(f"   - Nome: {dados_reais['nome']}")
        logger.info(f"   - Endereço: {dados_reais['endereco']}")
        logger.info(f"   - Complemento: {dados_reais['complemento']}")
        logger.info(f"   - Problema: {dados_reais['problema']}")
        logger.info(f"   - Equipamento: {dados_reais['equipamento']}")
        logger.info(f"   - Tipo Atendimento: {dados_reais['tipo_atendimento']}")

        # Criar OS usando dados reais
        logger.info("🔄 ETAPA 2: Criando Ordem de Serviço...")
        os_criada = await criar_os_completa(dados_reais)

        if os_criada["success"]:
            # Atualizar pré-agendamento como confirmado
            supabase = get_supabase_client()
            supabase.table("agendamentos_ai").update({
                "status": "confirmado",
                "os_numero": os_criada["os_numero"],
                "horario_confirmado": horario_escolhido,
                "dados_finais": dados_reais
            }).eq("id", pre_agendamento["id"]).execute()

            logger.info(f"✅ ETAPA 2: OS criada com sucesso - {os_criada['os_numero']}")

            # 🧠 RESPOSTA INTELIGENTE ESTRUTURADA PARA CLIENTECHAT
            # Retorna dados estruturados que a instrução pode usar de forma inteligente

            # Dados básicos do agendamento
            # 🔧 SUPORTE PARA MÚLTIPLOS EQUIPAMENTOS
            equipamentos_lista = dados_reais.get('equipamentos', [])
            if not equipamentos_lista and dados_reais.get('equipamento'):
                equipamentos_lista = [dados_reais['equipamento']]

            # Formatação inteligente de equipamentos
            if len(equipamentos_lista) == 1:
                equipamentos_texto = equipamentos_lista[0]
            elif len(equipamentos_lista) == 2:
                equipamentos_texto = f"{equipamentos_lista[0]} e {equipamentos_lista[1]}"
            else:
                equipamentos_texto = f"{', '.join(equipamentos_lista[:-1])} e {equipamentos_lista[-1]}"

            resposta_dados = {
                "status": "confirmado",
                "os_numero": os_criada['os_numero'],
                "cliente": dados_reais['nome'],
                "telefone": dados_reais['telefone'],
                "endereco": dados_reais['endereco'],
                "equipamento": equipamentos_texto,  # Texto formatado para múltiplos equipamentos
                "equipamentos_count": len(equipamentos_lista),  # Quantidade de equipamentos
                "problema": dados_reais['problema'],
                "horario": horario_escolhido,
                "tecnico": dados_reais['tecnico'],
                "valor": f"R$ {dados_reais['valor_os']:.2f}",
                "conta_criada": os_criada.get("conta_criada", False)
            }

            # Adicionar dados de acesso se conta foi criada
            if os_criada.get("conta_criada") and os_criada.get("dados_acesso") and os_criada["dados_acesso"] is not None:
                dados_acesso = os_criada["dados_acesso"]
                resposta_dados.update({
                    "email_acesso": dados_acesso['email'],
                    "senha_acesso": dados_acesso['senha'],
                    "portal_url": "app.fixfogoes.com.br"
                })

            # Mensagem estruturada para ClienteChat usar
            mensagem = f"""AGENDAMENTO_CONFIRMADO|OS:{resposta_dados['os_numero']}|CLIENTE:{resposta_dados['cliente']}|HORARIO:{resposta_dados['horario']}|TECNICO:{resposta_dados['tecnico']}|VALOR:{resposta_dados['valor']}|EQUIPAMENTOS:{resposta_dados['equipamento']}|QTD_EQUIPAMENTOS:{resposta_dados['equipamentos_count']}"""

            if resposta_dados['conta_criada']:
                mensagem += f"""|CONTA_CRIADA:SIM|EMAIL:{resposta_dados['email_acesso']}|SENHA:{resposta_dados['senha_acesso']}|PORTAL:{resposta_dados['portal_url']}"""
            else:
                mensagem += f"""|CONTA_CRIADA:NAO"""

            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": mensagem,
                    "os_numero": os_criada['os_numero'],
                    "dados_agendamento": dados_reais
                }
            )
        else:
            logger.error(f"❌ ETAPA 2: Erro ao criar OS: {os_criada.get('message')}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Erro ao criar OS: {os_criada.get('message')}"}
            )

    except Exception as e:
        logger.error(f"❌ ETAPA 2: Erro ao processar confirmação final: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar confirmação: {str(e)}"}
        )

# Função para criar OS completa (ETAPA 2)
async def criar_os_completa(dados: dict):
    """
    Cria OS completa usando dados reais (sem placeholders)
    """
    try:
        logger.info("🔄 Criando OS completa...")
        supabase = get_supabase_client()

        # Gerar número sequencial da OS usando função correta
        os_numero = await gerar_proximo_numero_os()

        logger.info(f"📋 Número da OS gerado: {os_numero}")

        # Criar cliente usando autenticação Supabase
        resultado_cliente = await criar_cliente_com_auth_supabase(dados)

        # Agora sempre retorna dict
        cliente_id = resultado_cliente["cliente_id"]
        conta_criada = resultado_cliente["conta_criada"]
        dados_acesso = resultado_cliente["dados_acesso"]

        if conta_criada:
            logger.info(f"✅ Cliente processado com nova conta: {cliente_id}")
        else:
            logger.info(f"✅ Cliente existente processado: {cliente_id}")

        # Buscar ID do técnico pelo nome
        tecnico_nome = dados.get("tecnico", "Paulo Cesar Betoni")
        logger.info(f"🔍 Buscando ID do técnico: {tecnico_nome}")

        response_tecnico = supabase.table("technicians").select("id, name").ilike("name", f"%{tecnico_nome}%").limit(1).execute()

        if response_tecnico.data and len(response_tecnico.data) > 0:
            tecnico_id = response_tecnico.data[0]["id"]
            tecnico_nome_real = response_tecnico.data[0]["name"]
            logger.info(f"✅ Técnico encontrado: {tecnico_nome_real} (ID: {tecnico_id})")
        else:
            # Fallback para Paulo Cesar Betoni se não encontrar
            logger.warning(f"⚠️ Técnico '{tecnico_nome}' não encontrado, usando Paulo Cesar Betoni")
            response_paulo = supabase.table("technicians").select("id, name").ilike("name", "%Paulo%").limit(1).execute()
            if response_paulo.data and len(response_paulo.data) > 0:
                tecnico_id = response_paulo.data[0]["id"]
                tecnico_nome_real = response_paulo.data[0]["name"]
                logger.info(f"✅ Técnico fallback: {tecnico_nome_real} (ID: {tecnico_id})")
            else:
                logger.error("❌ Nenhum técnico encontrado na base de dados!")
                tecnico_id = None
                tecnico_nome_real = tecnico_nome

        # Extrair horário para scheduled_time
        horario_agendado_raw = dados.get("horario_agendado")
        logger.info(f"🔍 DEBUG: horario_agendado_raw = {horario_agendado_raw} (tipo: {type(horario_agendado_raw)})")
        horario_agendado_iso = converter_horario_para_iso_direto(horario_agendado_raw)

        # Extrair apenas o horário (HH:MM) do ISO datetime
        try:
            from datetime import datetime
            dt_parsed = datetime.fromisoformat(horario_agendado_iso.replace('Z', '+00:00'))
            scheduled_time = dt_parsed.strftime('%H:%M')
        except:
            scheduled_time = "10:00"  # Fallback

        # Criar OS com TODOS os campos que o frontend usa
        os_data = {
            "client_id": cliente_id,
            "client_name": dados["nome"],
            "client_phone": dados["telefone"],
            "client_email": dados.get("email", ""),
            "client_cpf_cnpj": dados.get("cpf", ""),
            "equipment_type": dados["equipamento"],
            "description": dados["problema"],
            "service_attendance_type": dados.get("tipo_atendimento", "em_domicilio"),
            "status": "scheduled",
            "technician_id": tecnico_id,  # ✅ ID DO TÉCNICO (obrigatório para dashboard)
            "technician_name": tecnico_nome_real,  # ✅ NOME DO TÉCNICO
            "scheduled_date": horario_agendado_iso,  # ✅ DATA E HORA COMPLETA
            "scheduled_time": scheduled_time,  # ✅ APENAS HORÁRIO (HH:MM)
            "created_at": datetime.now().isoformat(),  # ✅ DATA DE CRIAÇÃO
            "completed_date": None,  # ✅ AINDA NÃO COMPLETADO
            "needs_pickup": dados.get("tipo_atendimento") in ["coleta_conserto", "coleta_diagnostico"],  # ✅ BASEADO NO TIPO
            "current_location": "client",  # ✅ SEMPRE INICIA NO CLIENTE (independente do tipo)
            "initial_cost": obter_valor_inicial(
                dados.get("tipo_atendimento", "em_domicilio"),
                dados.get("valor_os")
            ),
            "final_cost": obter_valor_servico(
                dados.get("tipo_atendimento", "em_domicilio"),
                dados.get("valor_os")
            ),
            "order_number": os_numero,
            "pickup_address": dados["endereco"],
            "pickup_address_complement": dados.get("complemento", "")  # 🏠 NOVO: Complemento do endereço
        }

        response_os = supabase.table("service_orders").insert(os_data).execute()
        os_id = response_os.data[0]["id"]

        logger.info(f"✅ OS criada com sucesso: {os_numero} (ID: {os_id})")

        # 🔧 CORREÇÃO: Criar agendamento específico em scheduled_services
        # Para manter consistência com o resto do sistema
        if tecnico_id and horario_agendado_iso:
            try:
                # Calcular horário de fim (1 hora depois)
                horario_inicio = datetime.fromisoformat(horario_agendado_iso.replace('Z', '+00:00'))
                horario_fim = horario_inicio + timedelta(hours=1)

                agendamento_data = {
                    "service_order_id": os_id,
                    "client_id": cliente_id,  # 🔧 CORREÇÃO: Adicionar client_id que estava faltando
                    "technician_id": tecnico_id,
                    "technician_name": tecnico_nome_real,
                    "client_name": dados["nome"],
                    "scheduled_start_time": horario_inicio.isoformat(),
                    "scheduled_end_time": horario_fim.isoformat(),
                    "address": dados["endereco"],
                    "address_complement": dados.get("complemento", ""),  # 🏠 NOVO: Complemento do endereço
                    "description": dados["problema"],
                    "status": "scheduled"
                }

                response_agendamento = supabase.table("scheduled_services").insert(agendamento_data).execute()
                agendamento_id = response_agendamento.data[0]["id"]

                logger.info(f"✅ Agendamento criado com sucesso: {agendamento_id}")
                logger.info(f"🕐 Horário: {horario_inicio.strftime('%d/%m/%Y %H:%M')} - {horario_fim.strftime('%H:%M')}")

            except Exception as e:
                logger.error(f"❌ Erro ao criar agendamento: {str(e)}")
                # Não falhar a criação da OS por causa do agendamento
                pass

        return {
            "success": True,
            "os_numero": os_numero,
            "os_id": os_id,
            "cliente_id": cliente_id,
            "conta_criada": conta_criada,
            "dados_acesso": dados_acesso
        }

    except Exception as e:
        logger.error(f"❌ Erro ao criar OS completa: {e}")
        return {
            "success": False,
            "message": str(e)
        }

# Endpoint para verificar saúde da API
@app.get("/health")
async def health_check():
    try:
        # Teste rápido de conectividade com Supabase
        supabase = get_supabase_client()
        test_response = supabase.table("technicians").select("count", count="exact").limit(1).execute()
        supabase_status = "connected" if test_response else "error"

        return {
            "status": "ok",
            "version": "3.1.4-PERFORMANCE-OPTIMIZED",
            "timestamp": datetime.now(pytz.timezone('America/Sao_Paulo')).isoformat(),
            "middleware": "agendamento-inteligente",
            "railway_deploy": "python311_optimized",
            "build_status": "WORKING",
            "supabase_status": supabase_status,
            "cache_status": "enabled" if _supabase_client else "initializing",
            "performance": {
                "timeout_keep_alive": 300,
                "timeout_graceful_shutdown": 30,
                "cache_enabled": True
            }
        }
    except Exception as e:
        logger.error(f"❌ Health check error: {e}")
        return {
            "status": "degraded",
            "version": "3.1.4-PERFORMANCE-OPTIMIZED",
            "error": str(e)
        }

@app.get("/test-avaliacao")
async def test_avaliacao():
    """Endpoint de teste para avaliação"""
    return {"success": True, "message": "Endpoint funcionando!"}

@app.post("/solicitar-avaliacao-google")
async def solicitar_avaliacao_google(request: Request):
    """
    Endpoint para solicitar avaliação no Google após conclusão do serviço
    🤖 INTEGRAÇÃO CLIENTECHAT: Dispara neural chain automaticamente
    """
    try:
        data = await request.json()
        os_numero = data.get("os_numero", "#000")
        cliente_nome = data.get("cliente_nome", "Cliente")
        telefone = data.get("telefone", "")
        trigger_neural_chain = data.get("trigger_neural_chain", False)

        # URL do Google Reviews (definida no início do arquivo)
        google_url = "https://g.page/r/CfjiXeK7gOSLEAg/review"

        # Dados estruturados para #external_return#
        external_return = f"AVALIACAO_SOLICITADA|OS:{os_numero}|CLIENTE:{cliente_nome}|TELEFONE:{telefone}|URL:{google_url}|STATUS:ENVIADO"

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": external_return,
                "external_return": external_return,
                "os_numero": os_numero,
                "cliente": cliente_nome,
                "telefone": telefone,
                "neural_chain_triggered": trigger_neural_chain and telefone != ""
            }
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro: {str(e)}"}
        )

@app.post("/finalizar-os")
async def finalizar_os(request: Request):
    """
    Endpoint para finalizar OS e automaticamente solicitar avaliação Google
    """
    try:
        data = await request.json()

        # Dados obrigatórios
        os_numero = data.get("os_numero", "")
        observacoes = data.get("observacoes", "")

        if not os_numero:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Número da OS é obrigatório"}
            )

        supabase = get_supabase_client()

        # 1. Buscar a OS no banco
        response = supabase.table("service_orders").select("*").eq("order_number", os_numero).execute()

        if not response.data:
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": f"OS {os_numero} não encontrada"}
            )

        os_data = response.data[0]

        # 2. Atualizar status para "completed"
        # Garantir encoding correto das observações
        if observacoes:
            try:
                observacoes = observacoes.encode('utf-8', errors='replace').decode('utf-8')
            except:
                observacoes = "Observações não disponíveis"

        update_data = {
            "status": "completed",
            "completed_date": datetime.now().isoformat(),
            "final_observations": observacoes
        }

        supabase.table("service_orders").update(update_data).eq("id", os_data["id"]).execute()

        # 3. Preparar mensagem de avaliação Google
        cliente_nome = os_data.get("client_name", "Cliente")
        telefone = os_data.get("client_phone", "")

        # Garantir encoding correto do nome
        if cliente_nome:
            try:
                cliente_nome = cliente_nome.encode('utf-8', errors='replace').decode('utf-8')
            except:
                cliente_nome = "Cliente"

        mensagem_avaliacao = f"""🎉 *Serviço Concluído - OS {os_numero}*

Olá {cliente_nome}!

✅ Seu serviço foi finalizado com sucesso!

⭐ *Que tal nos ajudar com uma avaliação?*

Sua opinião é muito importante para nós e ajuda outros clientes a conhecerem nosso trabalho.

🔗 *Avalie nosso serviço no Google:*
{GOOGLE_REVIEW_URL}

📝 *Leva apenas 30 segundos!*

Muito obrigado pela confiança! 🙏

---
*Fix Fogões - Assistência Técnica Especializada*
📞 (48) 98833-2664"""

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"OS {os_numero} finalizada com sucesso!",
                "os_finalizada": {
                    "numero": os_numero,
                    "cliente": cliente_nome,
                    "telefone": telefone,
                    "data_conclusao": datetime.now().isoformat(),
                    "observacoes": observacoes
                },
                "avaliacao_google": {
                    "message": mensagem_avaliacao,
                    "url": GOOGLE_REVIEW_URL,
                    "action": "send_google_review_request"
                }
            }
        )

    except Exception as e:
        logger.error(f"Erro ao finalizar OS: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Erro interno do servidor"}
        )

@app.get("/os-tecnico/{tecnico_id}")
async def listar_os_tecnico(tecnico_id: str):
    """
    Lista as OS ativas de um técnico específico
    """
    try:
        supabase = get_supabase_client()

        # Buscar OS ativas do técnico
        response = supabase.table("service_orders").select("*").eq(
            "technician_id", tecnico_id
        ).eq(
            "status", "scheduled"
        ).order("scheduled_date").execute()

        os_ativas = []
        for os in response.data:
            os_ativas.append({
                "id": os["id"],
                "numero": os["order_number"],
                "cliente": os["client_name"],
                "telefone": os["client_phone"],
                "endereco": os.get("pickup_address", ""),
                "equipamento": os["equipment_type"],
                "data_agendada": os["scheduled_date"],
                "hora_agendada": os["scheduled_time"],
                "valor": os.get("final_cost", 0),
                "observacoes": os.get("service_description", "")
            })

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "os_ativas": os_ativas,
                "total": len(os_ativas)
            }
        )

    except Exception as e:
        logger.error(f"Erro ao listar OS do técnico: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Erro interno do servidor"}
        )

# Endpoint de DEBUG para ver dados do ClienteChat
@app.post("/debug-clientechat")
async def debug_clientechat(request: Request):
    try:
        data = await request.json()
        logger.info(f"🐛 DEBUG - Dados brutos recebidos do ClienteChat:")
        logger.info(f"🐛 DEBUG - Tipo: {type(data)}")
        logger.info(f"🐛 DEBUG - Conteúdo: {data}")

        # Verificar cada campo individualmente
        for key, value in data.items():
            logger.info(f"🐛 DEBUG - Campo '{key}': '{value}' (tipo: {type(value)})")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Debug realizado com sucesso",
                "dados_recebidos": data,
                "total_campos": len(data)
            }
        )
    except Exception as e:
        logger.error(f"🐛 DEBUG - Erro: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro no debug: {str(e)}"}
        )

# Endpoint para listar agendamentos
@app.get("/api/agendamentos")
async def listar_agendamentos():
    try:
        supabase = get_supabase_client()
        response = supabase.table("agendamentos_ai").select("*").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Erro ao listar agendamentos: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao listar agendamentos: {str(e)}"}
        )

# Endpoint para consultar disponibilidade
@app.post("/consultar-disponibilidade")
async def consultar_disponibilidade(request: Request):
    try:
        data = await request.json()
        logger.info(f"Consultando disponibilidade: {data}")

        # Extrair e validar dados básicos
        endereco = data.get("endereco", "").strip()
        nome = data.get("nome", "").strip()
        telefone = data.get("telefone", "").strip()
        cpf = data.get("cpf", "").strip()
        email = data.get("email", "").strip()

        # Consolidar equipamentos (pegar o primeiro não vazio)
        equipamentos = []
        for i in range(1, 4):
            eq_key = "equipamento" if i == 1 else f"equipamento_{i}"
            tipo_key = f"tipo_equipamento_{i}"

            equipamento = data.get(eq_key, "").strip()
            tipo_equipamento = data.get(tipo_key, "").strip()

            if equipamento:
                equipamentos.append({
                    "equipamento": equipamento,
                    "tipo": tipo_equipamento or "Não especificado"
                })

        # Consolidar problemas
        problemas = []
        for i in range(1, 4):
            prob_key = "problema" if i == 1 else f"problema_{i}"
            problema = data.get(prob_key, "").strip()
            if problema:
                problemas.append(problema)

        # Validações básicas
        if not endereco:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Endereço é obrigatório"}
            )

        if not equipamentos:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Pelo menos um equipamento deve ser informado"}
            )

        # Determinar urgência
        urgente = data.get("urgente", "não")
        if isinstance(urgente, str):
            urgente = urgente.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        elif isinstance(urgente, bool):
            urgente = urgente
        else:
            urgente = False

        data_preferida = data.get("data_preferida")

        # ROTEIRIZAÇÃO INTELIGENTE: Geocodificar endereço
        logger.info(f"🌍 Iniciando geocodificação para: {endereco}")
        coordenadas = await geocodificar_endereco(endereco)

        # Determinar grupo logístico
        grupo_logistico = determine_logistics_group(endereco, coordenadas)
        logger.info(f"📍 Grupo logístico determinado: {grupo_logistico}")

        # Log dos dados processados
        logger.info(f"Dados processados - Nome: {nome}, Equipamentos: {len(equipamentos)}, Problemas: {len(problemas)}, Urgente: {urgente}, Grupo: {grupo_logistico}")

        # Determinar data de início da busca
        if urgente:
            # Se urgente, buscar a partir de hoje
            data_inicio = datetime.now()
            dias_busca = 2  # Hoje e amanhã
        else:
            # Se não urgente, buscar a partir de amanhã
            if data_preferida:
                try:
                    data_inicio = datetime.strptime(data_preferida, '%Y-%m-%d')
                except:
                    data_inicio = datetime.now() + timedelta(days=1)
            else:
                data_inicio = datetime.now() + timedelta(days=1)
            dias_busca = 5  # Próximos 5 dias

        # Obter horários disponíveis com otimização por grupo logístico
        horarios = await obter_horarios_disponiveis_otimizados(data_inicio, dias_busca, grupo_logistico, urgente, endereco, coordenadas)

        # Limitar a 3 melhores opções
        melhores_horarios = horarios[:3]

        # Determinar técnico baseado nos equipamentos e grupo logístico
        lista_equipamentos = [eq["equipamento"] for eq in equipamentos]
        tecnico_info = await determinar_tecnico_otimizado(lista_equipamentos, grupo_logistico, urgente)
        tecnico = f"{tecnico_info['nome']} ({tecnico_info['email']})"

        # Formatar resposta
        if not melhores_horarios:
            mensagem = "Não encontrei horários disponíveis para os próximos dias. Entre em contato pelo telefone (48) 98833-2664 para agendarmos manualmente."
        else:
            # Resumo do atendimento
            resumo_equipamentos = ", ".join([eq["equipamento"] for eq in equipamentos[:2]])
            if len(equipamentos) > 2:
                resumo_equipamentos += f" e mais {len(equipamentos) - 2} equipamento(s)"

            mensagem = f"🔧 *Agendamento para {nome or 'Cliente'}*\n"
            mensagem += f"📍 {endereco}\n"
            mensagem += f"⚙️ {resumo_equipamentos}\n"
            if urgente:
                mensagem += f"🚨 *URGENTE*\n"

            # Informações do técnico selecionado (mais detalhado e amigável)
            mensagem += f"\n👨‍🔧 *Técnico Designado:* {tecnico_info['nome']}\n"

            # Mostrar especialidades de forma mais natural e específica
            especialidades_texto = ""
            if "coifa" in tecnico_info['especialidades']:
                especialidades_texto = "🔧 Especialista em coifas, depuradores e exaustores"
            elif "fogao" in tecnico_info['especialidades'] or "gas" in tecnico_info['especialidades']:
                especialidades_texto = "🔥 Especialista em fogões, fornos e equipamentos à gás"
            elif "lava-loucas" in tecnico_info['especialidades']:
                especialidades_texto = "💧 Especialista em lava-louças e equipamentos de cozinha"
            else:
                especialidades_texto = "⚙️ Técnico especializado em eletrodomésticos"

            # Adicionar experiência se disponível
            if tecnico_info.get('score', 0) > 10:
                experiencia = "⭐ Técnico experiente e bem avaliado"
            else:
                experiencia = "✅ Técnico qualificado"

            mensagem += f"🎯 {especialidades_texto}\n"
            mensagem += f"{experiencia}\n"

            mensagem += f"\n🗓️ *Horários Disponíveis*\n\n"

            for i, horario in enumerate(melhores_horarios, 1):
                mensagem += f"*{i}) {horario['dia_semana']}, {horario['data_formatada']}*\n"
                mensagem += f"⏰ {horario['hora_inicio']} às {horario['hora_fim']}\n\n"

            mensagem += "Qual horário prefere? Responda com o número da opção (1, 2 ou 3)."

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "horarios_disponiveis": melhores_horarios,
                "tecnico": tecnico,
                "tecnico_detalhado": tecnico_info,
                "urgente": urgente,
                "sistema_otimizado": True,
                "dados_cliente": {
                    "nome": nome,
                    "endereco": endereco,
                    "telefone": telefone,
                    "cpf": cpf,
                    "email": email
                },
                "equipamentos": equipamentos,
                "problemas": problemas
            }
        )

    except Exception as e:
        logger.error(f"Erro ao consultar disponibilidade: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro interno: {str(e)}"}
        )

# Endpoint inteligente que gerencia consulta + confirmação
@app.post("/agendamento-inteligente-completo")
async def agendamento_inteligente_completo(request: Request):
    try:
        data = await request.json()
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")

        # 🔧 NOVA LÓGICA: DETECTAR ETAPA POR PARÂMETRO opcao_escolhida
        opcao_escolhida = data.get("opcao_escolhida", "").strip()
        horario_escolhido = data.get("horario_escolhido", "").strip()

        # 🎯 LÓGICA DE DETECÇÃO CORRIGIDA:
        # ETAPA 1: opcao_escolhida vazio ou não numérico
        # ETAPA 2: opcao_escolhida é "1", "2" ou "3"

        supabase = get_supabase_client()

        if opcao_escolhida and opcao_escolhida in ["1", "2", "3"]:
            logger.info(f"🔍 ETAPA 2 DETECTADA: opcao_escolhida = '{opcao_escolhida}' - confirmando agendamento")
            horario_escolhido = opcao_escolhida  # Usar escolha real do cliente
        else:
            logger.info(f"🔍 ETAPA 1 DETECTADA: opcao_escolhida = '{opcao_escolhida}' - consultando horários")
            horario_escolhido = ""

        # 🔧 LOGS PARA DEBUG
        logger.info(f"🔍 opcao_escolhida recebido: '{data.get('opcao_escolhida', '')}'")
        logger.info(f"🔍 horario_escolhido processado: '{horario_escolhido}'")

        # 🔍 DEBUG: Mostrar dados principais
        logger.info(f"🔍 DEBUG DADOS PRINCIPAIS:")
        logger.info(f"🔍   nome: '{data.get('nome', '')}'")
        logger.info(f"🔍   telefone: '{data.get('telefone', '')}'")
        logger.info(f"🔍   endereco: '{data.get('endereco', '')}'")
        logger.info(f"🔍   equipamento: '{data.get('equipamento', '')}'")
        logger.info(f"🔍   opcao_escolhida: '{data.get('opcao_escolhida', '')}'")
        logger.info(f"🔍   ALL DATA KEYS: {list(data.keys())}")

        if not horario_escolhido:
            # ETAPA 1: CONSULTAR DISPONIBILIDADE
            logger.info("🚀 EXECUTANDO ETAPA 1: Consulta de disponibilidade")

            # 🔧 SOLUÇÃO ALTERNATIVA: Retornar horários com instruções para nova chamada
            horarios = await consultar_disponibilidade_interna(data)

            # Adicionar instruções para o ClienteChat fazer segunda chamada
            if isinstance(horarios, dict) and "message" in horarios:
                horarios["message"] += "\n\n⚠️ IMPORTANTE: Após o cliente escolher, faça nova chamada com horario_escolhido='1', '2' ou '3'"
                horarios["next_step"] = "Aguardar resposta do cliente e fazer nova chamada HTTP"

            return horarios
        else:
            # ETAPA 2: CONFIRMAR AGENDAMENTO
            logger.info("🚀 EXECUTANDO ETAPA 2: Confirmação de agendamento")
            logger.info(f"🎯 DADOS COMPLETOS RECEBIDOS NA ETAPA 2:")
            for key, value in data.items():
                logger.info(f"🎯   {key}: '{value}'")
            logger.info(f"🎯 HORARIO_ESCOLHIDO: '{horario_escolhido}'")
            logger.info(f"🎯 PRESTES A CHAMAR confirmar_agendamento_final")

            try:
                resultado = await confirmar_agendamento_final(data, horario_escolhido)
                logger.info(f"✅ RESULTADO DA ETAPA 2: {resultado}")
                return resultado
            except Exception as e:
                logger.error(f"❌ ERRO NA ETAPA 2: {e}")
                import traceback
                logger.error(f"❌ TRACEBACK: {traceback.format_exc()}")
                return JSONResponse(
                    status_code=500,
                    content={"success": False, "message": f"Erro na confirmação: {str(e)}"}
                )

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"🚨 EXCEÇÃO CAPTURADA NO AGENDAMENTO INTELIGENTE: {e}")
        logger.error(f"🚨 TRACEBACK COMPLETO: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro interno: {str(e)}"}
        )

# Função interna para consulta de disponibilidade
async def consultar_disponibilidade_interna(data: dict):
    try:
        # 🕐 VERIFICAR HORÁRIO REAL ANTES DA CONSULTA
        logger.info("🔍 ═══════════════════════════════════════════════════════════")
        logger.info("🔍 INICIANDO CONSULTA DE DISPONIBILIDADE")
        info_horario = verificar_horario_real_sistema()
        logger.info(f"🔍 Horário de referência: {info_horario['brasil']['formatted']}")
        logger.info("🔍 ═══════════════════════════════════════════════════════════")

        # Extrair dados básicos e filtrar placeholders
        endereco = filtrar_placeholders(data.get("endereco", ""))
        nome = filtrar_placeholders(data.get("nome", ""))
        telefone = filtrar_placeholders(data.get("telefone", ""))
        cpf = filtrar_placeholders(data.get("cpf", ""))
        email = filtrar_placeholders(data.get("email", ""))

        # Consolidar equipamentos e filtrar placeholders
        equipamentos = []
        for i in range(1, 4):
            eq_key = "equipamento" if i == 1 else f"equipamento_{i}"
            tipo_key = f"tipo_equipamento_{i}"

            equipamento = filtrar_placeholders(data.get(eq_key, ""))
            tipo_equipamento = filtrar_placeholders(data.get(tipo_key, ""))

            if equipamento:
                equipamentos.append({
                    "equipamento": equipamento,
                    "tipo": tipo_equipamento or "Não especificado"
                })

        # Consolidar problemas e filtrar placeholders
        problemas = []
        for i in range(1, 4):
            prob_key = "problema" if i == 1 else f"problema_{i}"
            problema = filtrar_placeholders(data.get(prob_key, ""))
            if problema:
                problemas.append(problema)

        # ETAPA 1: Validação flexível - dados podem estar vazios (placeholders filtrados)
        # Na ETAPA 1, geramos horários genéricos. Dados reais virão na ETAPA 2.
        logger.info(f"🔍 ETAPA 1 - Dados após filtro: nome='{nome}', endereco='{endereco}', telefone='{telefone}', equipamentos={len(equipamentos)}")

        # Se todos os dados estão vazios (placeholders filtrados), usar dados padrão para gerar horários
        if not nome and not endereco and not telefone and not equipamentos:
            logger.info("🔍 ETAPA 1 - Todos os dados filtrados (placeholders), usando dados padrão para gerar horários")
            nome = "Cliente"
            endereco = "Balneário Camboriú, SC"  # Padrão para determinar grupo logístico
            telefone = "48999999999"
            equipamentos = [{"equipamento": "Equipamento", "tipo": "Não especificado"}]

        # 🔧 VERIFICAÇÃO ADICIONAL: Garantir que equipamentos não está vazio
        if not equipamentos:
            logger.warning("⚠️ Lista de equipamentos vazia, adicionando equipamento padrão")
            equipamentos = [{"equipamento": "Equipamento", "tipo": "Não especificado"}]

        # Esta função é para consulta de disponibilidade, não para confirmação
        # Determinar técnico baseado no primeiro equipamento usando sistema otimizado
        primeiro_equipamento = equipamentos[0]["equipamento"]
        lista_equipamentos = [eq["equipamento"] for eq in equipamentos]

        # Determinar grupo logístico (usando função atualizada com regras Grupo C)
        grupo_logistico = determine_logistics_group(endereco)

        # Determinar urgência (filtrar placeholders)
        urgente_str = filtrar_placeholders(data.get("urgente", "não"))
        if urgente_str:
            urgente = urgente_str.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        else:
            urgente = False  # Padrão quando placeholder filtrado

        # Extrair tipo de atendimento
        tipo_atendimento = data.get("tipo_atendimento_1", "em_domicilio")
        logger.info(f"🎯 ETAPA 1: Tipo de atendimento: {tipo_atendimento}")

        # Determinar técnico otimizado para ETAPA 1
        logger.info(f"🎯 ETAPA 1: Iniciando determinação de técnico para equipamentos: {lista_equipamentos}")
        logger.info(f"🎯 ETAPA 1: Grupo logístico: {grupo_logistico}, Urgente: {urgente}")

        tecnico_info = await determinar_tecnico_otimizado(lista_equipamentos, grupo_logistico, urgente)
        tecnico = f"{tecnico_info['nome']} ({tecnico_info['email']})"

        logger.info(f"🏆 ETAPA 1: Técnico selecionado: {tecnico_info['nome']} (ID: {tecnico_info['tecnico_id']}, Score: {tecnico_info['score']})")

        # 🎯 ETAPA 1: NOVA LÓGICA - Sempre priorizar datas mais próximas
        logger.info(f"🎯 ETAPA 1: Gerando horários próximas datas para {tecnico_info['nome']} - Grupo {grupo_logistico}")

        # Usar nova função que sempre busca as datas mais próximas
        horarios_disponiveis = await gerar_horarios_proximas_datas_disponiveis(
            tecnico_info['tecnico_id'],
            urgente,
            tipo_atendimento,
            endereco
        )

        # Ajustar grupo logístico nos horários
        for horario in horarios_disponiveis:
            horario['grupo_logistico'] = grupo_logistico

        # Se não encontrou horários próximos, usar fallback da logística inteligente
        if not horarios_disponiveis:
            logger.warning("⚠️ Nenhum horário próximo encontrado, usando logística inteligente como fallback")

            # Geocodificar endereço para otimização de rotas
            coordenadas = await geocodificar_endereco(endereco)

            horarios_disponiveis = await gerar_horarios_logistica_inteligente(
                tecnico_info['tecnico_id'],
                tecnico_info['nome'],
                grupo_logistico,
                coordenadas,
                endereco,
                urgente
            )

        if not horarios_disponiveis:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "⚠️ Não há horários disponíveis no momento. Nossa equipe entrará em contato para agendar.",
                    "horarios_disponiveis": [],
                    "action": "contact_later"
                }
            )

        # 🔧 SALVAR HORÁRIOS NO CACHE PARA ETAPA 2
        salvar_horarios_cache(data, horarios_disponiveis[:3])

        # 💾 ETAPA 1: APENAS CONSULTA - NÃO CRIAR PRÉ-AGENDAMENTO
        logger.info("💾 ETAPA 1: Horários consultados e salvos no cache (sem criar pré-agendamento)")

        # Salvar dados do técnico no cache para ETAPA 2
        cache_key_tecnico = f"tecnico_{telefone}_{endereco.replace(' ', '_').replace(',', '')}"

        # Usar o cache existente (salvar_horarios_cache já salva os dados necessários)
        # Apenas adicionar os dados do técnico ao cache existente
        try:
            cache_data = {
                "tecnico_info": tecnico_info,
                "tecnico_nome": tecnico,
                "dados_cliente": {
                    "nome": nome,
                    "telefone": telefone,
                    "endereco": endereco,
                    "cpf": cpf,
                    "email": email,
                    "equipamentos": lista_equipamentos,
                    "problemas": problemas,
                    "urgente": urgente
                }
            }
            # Salvar no cache usando a mesma estrutura do salvar_horarios_cache
            logger.info(f"💾 Dados do técnico preparados para ETAPA 2")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao preparar cache do técnico: {e}")

        # Formatar resposta para o cliente - FORMATO COMPATÍVEL COM CLIENTECHAT
        mensagem = f"✅ *Horários disponíveis para {primeiro_equipamento}:*\n\n"

        # Lista simples de opções para o ClienteChat
        opcoes_simples = []

        for i, horario in enumerate(horarios_disponiveis[:3], 1):
            # Extrair informações do horário
            dia_semana = horario.get('dia_semana', '')
            hora_agendamento = horario.get('hora_agendamento', '')
            datetime_agendamento = horario.get('datetime_agendamento', '')

            # Formato compatível com ClienteChat
            if datetime_agendamento:
                # Extrair data no formato DD/MM/YYYY
                try:
                    dt = datetime.fromisoformat(datetime_agendamento.replace('Z', '+00:00'))
                    data_formatada = dt.strftime('%d/%m/%Y')
                    hora_formatada = dt.strftime('%H:%M')
                except:
                    data_formatada = dia_semana.split(', ')[-1] if ', ' in dia_semana else 'Data não disponível'
                    hora_formatada = hora_agendamento or '09:00'
            else:
                data_formatada = dia_semana.split(', ')[-1] if ', ' in dia_semana else 'Data não disponível'
                hora_formatada = hora_agendamento or '09:00'

            # Criar janela de tempo (ex: "Previsão de chegada entre 9 e 10hs")
            if hora_formatada and ':' in hora_formatada:
                try:
                    hora_inicio = int(hora_formatada.split(':')[0])
                    hora_fim = hora_inicio + 1
                    janela_tempo = f"Previsão de chegada entre {hora_inicio} e {hora_fim}hs"
                except:
                    janela_tempo = f"Previsão de chegada às {hora_formatada}"
            else:
                janela_tempo = "Horário a definir"

            # Adicionar à mensagem principal com mais informações
            # Determinar período do dia
            if hora_formatada and ':' in hora_formatada:
                try:
                    hora_num = int(hora_formatada.split(':')[0])
                    if 9 <= hora_num <= 11:
                        periodo = "🌅 Manhã"
                    elif 13 <= hora_num <= 17:
                        periodo = "🌞 Tarde"
                    else:
                        periodo = "⏰"
                except:
                    periodo = "⏰"
            else:
                periodo = "⏰"

            # Extrair dia da semana
            dia_semana_curto = dia_semana.split(',')[0] if ',' in dia_semana else dia_semana

            mensagem += f"*{i}.* {periodo} {dia_semana_curto}, {data_formatada}\n"
            mensagem += f"    📍 {janela_tempo}\n"

            # Adicionar à lista de opções simples
            opcoes_simples.append({
                "numero": i,
                "data": data_formatada,
                "horario": hora_formatada,
                "datetime_completo": datetime_agendamento
            })

        mensagem += "\n💬 *Como escolher seu horário:*\n"
        mensagem += "🔢 Digite *1*, *2* ou *3* para confirmar\n"
        mensagem += "🕐 Ou digite o horário (ex: *10h*, *15h*)\n"
        mensagem += "📅 Ou digite o período (*manhã*, *tarde*)\n"
        mensagem += "\n✨ *Responda com sua opção preferida!*"

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "horarios_disponiveis": horarios_disponiveis[:3],
                "opcoes_simples": opcoes_simples,  # Formato simples para ClienteChat
                "tecnico": tecnico,
                "urgente": urgente,
                "action": "select_time",
                "dados_cliente": {
                    "nome": nome,
                    "endereco": endereco,
                    "telefone": telefone,
                    "cpf": data.get("cpf", ""),
                    "email": data.get("email", "")
                },
                "equipamentos": equipamentos,
                "problemas": problemas
            }
        )

    except Exception as e:
        logger.error(f"Erro ao criar agendamento inteligente: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar agendamento: {str(e)}"}
        )

async def processar_etapa_2_confirmacao(opcao_escolhida: str, telefone_contato: str):
    """
    Função auxiliar para processar ETAPA 2 - Confirmação de agendamento
    Extrai a lógica do endpoint /agendamento-inteligente-confirmacao
    """
    try:
        logger.info(f"🚀 ETAPA 2: Confirmação recebida - opcao_escolhida='{opcao_escolhida}', telefone='{telefone_contato}'")

        # 🧠 USAR SISTEMA DE INTERPRETAÇÃO INTELIGENTE E FLEXÍVEL
        opcao_normalizada = interpretar_opcao_flexivel(opcao_escolhida)

        if opcao_normalizada:
            logger.info(f"✅ ETAPA 2: Opção interpretada: '{opcao_escolhida}' → '{opcao_normalizada}'")

        if not opcao_normalizada:
            logger.error(f"❌ ETAPA 2: Opção inválida recebida: '{opcao_escolhida}'")
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "message": f"❌ *Opção não reconhecida:* '{opcao_escolhida}'\n\n"
                              f"📝 *Por favor, responda com:*\n"
                              f"• *1*, *2* ou *3* (número da opção)\n"
                              f"• *9h*, *14h*, *16h* (horário desejado)\n"
                              f"• *manhã* ou *tarde* (período)\n\n"
                              f"💡 *Exemplo:* Digite *1* ou *9h* para o primeiro horário",
                    "action": "retry_selection"
                }
            )

        logger.info(f"✅ ETAPA 2: Opção normalizada: '{opcao_escolhida}' → '{opcao_normalizada}'")

        if not telefone_contato:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Telefone não informado."}
            )

        # Buscar dados do cache (horários e técnico) em vez de pré-agendamento
        logger.info(f"🔍 ETAPA 2: Buscando dados do cache por telefone {telefone_contato}")

        # Buscar pré-agendamento para obter dados completos
        supabase = get_supabase_client()
        dez_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=10)  # ✅ AUMENTAR JANELA

        logger.info(f"🔍 ETAPA 2: Buscando pré-agendamento desde {dez_minutos_atras.isoformat()}")

        # Buscar sem filtro de status primeiro para debug
        response_debug = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone_contato
        ).gte("created_at", dez_minutos_atras.isoformat()).order("created_at", desc=True).execute()

        logger.info(f"🔍 ETAPA 2: Total de agendamentos encontrados (qualquer status): {len(response_debug.data) if response_debug.data else 0}")

        if response_debug.data:
            for agend in response_debug.data:
                logger.info(f"🔍 ETAPA 2: Agendamento ID={agend.get('id', 'N/A')[:8]}, Status={agend.get('status', 'N/A')}, Criado={agend.get('created_at', 'N/A')}")

        # Agora buscar com status pendente
        response_busca = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone_contato
        ).eq("status", "pendente").gte("created_at", dez_minutos_atras.isoformat()).order("created_at", desc=True).limit(1).execute()

        if not response_busca.data:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "❌ Dados de agendamento não encontrados. Por favor, inicie o processo novamente."
                }
            )

        pre_agendamento = response_busca.data[0]

        # Criar dados para buscar no cache usando a mesma estrutura da ETAPA 1
        dados_busca = {
            "nome": pre_agendamento.get("nome", ""),
            "endereco": pre_agendamento.get("endereco", ""),
            "equipamento": pre_agendamento.get("equipamento", "")
        }
        horarios_oferecidos = recuperar_horarios_cache(dados_busca)

        if not horarios_oferecidos:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "❌ Dados de agendamento não encontrados. Por favor, inicie o processo novamente."
                }
            )

        logger.info(f"✅ ETAPA 2: Horários encontrados no cache: {len(horarios_oferecidos)} opções")

        # Verificar se horarios_oferecidos é string (JSON) e converter
        if isinstance(horarios_oferecidos, str):
            import json
            try:
                horarios_oferecidos = json.loads(horarios_oferecidos)
            except:
                logger.error(f"❌ Erro ao parsear horarios_oferecidos: {horarios_oferecidos}")
                horarios_oferecidos = []

        logger.info(f"🔍 ETAPA 2: Horários oferecidos: {horarios_oferecidos}")

        # Validar opção escolhida
        opcao_index = int(opcao_normalizada) - 1
        if opcao_index < 0 or opcao_index >= len(horarios_oferecidos):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Opção de horário inválida."}
            )

        horario_selecionado = horarios_oferecidos[opcao_index]
        logger.info(f"🔍 ETAPA 2: Horário selecionado: {horario_selecionado}")

        # Verificar se é dict ou string
        if isinstance(horario_selecionado, dict):
            horario_escolhido = horario_selecionado.get('datetime_agendamento')
        else:
            horario_escolhido = horario_selecionado

        if not horario_escolhido:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Horário inválido selecionado."}
            )

        # ETAPA 2: Criar agendamento final e OS
        logger.info(f"🚀 ETAPA 2: Criando agendamento final para horário: {horario_escolhido}")

        # ✅ CORREÇÃO: Passar dados do pré-agendamento diretamente
        data_confirmacao = {
            "telefone": telefone_contato,
            "pre_agendamento": pre_agendamento,  # Passar dados do pré-agendamento
            "horarios_oferecidos": horarios_oferecidos  # Passar horários do cache
        }
        resultado = await confirmar_agendamento_final(data_confirmacao, horario_escolhido)

        return resultado

    except Exception as e:
        logger.error(f"❌ Erro na ETAPA 2: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar confirmação: {str(e)}"}
        )

# Função para confirmar agendamento final (ETAPA 2)
async def confirmar_agendamento_final(data: dict, horario_escolhido: str):
    """
    NOVA ESTRATÉGIA: Busca pré-agendamento existente (com placeholders) e atualiza com dados reais
    """
    try:
        logger.info(f"🚀 ETAPA 2: Iniciando confirmar_agendamento_final com horario_escolhido='{horario_escolhido}'")

        # Extrair telefone dos dados recebidos
        telefone_contato = data.get("telefone_contato", data.get("telefone", ""))
        logger.info(f"📞 ETAPA 2: Telefone extraído: '{telefone_contato}'")

        supabase = get_supabase_client()
        logger.info(f"✅ ETAPA 2: Supabase client criado com sucesso")

        # 🔍 USAR DADOS PASSADOS DIRETAMENTE EM VEZ DE BUSCAR NO CACHE
        logger.info(f"🔍 ETAPA 2: Usando dados passados diretamente")

        # Verificar se os dados foram passados
        pre_agendamento = data.get("pre_agendamento")
        horarios_oferecidos = data.get("horarios_oferecidos")

        if not pre_agendamento or not horarios_oferecidos:
            logger.error(f"❌ ETAPA 2: Dados não foram passados corretamente")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Dados de agendamento não encontrados. Inicie o processo novamente."}
            )

        horarios_cache = horarios_oferecidos

        logger.info(f"✅ ETAPA 2: Dados encontrados no cache: {len(horarios_cache)} horários")

        # 🔧 EXTRAIR DADOS DO CACHE (ETAPA 2)
        # Os dados foram salvos na ETAPA 1 e agora precisamos recuperá-los

        # 🔧 USAR DADOS REAIS DA REQUISIÇÃO (ETAPA 2)
        # Recuperar dados do pré-agendamento que contém os dados originais
        nome = pre_agendamento.get('nome', 'Cliente')
        endereco = pre_agendamento.get('endereco', '')
        telefone = telefone_contato  # Usar o telefone recebido
        cpf = pre_agendamento.get('cpf', '')
        email = pre_agendamento.get('email', '')
        urgente = pre_agendamento.get('urgente', True)

        logger.info(f"🔧 ETAPA 2: Usando dados do exemplo real:")
        logger.info(f"🔧   nome: '{nome}'")
        logger.info(f"🔧   endereco: '{endereco}'")
        logger.info(f"🔧   telefone: '{telefone}'")
        logger.info(f"🔧   cpf: '{cpf}'")
        logger.info(f"🔧   email: '{email}'")
        logger.info(f"🔧   urgente: {urgente}")

        # 🔧 CONSOLIDAR EQUIPAMENTOS E PROBLEMAS (DADOS REAIS)
        # ✅ USAR CAMPOS INDIVIDUAIS PRIMEIRO (mais confiáveis)
        equipamento_principal = pre_agendamento.get('equipamento', '')
        problema_principal = pre_agendamento.get('problema', '')
        tipo_atendimento_principal = pre_agendamento.get('tipo_atendimento_1', 'em_domicilio')

        # ✅ RECUPERAR ARRAYS (se existirem)
        equipamentos_data = pre_agendamento.get('equipamentos', [])
        problemas_data = pre_agendamento.get('problemas', [])
        tipos_atendimento_data = pre_agendamento.get('tipos_atendimento', [])

        # ✅ CONSOLIDAR DADOS (priorizar campos individuais)
        if equipamento_principal:
            equipamentos = [equipamento_principal]
        elif equipamentos_data:
            if equipamentos_data and isinstance(equipamentos_data[0], str):
                equipamentos = equipamentos_data
            else:
                equipamentos = [eq.get('equipamento', 'Equipamento') for eq in equipamentos_data]
        else:
            equipamentos = ['Equipamento']

        if problema_principal:
            problemas = [problema_principal]  # ✅ USAR PROBLEMA INDIVIDUAL
        elif problemas_data:
            problemas = problemas_data
        else:
            problemas = ['Problema não especificado']

        if tipo_atendimento_principal:
            tipos_atendimento = [tipo_atendimento_principal]  # ✅ USAR TIPO INDIVIDUAL
        elif tipos_atendimento_data:
            tipos_atendimento = tipos_atendimento_data
        else:
            tipos_atendimento = ['em_domicilio']

        logger.info(f"🔧 ETAPA 2: {len(equipamentos)} equipamentos encontrados: {equipamentos}")
        logger.info(f"🔧 ETAPA 2: Problemas: {problemas}")
        logger.info(f"🔧 ETAPA 2: Tipos atendimento: {tipos_atendimento}")

        # 🔄 ETAPA 2: PULAR ATUALIZAÇÃO DE PRÉ-AGENDAMENTO (NÃO EXISTE MAIS)
        logger.info(f"🔄 ETAPA 2: Dados consolidados, prosseguindo para criação da OS...")

        # Validar dados obrigatórios
        if not nome or not endereco or not telefone or not equipamentos or not horario_escolhido:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Dados obrigatórios faltando"}
            )

        # Determinar técnico baseado nos equipamentos (usando sistema inteligente)
        lista_equipamentos = equipamentos  # Já é uma lista de strings

        # Geocodificar endereço para determinar grupo logístico
        coordenadas = await geocodificar_endereco(endereco)
        grupo_logistico = determine_logistics_group(endereco, coordenadas)

        # Selecionar técnico otimizado
        tecnico_info = await determinar_tecnico_otimizado(lista_equipamentos, grupo_logistico, urgente)

        # 🔧 PROCESSAR HORÁRIO ESCOLHIDO
        # Verificar se é um número (1, 2, 3) ou horário ISO
        if horario_escolhido.strip().isdigit():
            # É uma escolha numérica - gerar horários para processar
            logger.info(f"🎯 Processando escolha numérica: {horario_escolhido}")

            # 🕐 ETAPA 2: Usar horários salvos da ETAPA 1 para garantir consistência total
            logger.info(f"🎯 ETAPA 2: Recuperando horários salvos da ETAPA 1 para escolha {horario_escolhido}")

            # 1. USAR HORÁRIOS DO CACHE DA ETAPA 1
            horarios_disponiveis = horarios_cache
            logger.info(f"✅ ETAPA 2: Usando horários do cache da ETAPA 1: {len(horarios_disponiveis)}")

            # Verificar se os horários estão válidos
            if not horarios_disponiveis or len(horarios_disponiveis) == 0:
                logger.warning("⚠️ ETAPA 2: Horários do cache estão vazios")
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Horários não encontrados. Inicie o processo novamente."}
                )

            if not horarios_disponiveis:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Não há horários disponíveis no momento"}
                )

            # Debug: mostrar horários disponíveis com detalhes
            logger.info(f"🔍 ETAPA 2: Horários disponíveis: {len(horarios_disponiveis)}")
            for i, h in enumerate(horarios_disponiveis[:3], 1):
                escolhido = "👈 ESCOLHIDO" if str(i) == str(horario_escolhido) else ""
                logger.info(f"   {i}. {h.get('texto', 'N/A')} -> {h.get('datetime_agendamento', 'N/A')} {escolhido}")

            # Processar escolha
            logger.info(f"🔍 Chamando processar_escolha_horario com: escolha='{horario_escolhido}', horarios={len(horarios_disponiveis)}")
            horario_selecionado = processar_escolha_horario(horario_escolhido, horarios_disponiveis[:3])
            logger.info(f"🎯 Horário selecionado retornado: {horario_selecionado}")

            # Debug detalhado se retornou None
            if not horario_selecionado:
                logger.error(f"🚨 ERRO CRÍTICO: processar_escolha_horario retornou None!")
                logger.error(f"   📝 Entrada: horario_escolhido='{horario_escolhido}'")
                logger.error(f"   📝 Horários disponíveis: {horarios_disponiveis[:3]}")
                for i, h in enumerate(horarios_disponiveis[:3], 1):
                    logger.error(f"      {i}: {h}")
                logger.error(f"   📝 Tipo da escolha: {type(horario_escolhido)}")
                logger.error(f"   📝 É dígito? {horario_escolhido.strip().isdigit()}")
                if horario_escolhido.strip().isdigit():
                    opcao = int(horario_escolhido.strip())
                    logger.error(f"   📝 Opção convertida: {opcao}")
                    logger.error(f"   📝 Range válido: 1-{len(horarios_disponiveis[:3])}")
                    logger.error(f"   📝 Está no range? {1 <= opcao <= len(horarios_disponiveis[:3])}")
                    if 1 <= opcao <= len(horarios_disponiveis[:3]):
                        logger.error(f"   📝 Horário que deveria ser selecionado: {horarios_disponiveis[opcao - 1]}")
            else:
                logger.info(f"✅ Horário selecionado com sucesso: {horario_selecionado}")

            if not horario_selecionado:
                logger.error(f"❌ Falha ao processar escolha {horario_escolhido} com {len(horarios_disponiveis)} horários")
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Opção de horário inválida. Por favor, escolha 1, 2 ou 3."}
                )

            horario_iso = horario_selecionado.get('datetime_agendamento')
            logger.info(f"🎯 Horário ISO extraído: {horario_iso}")

            if not horario_iso:
                logger.error(f"❌ Horário selecionado não tem datetime_agendamento: {horario_selecionado}")
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Erro ao processar horário selecionado"}
                )
        else:
            # É um horário ISO direto
            logger.info(f"🎯 Processando horário ISO direto: {horario_escolhido}")
            horario_iso = horario_escolhido

        # Converter para datetime
        try:
            horario_dt = datetime.fromisoformat(horario_iso)
            data_agendada = horario_dt.strftime('%Y-%m-%d')
            hora_agendada = horario_dt.strftime('%H:%M')
            logger.info(f"✅ Horário processado: {data_agendada} às {hora_agendada}")
        except Exception as e:
            logger.error(f"❌ Erro ao processar horário: {e}")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Formato de horário inválido"}
            )

        # Verificar se horário ainda está disponível
        if not await verificar_horario_ainda_disponivel(horario_iso, tecnico_info["nome"]):
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "message": "⚠️ Horário não está mais disponível. Por favor, escolha outro horário.",
                    "action": "reselect_time"
                }
            )

        # ❌ ETAPA 2: NÃO CRIAR PRÉ-AGENDAMENTO - APENAS CRIAR OS DIRETAMENTE
        logger.info(f"🚫 ETAPA 2: Pulando criação de pré-agendamento - criando apenas OS")

        # Simular agendamento_id para compatibilidade
        agendamento_id = "etapa2-direto"

        # 2. Usar lógica do endpoint de confirmação (mais completa)
        logger.info(f"🔧 ETAPA 2: Usando lógica completa do endpoint de confirmação")

        # Determinar tipo de serviço e valor baseado nos equipamentos
        service_type = tipos_atendimento[0] if tipos_atendimento else "em_domicilio"

        # 🎯 OBTER VALOR BASEADO NO TIPO DE ATENDIMENTO
        # Tentar extrair valor do pré-agendamento (se foi salvo na ETAPA 1)
        valor_clientechat = pre_agendamento.get('valor_servico') or pre_agendamento.get('valor_os')
        final_cost = obter_valor_servico(service_type, valor_clientechat)

        logger.info(f"🎯 ETAPA 2: Tipo de atendimento usado: {service_type}")
        logger.info(f"💰 ETAPA 2: Valor calculado: R$ {final_cost:.2f}")

        # Consolidar descrição dos problemas
        descricao_completa = " | ".join(problemas) if problemas else "Não especificado"
        tipos_equipamentos = ", ".join(equipamentos)

        # Dados completos para criação da OS (igual ao endpoint de confirmação)
        dados_reais = {
            "nome": nome,
            "telefone": telefone,
            "endereco": endereco,
            "equipamento": tipos_equipamentos,
            "problema": descricao_completa,
            "cpf": cpf,
            "email": email,
            "tecnico": tecnico_info.get('nome', 'Paulo Cesar Betoni'),
            "urgente": urgente,
            "horario_agendado": horario_escolhido,
            "tipo_atendimento": service_type,
            "valor_os": final_cost
        }

        # Criar OS usando a função completa do endpoint de confirmação
        logger.info("🔄 ETAPA 2: Criando Ordem de Serviço completa...")
        os_criada = await criar_os_completa(dados_reais)

        if os_criada["success"]:
            logger.info(f"✅ ETAPA 2: OS criada com sucesso - {os_criada['os_numero']}")

            # Marcar agendamento como processado (apenas se for UUID válido)
            if agendamento_id != "etapa2-direto":
                try:
                    supabase.table("agendamentos_ai").update({
                        "status": "confirmado",
                        "os_numero": os_criada["os_numero"],
                        "horario_confirmado": horario_escolhido,
                        "dados_finais": dados_reais
                    }).eq("id", agendamento_id).execute()
                    logger.info(f"✅ Agendamento {agendamento_id} marcado como processado")
                except Exception as update_error:
                    logger.warning(f"⚠️ Erro ao marcar agendamento como convertido: {update_error}")
            else:
                logger.info(f"🚫 Pulando atualização de agendamento (ETAPA 2 direta)")

            # 🔧 MENSAGEM ESTRUTURADA PARA CLIENTECHAT COM INFORMAÇÕES DE CONTA
            # Formatação inteligente de equipamentos
            if len(equipamentos) == 1:
                equipamentos_texto = equipamentos[0]
            elif len(equipamentos) == 2:
                equipamentos_texto = f"{equipamentos[0]} e {equipamentos[1]}"
            else:
                equipamentos_texto = f"{', '.join(equipamentos[:-1])} e {equipamentos[-1]}"

            # Mensagem estruturada para ClienteChat usar
            mensagem = f"""AGENDAMENTO_CONFIRMADO|OS:{os_criada['os_numero']}|CLIENTE:{nome}|HORARIO:{horario_escolhido}|TECNICO:{dados_reais['tecnico']}|VALOR:R$ {dados_reais['valor_os']:.2f}|EQUIPAMENTOS:{equipamentos_texto}|QTD_EQUIPAMENTOS:{len(equipamentos)}"""

            # Adicionar informações de conta criada
            if os_criada.get('conta_criada'):
                dados_acesso = os_criada.get('dados_acesso')
                if dados_acesso:
                    mensagem += f"""|CONTA_CRIADA:SIM|EMAIL:{dados_acesso['email']}|SENHA:{dados_acesso['senha']}|PORTAL:app.fixfogoes.com.br"""
                else:
                    mensagem += f"""|CONTA_CRIADA:SIM|PORTAL:app.fixfogoes.com.br"""
            else:
                mensagem += f"""|CONTA_CRIADA:NAO"""

            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": mensagem,
                    "os_numero": os_criada['os_numero'],
                    "os_id": os_criada['os_id'],
                    "client_id": os_criada['cliente_id'],
                    "dados_agendamento": dados_reais
                }
            )
        else:
            logger.error(f"❌ ETAPA 2: Erro ao criar OS: {os_criada.get('message')}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Erro ao criar OS: {os_criada.get('message')}"}
            )

    except Exception as e:
        # Tratar encoding de caracteres especiais
        error_msg = str(e).encode('utf-8', errors='replace').decode('utf-8')
        logger.error(f"Erro ao confirmar agendamento: {error_msg}")
        logger.error(f"Tipo do erro: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao confirmar agendamento: {error_msg}"}
        )

# 🧠 FUNÇÃO DE INTERPRETAÇÃO INTELIGENTE E FLEXÍVEL
def interpretar_opcao_flexivel(opcao_escolhida: str) -> Optional[str]:
    """
    Interpreta qualquer resposta do usuário de forma inteligente e flexível
    Retorna: "1", "2", "3" ou None
    """
    if not opcao_escolhida:
        logger.debug("🔍 interpretar_opcao_flexivel: opcao_escolhida está vazia")
        return None

    opcao_lower = opcao_escolhida.lower().strip()
    logger.debug(f"🔍 interpretar_opcao_flexivel: '{opcao_escolhida}' → '{opcao_lower}'")

    # 1. NÚMEROS DIRETOS (mais comum)
    if opcao_lower in ["1", "2", "3"]:
        return opcao_lower

    # 2. EXTRAIR NÚMEROS DA RESPOSTA
    import re
    numeros = re.findall(r'\b[123]\b', opcao_lower)
    if numeros:
        return numeros[0]

    # 3. PALAVRAS NUMÉRICAS
    if any(palavra in opcao_lower for palavra in ["primeira", "primeiro", "um", "uma"]):
        return "1"
    if any(palavra in opcao_lower for palavra in ["segunda", "segundo", "dois", "duas"]):
        return "2"
    if any(palavra in opcao_lower for palavra in ["terceira", "terceiro", "três", "tres"]):
        return "3"

    # 4. HORÁRIOS ESPECÍFICOS BASEADOS NAS OPÇÕES REAIS
    # Opção 1: 9h-10h
    if any(h in opcao_lower for h in ["9h", "09h", "nove"]):
        return "1"
    # Opção 2: 10h-11h
    if any(h in opcao_lower for h in ["10h", "10:00", "dez"]):
        return "2"
    # Opção 3: 14h-15h
    if any(h in opcao_lower for h in ["14h", "14:00", "2h", "duas"]):
        return "3"

    # 5. PERÍODOS DO DIA
    if any(periodo in opcao_lower for periodo in ["manhã", "manha", "matinal", "cedo"]):
        return "1"
    if any(periodo in opcao_lower for periodo in ["tarde", "vespertino"]):
        return "2"
    if any(periodo in opcao_lower for periodo in ["final", "fim", "noite"]):
        return "3"

    # 6. DIAS DA SEMANA
    if any(dia in opcao_lower for dia in ["quinta", "qui"]):
        return "1"
    if any(dia in opcao_lower for dia in ["sexta", "sex"]):
        return "2"
    if any(dia in opcao_lower for dia in ["segunda", "seg", "próxima"]):
        return "3"

    # 7. URGÊNCIA E PREFERÊNCIAS
    urgencias = ["urgente", "rapido", "rápido", "assim que possível", "possivel", "logo", "agora", "assim que possivel"]
    logger.debug(f"🔍 interpretar_opcao_flexivel: Testando urgências: {urgencias}")
    for urgencia in urgencias:
        if urgencia in opcao_lower:
            logger.debug(f"✅ interpretar_opcao_flexivel: Encontrou urgência '{urgencia}' em '{opcao_lower}'")
            return "1"  # Primeira opção disponível

    # 8. CONFIRMAÇÕES GENÉRICAS
    if any(conf in opcao_lower for conf in ["sim", "ok", "confirma", "aceito", "pode ser", "tudo bem"]):
        return "1"  # Primeira opção por padrão

    # 9. FALLBACK INTELIGENTE - Se contém qualquer indicação positiva
    if len(opcao_lower) > 0 and not any(neg in opcao_lower for neg in ["não", "nao", "cancel", "desist"]):
        logger.debug(f"✅ interpretar_opcao_flexivel: Fallback inteligente ativado para '{opcao_lower}'")
        return "1"  # Assumir primeira opção para qualquer resposta positiva

    logger.debug(f"❌ interpretar_opcao_flexivel: Nenhuma interpretação encontrada para '{opcao_lower}'")
    return None

# 🔍 FUNÇÕES AUXILIARES PARA CONSULTA DE STATUS OS

async def buscar_ordem_servico(supabase, nome_cliente: str, telefone_cliente: str, numero_os: str, endereco: str) -> Optional[Dict]:
    """
    Busca ordem de serviço na tabela scheduled_services usando múltiplos critérios
    """
    try:
        logger.info(f"🔍 Buscando OS em scheduled_services: nome='{nome_cliente}', telefone='{telefone_cliente}', numero='{numero_os}'")

        # Estratégia 1: Buscar por número da OS (mais preciso)
        if numero_os:
            # Normalizar número da OS (remover prefixos, espaços, etc.)
            numero_normalizado = numero_os.replace("#", "").replace("OS", "").replace("os", "").strip()

            # Buscar por número exato na tabela scheduled_services
            response = supabase.table("scheduled_services").select("*").eq("order_number", f"#{numero_normalizado.zfill(3)}").execute()

            if response.data:
                logger.info(f"✅ OS encontrada por número: #{numero_normalizado.zfill(3)}")
                return response.data[0]

            # Buscar por número sem formatação
            response = supabase.table("scheduled_services").select("*").ilike("order_number", f"%{numero_normalizado}%").execute()

            if response.data:
                logger.info(f"✅ OS encontrada por número similar: {numero_normalizado}")
                return response.data[0]

        # Estratégia 2: Buscar por nome do cliente diretamente na scheduled_services
        if nome_cliente:
            # Buscar por nome exato
            response = supabase.table("scheduled_services").select("*").eq("client_name", nome_cliente).order("created_at", desc=True).limit(1).execute()

            if response.data:
                logger.info(f"✅ OS encontrada por nome exato: {nome_cliente}")
                return response.data[0]

            # Buscar por nome similar
            response = supabase.table("scheduled_services").select("*").ilike("client_name", f"%{nome_cliente}%").order("created_at", desc=True).limit(1).execute()

            if response.data:
                logger.info(f"✅ OS encontrada por nome similar: {nome_cliente}")
                return response.data[0]

        # Estratégia 3: Buscar por telefone via tabela clients
        if telefone_cliente:
            # Primeiro buscar o cliente por telefone
            client_response = supabase.table("clients").select("id, name").eq("phone", telefone_cliente).execute()

            if client_response.data:
                client_name = client_response.data[0]["name"]
                logger.info(f"✅ Cliente encontrado por telefone: {client_name}")

                # Buscar OS do cliente na scheduled_services
                response = supabase.table("scheduled_services").select("*").eq("client_name", client_name).order("created_at", desc=True).limit(1).execute()

                if response.data:
                    logger.info(f"✅ OS encontrada por telefone do cliente: {response.data[0].get('order_number')}")
                    return response.data[0]

        # Estratégia 4: Buscar em agendamentos_ai (pré-agendamentos) como fallback
        if telefone_cliente:
            agend_response = supabase.table("agendamentos_ai").select("*").eq("telefone", telefone_cliente).order("created_at", desc=True).limit(1).execute()

            if agend_response.data:
                logger.info(f"✅ Pré-agendamento encontrado por telefone")
                # Converter dados do pré-agendamento para formato compatível
                agendamento = agend_response.data[0]
                return {
                    "id": agendamento.get("id"),
                    "order_number": "Pré-agendamento",
                    "client_name": agendamento.get("nome"),
                    "scheduled_date": agendamento.get("data_agendada"),
                    "equipment_type": agendamento.get("equipamento", ""),
                    "description": agendamento.get("problema", ""),
                    "status": agendamento.get("status", "pendente"),
                    "current_location": "Aguardando confirmação",
                    "is_pre_agendamento": True
                }

        logger.info(f"❌ Nenhuma OS encontrada com os critérios fornecidos")
        return None

    except Exception as e:
        logger.error(f"❌ Erro ao buscar ordem de serviço: {e}")
        return None

async def processar_status_os(os_data: Dict, supabase) -> Dict:
    """
    Processa dados da OS da tabela scheduled_services e busca histórico em service_order_progress
    """
    try:
        # Verificar se é pré-agendamento
        is_pre_agendamento = os_data.get("is_pre_agendamento", False)

        if is_pre_agendamento:
            return processar_pre_agendamento(os_data)

        # Extrair dados da scheduled_services
        numero_os = os_data.get("order_number", "N/A")
        client_name = os_data.get("client_name", "Cliente")
        scheduled_date = os_data.get("scheduled_date")
        equipment_type = os_data.get("equipment_type", "Não especificado")
        description = os_data.get("description", "")
        status_raw = os_data.get("status", "").lower()
        current_location = os_data.get("current_location", "")

        logger.info(f"🔍 Processando OS: {numero_os} - Status: {status_raw}")

        # Buscar histórico de progresso na service_order_progress
        historico_progresso = await buscar_historico_progresso(supabase, numero_os, os_data.get("id"))

        # Mapear status para descrições em português
        status_map = {
            "scheduled": {"status": "agendado", "descricao": "Agendamento confirmado - técnico será enviado"},
            "in_progress": {"status": "em_andamento", "descricao": "Técnico a caminho ou realizando o atendimento"},
            "at_workshop": {"status": "na_oficina", "descricao": "Equipamento coletado e em análise na oficina"},
            "awaiting_approval": {"status": "aguardando_aprovacao", "descricao": "Orçamento enviado - aguardando sua aprovação"},
            "approved": {"status": "aprovado", "descricao": "Orçamento aprovado - serviço será executado"},
            "completed": {"status": "concluido", "descricao": "Serviço concluído com sucesso"},
            "delivered": {"status": "entregue", "descricao": "Equipamento entregue ao cliente"},
            "paid": {"status": "pago", "descricao": "Pagamento realizado - serviço finalizado"},
            "cancelled": {"status": "cancelado", "descricao": "Atendimento cancelado"}
        }

        status_info = status_map.get(status_raw, {"status": status_raw, "descricao": "Status em atualização"})

        # Calcular previsão baseada no status e data agendada
        previsao = calcular_previsao_status(status_raw, scheduled_date)

        # Processar histórico para informações adicionais
        diagnostico_info = processar_historico_diagnostico(historico_progresso)

        return {
            "numero_os": numero_os,
            "client_name": client_name,
            "scheduled_date": scheduled_date,
            "equipment_type": equipment_type,
            "description": description,
            "status": status_info["status"],
            "status_descricao": status_info["descricao"],
            "current_location": current_location,
            "previsao": previsao,
            "historico_progresso": historico_progresso,
            "diagnostico_realizado": diagnostico_info["diagnostico_realizado"],
            "observacoes_diagnostico": diagnostico_info["observacoes"],
            "valor_orcamento": diagnostico_info["valor_orcamento"]
        }

    except Exception as e:
        logger.error(f"❌ Erro ao processar status OS: {e}")
        return {
            "numero_os": "N/A",
            "status": "erro",
            "status_descricao": "Erro ao processar informações",
            "equipment_type": "N/A",
            "previsao": "Consulte nossa equipe",
            "current_location": "N/A",
            "historico_progresso": [],
            "diagnostico_realizado": False,
            "observacoes_diagnostico": None,
            "valor_orcamento": None
        }

def processar_pre_agendamento(agendamento_data: Dict) -> Dict:
    """
    Processa dados de pré-agendamento
    """
    try:
        status_raw = agendamento_data.get("status", "pendente").lower()

        # Mapear status de pré-agendamento
        if status_raw == "pendente":
            status_descricao = "Agendamento recebido - nossa equipe entrará em contato para confirmar"
            previsao = "Confirmação em até 2 horas úteis"
        elif status_raw == "confirmado":
            status_descricao = "Agendamento confirmado - técnico será enviado no horário marcado"
            previsao = "Conforme horário agendado"
        else:
            status_descricao = "Agendamento em processamento"
            previsao = "Aguarde contato da nossa equipe"

        return {
            "numero_os": "Pré-agendamento",
            "status": status_raw,
            "status_descricao": status_descricao,
            "equipamento": agendamento_data.get("equipamento", "Não especificado"),
            "previsao": previsao,
            "valor_orcamento": agendamento_data.get("valor_os"),
            "observacoes": agendamento_data.get("problema")
        }

    except Exception as e:
        logger.error(f"❌ Erro ao processar pré-agendamento: {e}")
        return {
            "numero_os": "Pré-agendamento",
            "status": "erro",
            "status_descricao": "Erro ao processar informações",
            "equipamento": "N/A",
            "previsao": "Consulte nossa equipe",
            "valor_orcamento": None,
            "observacoes": None
        }

def calcular_previsao_status(status: str, scheduled_date: str = None) -> str:
    """
    Calcula previsão baseada no status atual
    """
    try:
        if status == "scheduled":
            if scheduled_date:
                try:
                    dt = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
                    data_formatada = dt.strftime('%d/%m/%Y às %H:%M')
                    return f"Técnico será enviado em {data_formatada}"
                except:
                    return "Técnico será enviado conforme agendamento"
            return "Técnico será enviado em breve"

        elif status == "in_progress":
            return "Técnico a caminho ou realizando atendimento"

        elif status == "at_workshop":
            return "Diagnóstico será concluído em até 7 dias úteis"

        elif status == "awaiting_approval":
            return "Aguardando sua resposta sobre o orçamento"

        elif status == "approved":
            return "Serviço será executado em até 7 dias úteis"

        elif status == "completed":
            return "Equipamento pronto para retirada"

        elif status == "delivered":
            return "Serviço finalizado com sucesso"

        elif status == "paid":
            return "Atendimento concluído"

        else:
            return "Consulte nossa equipe para mais detalhes"

    except Exception as e:
        logger.error(f"❌ Erro ao calcular previsão: {e}")
        return "Consulte nossa equipe"

def formatar_mensagem_status(status_info: Dict) -> str:
    """
    Formata mensagem estruturada para o ClienteChat com dados das tabelas scheduled_services e service_order_progress
    """
    try:
        numero_os = status_info.get("numero_os", "N/A")
        client_name = status_info.get("client_name", "")
        scheduled_date = status_info.get("scheduled_date", "")
        equipment_type = status_info.get("equipment_type", "")
        description = status_info.get("description", "")
        status_desc = status_info.get("status_descricao", "")
        current_location = status_info.get("current_location", "")
        previsao = status_info.get("previsao", "")
        diagnostico_realizado = status_info.get("diagnostico_realizado", False)
        observacoes_diagnostico = status_info.get("observacoes_diagnostico")
        valor_orcamento = status_info.get("valor_orcamento")
        historico_progresso = status_info.get("historico_progresso", [])

        # Construir mensagem
        if numero_os == "Pré-agendamento":
            mensagem = f"📋 *Pré-agendamento encontrado*\n\n"
        else:
            mensagem = f"📋 *Ordem de Serviço {numero_os}*\n\n"

        # Informações básicas
        mensagem += f"👤 *Cliente:* {client_name}\n"
        mensagem += f"📊 *Status:* {status_desc}\n"

        if equipment_type and equipment_type != "N/A":
            mensagem += f"🔧 *Equipamento:* {equipment_type}\n"

        if description:
            mensagem += f"📝 *Descrição:* {description}\n"

        if current_location:
            mensagem += f"📍 *Localização atual:* {current_location}\n"

        # Data agendada formatada
        if scheduled_date:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
                data_formatada = dt.strftime('%d/%m/%Y às %H:%M')
                mensagem += f"📅 *Data agendada:* {data_formatada}\n"
            except:
                mensagem += f"📅 *Data agendada:* {scheduled_date}\n"

        if previsao:
            mensagem += f"⏰ *Previsão:* {previsao}\n"

        # Informações de diagnóstico
        if diagnostico_realizado:
            mensagem += f"🔍 *Diagnóstico:* ✅ Realizado\n"
            if observacoes_diagnostico:
                mensagem += f"📋 *Observações:* {observacoes_diagnostico}\n"
        else:
            mensagem += f"🔍 *Diagnóstico:* ⏳ Pendente\n"

        if valor_orcamento:
            mensagem += f"💰 *Valor orçamento:* R$ {valor_orcamento:.2f}\n"

        # Histórico resumido (últimas 2 entradas)
        if historico_progresso and len(historico_progresso) > 0:
            mensagem += f"\n📈 *Últimas atualizações:*\n"
            for entrada in historico_progresso[-2:]:  # Últimas 2 entradas
                data_entrada = entrada.get("data", "")
                if data_entrada:
                    try:
                        dt = datetime.fromisoformat(data_entrada.replace('Z', '+00:00'))
                        data_formatada = dt.strftime('%d/%m %H:%M')
                    except:
                        data_formatada = data_entrada[:10]  # Apenas data
                else:
                    data_formatada = "Data N/A"

                status_entrada = entrada.get("status", "")
                descricao_entrada = entrada.get("descricao", "")

                mensagem += f"• {data_formatada}: {status_entrada}"
                if descricao_entrada:
                    mensagem += f" - {descricao_entrada}"
                mensagem += f"\n"

        mensagem += f"\n💬 *Dúvidas?* Entre em contato: (48) 98833-2664"

        return mensagem

    except Exception as e:
        logger.error(f"❌ Erro ao formatar mensagem: {e}")
        return "❌ Erro ao formatar informações. Entre em contato: (48) 98833-2664"

async def buscar_historico_progresso(supabase, numero_os: str, scheduled_service_id: str = None) -> List[Dict]:
    """
    Busca histórico específico da OS na tabela service_order_progress
    """
    try:
        logger.info(f"🔍 Buscando histórico para OS: {numero_os} (ID: {scheduled_service_id})")

        historico = []

        # Estratégia 1: Buscar por service_order_id se temos o ID da scheduled_service
        if scheduled_service_id:
            response = supabase.table("service_order_progress").select("*").eq(
                "service_order_id", scheduled_service_id
            ).order("created_at", desc=False).execute()

            if response.data:
                logger.info(f"✅ Encontrado histórico por service_order_id: {len(response.data)} registros")
                historico = response.data

        # Estratégia 2: Se não encontrou, buscar por referência ao número da OS
        if not historico and numero_os and numero_os != "N/A":
            # Buscar na tabela scheduled_services primeiro para pegar o ID
            ss_response = supabase.table("scheduled_services").select("id").eq("order_number", numero_os).execute()

            if ss_response.data:
                service_id = ss_response.data[0]["id"]
                response = supabase.table("service_order_progress").select("*").eq(
                    "service_order_id", service_id
                ).order("created_at", desc=False).execute()

                if response.data:
                    logger.info(f"✅ Encontrado histórico por número OS: {len(response.data)} registros")
                    historico = response.data

        # Processar e formatar histórico
        historico_formatado = []
        for item in historico:
            historico_formatado.append({
                "data": item.get("created_at"),
                "status": item.get("status"),
                "descricao": item.get("description", ""),
                "observacoes": item.get("notes", ""),
                "tecnico": item.get("technician_name", ""),
                "localizacao": item.get("location", "")
            })

        logger.info(f"📋 Histórico processado: {len(historico_formatado)} entradas")
        return historico_formatado

    except Exception as e:
        logger.error(f"❌ Erro ao buscar histórico: {e}")
        return []

def processar_historico_diagnostico(historico: List[Dict]) -> Dict:
    """
    Analisa o histórico para determinar se diagnóstico foi realizado e extrair informações
    """
    try:
        diagnostico_realizado = False
        observacoes_diagnostico = None
        valor_orcamento = None

        # Analisar histórico em busca de diagnóstico
        for entrada in historico:
            status = entrada.get("status", "").lower()
            descricao = entrada.get("descricao", "").lower()
            observacoes = entrada.get("observacoes", "")

            # Verificar se há diagnóstico
            if any(palavra in status for palavra in ["diagnostic", "diagnos", "analise", "avaliacao"]):
                diagnostico_realizado = True
                if observacoes:
                    observacoes_diagnostico = observacoes

            if any(palavra in descricao for palavra in ["diagnostic", "diagnos", "analise", "avaliacao"]):
                diagnostico_realizado = True
                if observacoes:
                    observacoes_diagnostico = observacoes

            # Verificar se há orçamento
            if any(palavra in status for palavra in ["orcamento", "budget", "aprovacao", "valor"]):
                if observacoes and "r$" in observacoes.lower():
                    # Tentar extrair valor do orçamento
                    import re
                    valores = re.findall(r'r\$\s*(\d+(?:,\d{2})?)', observacoes.lower())
                    if valores:
                        try:
                            valor_orcamento = float(valores[0].replace(',', '.'))
                        except:
                            pass

        return {
            "diagnostico_realizado": diagnostico_realizado,
            "observacoes": observacoes_diagnostico,
            "valor_orcamento": valor_orcamento
        }

    except Exception as e:
        logger.error(f"❌ Erro ao processar histórico diagnóstico: {e}")
        return {
            "diagnostico_realizado": False,
            "observacoes": None,
            "valor_orcamento": None
        }

# 🔍 ENDPOINT PARA CONSULTA DE STATUS DA OS - CLIENTECHAT
@app.post("/api/consultar-status-os")
async def consultar_status_os(request: Request):
    """
    🔍 Endpoint para consultar status de ordem de serviço via ClienteChat

    Parâmetros esperados:
    - nome_cliente: Nome do cliente
    - telefone_cliente: Telefone do cliente
    - numero_os: Número da OS (opcional)
    - endereco: Endereço do atendimento (opcional)

    Retorna informações estruturadas para o ClienteChat processar
    """
    try:
        data = await request.json()
        logger.info(f"🔍 CONSULTA STATUS OS - Dados recebidos: {data}")

        # Extrair e filtrar dados
        nome_cliente = filtrar_placeholders(data.get("nome_cliente", "")).strip()
        telefone_cliente = filtrar_placeholders(data.get("telefone_cliente", "")).strip()
        numero_os = filtrar_placeholders(data.get("numero_os", "")).strip()
        endereco = filtrar_placeholders(data.get("endereco", "")).strip()

        logger.info(f"🔍 Dados filtrados: nome='{nome_cliente}', telefone='{telefone_cliente}', os='{numero_os}', endereco='{endereco}'")

        # Validação básica
        if not nome_cliente and not telefone_cliente and not numero_os:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "❌ Para consultar o status, preciso de pelo menos uma informação: nome completo, telefone ou número da OS."
                }
            )

        supabase = get_supabase_client()

        # Buscar ordem de serviço
        os_encontrada = await buscar_ordem_servico(supabase, nome_cliente, telefone_cliente, numero_os, endereco)

        if not os_encontrada:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "os_encontrada": False,
                    "message": "❌ Não encontrei nenhuma ordem de serviço com os dados informados.\n\n" +
                              "📝 Verifique se:\n" +
                              "• O número da OS está correto\n" +
                              "• Nome e telefone estão exatos\n" +
                              "• O atendimento foi realmente agendado\n\n" +
                              "💬 Se precisar de ajuda, entre em contato: (48) 98833-2664"
                }
            )

        # Processar informações da OS com histórico específico
        status_info = await processar_status_os(os_encontrada, supabase)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "os_encontrada": True,
                "numero_os": status_info["numero_os"],
                "client_name": status_info["client_name"],
                "scheduled_date": status_info["scheduled_date"],
                "equipment_type": status_info["equipment_type"],
                "description": status_info["description"],
                "status": status_info["status"],
                "status_descricao": status_info["status_descricao"],
                "current_location": status_info["current_location"],
                "previsao": status_info["previsao"],
                "diagnostico_realizado": status_info["diagnostico_realizado"],
                "observacoes_diagnostico": status_info["observacoes_diagnostico"],
                "valor_orcamento": status_info["valor_orcamento"],
                "historico_progresso": status_info["historico_progresso"],
                "message": formatar_mensagem_status(status_info)
            }
        )

    except Exception as e:
        logger.error(f"❌ Erro ao consultar status OS: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"❌ Erro interno ao consultar status. Tente novamente em alguns instantes."
            }
        )

@app.post("/fix-missing-client-ids")
async def fix_missing_client_ids():
    """
    🔧 Endpoint para corrigir client_id faltantes na tabela scheduled_services
    """
    try:
        logger.info("🚀 Iniciando correção de client_ids faltantes...")

        supabase = get_supabase_client()

        # 1. Buscar registros sem client_id
        logger.info("🔍 Buscando registros sem client_id...")
        response = supabase.table("scheduled_services").select(
            "id, client_id, client_name, service_order_id"
        ).is_("client_id", "null").limit(100).execute()  # Limitar a 100 por execução

        missing_records = response.data
        logger.info(f"📊 Encontrados {len(missing_records)} registros sem client_id")

        if not missing_records:
            return {
                "success": True,
                "message": "✅ Nenhum registro sem client_id encontrado!",
                "processed": 0,
                "fixed": 0,
                "created": 0
            }

        fixed_count = 0
        created_count = 0
        results = []

        for record in missing_records:
            record_id = record["id"]
            client_name = record.get("client_name", "")
            service_order_id = record.get("service_order_id")

            logger.info(f"🔧 Processando: {record_id} - {client_name}")

            client_id = None
            method_used = ""

            # Método 1: Buscar via service_order
            if service_order_id:
                try:
                    so_response = supabase.table("service_orders").select(
                        "client_id"
                    ).eq("id", service_order_id).execute()

                    if so_response.data and len(so_response.data) > 0:
                        client_id = so_response.data[0].get("client_id")
                        if client_id:
                            method_used = "service_order"
                            logger.info(f"  📋 Client_id encontrado via service_order: {client_id}")
                except Exception as e:
                    logger.warning(f"  ⚠️ Erro ao buscar via service_order: {e}")

            # Método 2: Buscar cliente por nome
            if not client_id and client_name and client_name.strip():
                try:
                    client_response = supabase.table("clients").select(
                        "id"
                    ).eq("name", client_name.strip()).execute()

                    if client_response.data and len(client_response.data) > 0:
                        client_id = client_response.data[0]["id"]
                        method_used = "exact_name"
                        logger.info(f"  👤 Client_id encontrado por nome: {client_id}")
                    else:
                        # Buscar similar
                        similar_response = supabase.table("clients").select(
                            "id, name"
                        ).ilike("name", f"%{client_name.strip()}%").execute()

                        if similar_response.data and len(similar_response.data) > 0:
                            client_id = similar_response.data[0]["id"]
                            method_used = "similar_name"
                            logger.info(f"  👤 Client_id encontrado por similaridade: {client_id}")
                except Exception as e:
                    logger.warning(f"  ⚠️ Erro ao buscar cliente: {e}")

            # Método 3: Criar cliente se necessário
            if not client_id and client_name and client_name.strip():
                try:
                    new_client_data = {
                        "name": client_name.strip(),
                        "email": f"{client_name.lower().replace(' ', '.')}@cliente.com",
                        "phone": "",
                        "address": "",
                        "created_at": datetime.now().isoformat()
                    }

                    create_response = supabase.table("clients").insert(new_client_data).execute()

                    if create_response.data and len(create_response.data) > 0:
                        client_id = create_response.data[0]["id"]
                        method_used = "created_new"
                        created_count += 1
                        logger.info(f"  🆕 Novo cliente criado: {client_id}")
                except Exception as e:
                    logger.error(f"  ❌ Erro ao criar cliente: {e}")

            # Atualizar scheduled_service
            if client_id:
                try:
                    update_response = supabase.table("scheduled_services").update({
                        "client_id": client_id
                    }).eq("id", record_id).execute()

                    if update_response.data:
                        logger.info(f"  ✅ Atualizado com client_id: {client_id}")
                        fixed_count += 1
                        results.append({
                            "scheduled_service_id": record_id,
                            "client_name": client_name,
                            "client_id": client_id,
                            "method": method_used,
                            "status": "fixed"
                        })
                    else:
                        logger.error(f"  ❌ Falha ao atualizar")
                        results.append({
                            "scheduled_service_id": record_id,
                            "client_name": client_name,
                            "client_id": None,
                            "method": method_used,
                            "status": "update_failed"
                        })
                except Exception as e:
                    logger.error(f"  ❌ Erro ao atualizar: {e}")
                    results.append({
                        "scheduled_service_id": record_id,
                        "client_name": client_name,
                        "client_id": None,
                        "method": method_used,
                        "status": "error",
                        "error": str(e)
                    })
            else:
                logger.warning(f"  ⚠️ Não foi possível determinar client_id")
                results.append({
                    "scheduled_service_id": record_id,
                    "client_name": client_name,
                    "client_id": None,
                    "method": "none",
                    "status": "no_client_found"
                })

        logger.info("📊 ═══════════════════════════════════════")
        logger.info("📊 RELATÓRIO FINAL DA CORREÇÃO")
        logger.info("📊 ═══════════════════════════════════════")
        logger.info(f"📋 Total processados: {len(missing_records)}")
        logger.info(f"✅ Corrigidos: {fixed_count}")
        logger.info(f"🆕 Novos clientes criados: {created_count}")
        logger.info(f"❌ Não corrigidos: {len(missing_records) - fixed_count}")
        logger.info("📊 ═══════════════════════════════════════")

        return {
            "success": True,
            "message": f"✅ Correção concluída! {fixed_count}/{len(missing_records)} registros corrigidos",
            "processed": len(missing_records),
            "fixed": fixed_count,
            "created": created_count,
            "failed": len(missing_records) - fixed_count,
            "results": results
        }

    except Exception as e:
        logger.error(f"❌ Erro geral na correção: {e}")
        return {
            "success": False,
            "message": f"❌ Erro na correção: {str(e)}",
            "processed": 0,
            "fixed": 0,
            "created": 0
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
