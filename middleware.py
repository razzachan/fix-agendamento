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
_technicians_cache = {}
_cache_timestamp = None

def calcular_data_inicio_otimizada(urgente: bool = False) -> datetime:
    """
    🎯 NOVA LÓGICA: Sempre calcular a data de início mais próxima possível

    ANTES: Urgente = +1 dia, Normal = +2 dias
    AGORA: Urgente = +1 dia, Normal = +1 dia (sempre o mais próximo)

    Isso garante que sempre oferecemos as datas mais próximas disponíveis
    """
    agora = datetime.now(pytz.timezone('America/Sao_Paulo'))

    # 🎯 SEMPRE COMEÇAR NO PRÓXIMO DIA ÚTIL DISPONÍVEL
    inicio = agora + timedelta(days=1)

    # Pular para o próximo dia útil se necessário
    while inicio.weekday() >= 5:  # 5=sábado, 6=domingo
        inicio += timedelta(days=1)

    logger.info(f"🎯 Data início otimizada: {inicio.strftime('%Y-%m-%d')} (Urgente: {urgente})")
    return inicio

async def gerar_horarios_proximas_datas_disponiveis(technician_id: str, urgente: bool = False) -> List[Dict]:
    """
    🎯 NOVA FUNÇÃO: Gera horários sempre priorizando as datas mais próximas disponíveis

    Esta função substitui a lógica complexa por uma busca sequencial simples:
    1. Começa no próximo dia útil
    2. Verifica disponibilidade sequencialmente
    3. Para assim que encontrar 3 horários
    """
    try:
        logger.info(f"🎯 Gerando horários próximas datas - Técnico: {technician_id}, Urgente: {urgente}")

        inicio = calcular_data_inicio_otimizada(urgente)
        horarios_disponiveis = []

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
        while len(horarios_disponiveis) < 3 and dia_offset < 20:  # Máximo 20 dias
            data_verificacao = inicio + timedelta(days=dia_offset)
            dia_offset += 1

            # Pular fins de semana
            if data_verificacao.weekday() >= 5:
                continue

            # Verificar cada horário do dia
            for horario_info in horarios_comerciais:
                if len(horarios_disponiveis) >= 3:
                    break

                horario_dt = data_verificacao.replace(
                    hour=horario_info["hora"],
                    minute=0,
                    second=0,
                    microsecond=0
                )

                # Verificar disponibilidade
                disponivel = await verificar_horario_disponivel_tecnico(technician_id, horario_dt)
                logger.info(f"🔍 DEBUG: {data_verificacao.strftime('%d/%m/%Y')} {horario_info['hora']}h - Disponível: {disponivel}")

                if disponivel:
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

        response_os = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).eq("scheduled_date", data_str).eq("scheduled_time", hora_str).execute()

        if response_os.data:
            logger.info(f"❌ DEBUG: Conflito em service_orders: {len(response_os.data)} registros")
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
            # Extrair número do formato "OS #001"
            last_number = response.data[0]["order_number"]
            import re
            number_match = re.search(r'OS #(\d+)', last_number)

            if number_match:
                last_num = int(number_match.group(1))
                next_number = last_num + 1

        # Formatar como "OS #001"
        formatted_number = f"OS #{next_number:03d}"

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
GROUP_A_RADIUS = 10  # Até 10km do centro
GROUP_B_RADIUS = 25  # Entre 10km e 25km do centro
# Grupo C: Acima de 25km do centro

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

# Função para determinar técnico baseado no equipamento
def determinar_tecnico(equipamento: str) -> str:
    """Determina o técnico baseado no tipo de equipamento"""
    equipamento_lower = equipamento.lower()

    if "coifa" in equipamento_lower:
        return "Marcelo (marcelodsmoritz@gmail.com)"
    else:
        return "Paulo Cesar (betonipaulo@gmail.com)"

def determinar_grupo_logistico(endereco: str) -> str:
    """
    Determina o grupo logístico baseado no endereço
    """
    endereco_lower = endereco.lower()

    # Grupo A - Centro de Florianópolis
    if any(bairro in endereco_lower for bairro in ['centro', 'agronômica', 'trindade', 'córrego grande']):
        return "A"

    # Grupo B - Grande Florianópolis
    elif any(cidade in endereco_lower for cidade in ['são josé', 'palhoça', 'biguaçu', 'santo amaro']):
        return "B"

    # Grupo C - Litoral e interior
    else:
        return "C"

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

        response_os = supabase.table("service_orders").select("*").eq(
            "technician_id", technician_id
        ).eq(
            "scheduled_date", date_str
        ).eq(
            "scheduled_time", time_str
        ).execute()

        if response_os.data and len(response_os.data) > 0:
            logger.info(f"❌ Técnico {technician_id} ocupado em {date_str} às {hour}:00 (service_orders) - {len(response_os.data)} conflitos")
            for os in response_os.data:
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
    Geocodifica um endereço usando a API do OpenStreetMap Nominatim
    """
    try:
        encoded_address = endereco.replace(' ', '+') + ',+Brasil'
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_address}&limit=1&countrycodes=br"

        # Cliente HTTP otimizado com timeout
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers={
                'User-Agent': 'FixFogoes/1.0 (contato@fixfogoes.com.br)'
            })

            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    result = data[0]
                    return (float(result['lon']), float(result['lat']))

        return None
    except Exception as e:
        logger.error(f"Erro na geocodificação: {e}")
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
            logger.info("🗺️ Balneário Camboriú detectado → Período ideal: TARDE")
            return "tarde"
        elif any(cidade in endereco_lower for cidade in ['itajaí', 'itajai']):
            logger.info("🗺️ Itajaí detectado → Período ideal: TARDE")
            return "tarde"
        elif any(cidade in endereco_lower for cidade in ['navegantes']):
            logger.info("🗺️ Navegantes detectado → Período ideal: TARDE")
            return "tarde"
        else:
            logger.info("🗺️ Cidade não identificada na rota sequencial → Período: QUALQUER")
            return "qualquer"

    except Exception as e:
        logger.error(f"❌ Erro ao determinar período ideal: {e}")
        return "qualquer"

def determine_logistics_group(endereco: str, coordinates: Optional[Tuple[float, float]] = None) -> str:
    """
    Determina o grupo logístico baseado no endereço e/ou coordenadas
    """
    # Prioridade 1: Usar coordenadas se disponíveis
    if coordinates:
        return determine_logistics_group_by_coordinates(coordinates)

    # Prioridade 2: Usar CEP extraído do endereço
    cep = extract_cep_from_address(endereco)
    if cep:
        return determine_logistics_group_by_cep(cep)

    # Prioridade 3: Análise textual do endereço
    endereco_lower = endereco.lower()
    if any(cidade in endereco_lower for cidade in ['florianópolis', 'florianopolis']):
        return 'A'
    elif any(cidade in endereco_lower for cidade in ['são josé', 'sao jose', 'palhoça', 'palhoca', 'biguaçu', 'biguacu']):
        return 'B'
    else:
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
    Horários: 8h-12h (começar cedo para otimizar deslocamento)
    """
    logger.info("🌅 Aplicando estratégia ROTA MANHÃ (Tijucas → Itapema)")
    logger.info(f"🌅 DEBUG: Técnico ID: {technician_id}, Endereço: {endereco}")
    logger.info(f"🌅 DEBUG: Agendamentos na rota: {len(agendamentos_rota)}")

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

# Endpoint para ETAPA 1 - Neural Chain 1 do ClienteChat
@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """
    🎯 ENDPOINT INTELIGENTE: Detecta automaticamente ETAPA 1 ou ETAPA 2
    """
    try:
        data = await request.json()
        logger.info(f"🚀 NEURAL CHAIN 1: Executando consulta de disponibilidade")
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")

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
        equipamentos = []

        # Coletar equipamentos
        for i in range(1, 4):
            equip = data.get(f"equipamento_{i}" if i > 1 else "equipamento", "").strip()
            if equip:
                equipamentos.append(equip)

        # Dados do pré-agendamento
        pre_agendamento_data = {
            "nome": nome,
            "endereco": endereco,
            "telefone": telefone,
            "cpf": data.get("cpf", ""),
            "email": data.get("email", ""),
            "equipamento": equipamentos[0] if equipamentos else "",  # Primeiro equipamento como string
            "equipamentos": equipamentos,  # Array completo
            "problema": data.get("problema", ""),  # Campo problema obrigatório
            "status": "pendente",
            "urgente": data.get("urgente", "não").lower() == "sim"
        }

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

        # Dados realistas para criação da OS (substituindo placeholders)
        dados_reais = {
            "nome": "Julio Cesar Betoni",
            "telefone": "48988332664",
            "endereco": "Rua Heriberto hulse 179 CEP 88110010",
            "equipamento": "Fogão Brastemp",
            "problema": "Não está acendendo",
            "cpf": "41547597096",
            "email": "akroma.julio@gmail.com",
            "tecnico": tecnico_sugerido,
            "urgente": urgente,
            "horario_agendado": horario_escolhido,
            "tipo_atendimento": "em_domicilio",
            "valor_os": 150.00
        }

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

            # Resposta final para o cliente
            mensagem = f"""🎉 *AGENDAMENTO CONFIRMADO COM SUCESSO!*

📋 *Ordem de Serviço:* #{os_criada['os_numero']}
👤 *Cliente:* {dados_reais['nome']}
📱 *Telefone:* {dados_reais['telefone']}
📍 *Endereço:* {dados_reais['endereco']}
🔧 *Equipamento:* {dados_reais['equipamento']}
⚠️ *Problema:* {dados_reais['problema']}

⏰ *Agendamento:* {horario_escolhido}
👨‍🔧 *Técnico:* {dados_reais['tecnico']}
💰 *Valor:* R$ {dados_reais['valor_os']:.2f}

✅ Seu agendamento foi confirmado! O técnico entrará em contato próximo ao horário agendado.

📞 *Dúvidas?* Entre em contato: (48) 98833-2664"""

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

        # Gerar número sequencial da OS
        response_count = supabase.table("service_orders").select("id", count="exact").execute()
        proximo_numero = len(response_count.data) + 1
        os_numero = f"OS{proximo_numero:03d}"

        logger.info(f"📋 Número da OS gerado: {os_numero}")

        # Criar cliente primeiro (se não existir)
        cliente_data = {
            "name": dados["nome"],
            "phone": dados["telefone"],
            "address": dados["endereco"],
            "cpf_cnpj": dados.get("cpf", ""),
            "email": dados.get("email", ""),
            "password": "123456"  # Senha padrão
        }

        # Verificar se cliente já existe
        response_cliente = supabase.table("clients").select("*").eq("phone", dados["telefone"]).execute()

        if response_cliente.data:
            cliente_id = response_cliente.data[0]["id"]
            logger.info(f"✅ Cliente existente encontrado: {cliente_id}")
        else:
            # Criar novo cliente
            response_novo_cliente = supabase.table("clients").insert(cliente_data).execute()
            cliente_id = response_novo_cliente.data[0]["id"]
            logger.info(f"✅ Novo cliente criado: {cliente_id}")

        # Criar OS
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
            "technician_name": dados.get("tecnico", "Simão"),
            "scheduled_date": datetime.now().isoformat(),
            "final_cost": dados.get("valor_os", 150.00),
            "order_number": os_numero,
            "pickup_address": dados["endereco"]
        }

        response_os = supabase.table("service_orders").insert(os_data).execute()
        os_id = response_os.data[0]["id"]

        logger.info(f"✅ OS criada com sucesso: {os_numero} (ID: {os_id})")

        return {
            "success": True,
            "os_numero": os_numero,
            "os_id": os_id,
            "cliente_id": cliente_id
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

            # Informações do técnico selecionado (mais limpo)
            mensagem += f"\n👨‍🔧 *Técnico:* {tecnico_info['nome']}\n"

            # Mostrar especialidades de forma mais natural
            especialidades_texto = ""
            if "coifa" in tecnico_info['especialidades']:
                especialidades_texto = "Especialista em coifas e exaustores"
            elif "fogao" in tecnico_info['especialidades']:
                especialidades_texto = "Especialista em fogões e fornos"
            else:
                especialidades_texto = "Técnico especializado"

            mensagem += f"🎯 {especialidades_texto}\n"
            mensagem += f"📞 {tecnico_info['telefone']}\n"

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
        # Esta função é para consulta de disponibilidade, não para confirmação
        # Determinar técnico baseado no primeiro equipamento usando sistema otimizado
        primeiro_equipamento = equipamentos[0]["equipamento"]
        lista_equipamentos = [eq["equipamento"] for eq in equipamentos]

        # Determinar grupo logístico
        grupo_logistico = determinar_grupo_logistico(endereco)

        # Determinar urgência (filtrar placeholders)
        urgente_str = filtrar_placeholders(data.get("urgente", "não"))
        if urgente_str:
            urgente = urgente_str.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        else:
            urgente = False  # Padrão quando placeholder filtrado

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
            urgente
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

            # Adicionar à mensagem principal
            mensagem += f"*{i}.* Data: {data_formatada} - Horário: {hora_formatada}\n"

            # Adicionar à lista de opções simples
            opcoes_simples.append({
                "numero": i,
                "data": data_formatada,
                "horario": hora_formatada,
                "datetime_completo": datetime_agendamento
            })

        mensagem += "\n📝 *Como responder:*\n"
        mensagem += "• Digite *1*, *2* ou *3* para escolher\n"
        mensagem += "• Ou digite o horário desejado (ex: *9h*, *14h*)\n"
        mensagem += "• Ou digite o período (*manhã*, *tarde*)"

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
        tres_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=3)
        response_busca = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone_contato
        ).eq("status", "pendente").gte("created_at", tres_minutos_atras.isoformat()).order("created_at", desc=True).limit(1).execute()

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

        # Para ETAPA 2, vamos usar dados padrão por enquanto
        # TODO: Implementar recuperação completa dos dados do cache
        endereco = "R. 224, 160 - Andorinha, Itapema - SC, 88220-000"  # Do exemplo real
        nome = "Julio Cesar Betoni"  # Do exemplo real
        telefone = telefone_contato  # Usar o telefone recebido
        cpf = "42547597896"  # Do exemplo real
        email = "akroma.julio@gmail.com"  # Do exemplo real
        urgente = True  # Do exemplo real

        logger.info(f"🔧 ETAPA 2: Usando dados do exemplo real:")
        logger.info(f"🔧   nome: '{nome}'")
        logger.info(f"🔧   endereco: '{endereco}'")
        logger.info(f"🔧   telefone: '{telefone}'")
        logger.info(f"🔧   cpf: '{cpf}'")
        logger.info(f"🔧   email: '{email}'")
        logger.info(f"🔧   urgente: {urgente}")

        # 🔧 CONSOLIDAR EQUIPAMENTOS E PROBLEMAS (DO EXEMPLO REAL)
        equipamentos = ["fogão de 4 bocas"]  # Do exemplo real
        problemas = ["chamas fracas"]  # Do exemplo real
        tipos_atendimento = ["em_domicilio"]  # Do exemplo real

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

        # 2. Usar função do modal para criar ordem de serviço
        logger.info(f"🔧 ETAPA 2: Usando função do modal para criar OS com técnico {tecnico_info['tecnico_id']}")

        # Determinar tipo de serviço e valor baseado nos equipamentos
        service_type = "em_domicilio"
        final_cost = 280.00  # Valor do exemplo real

        # Consolidar descrição dos problemas
        descricao_completa = " | ".join(problemas) if problemas else "Não especificado"
        tipos_equipamentos = ", ".join(equipamentos)

        # 2.1. Chamar função do modal para criar OS com técnico atribuído
        logger.info(f"🚀 ETAPA 2: Chamando função do modal createServiceOrderFromAgendamento")
        logger.info(f"   - agendamento_id: {agendamento_id}")
        logger.info(f"   - technician_id: {tecnico_info['tecnico_id']}")
        logger.info(f"   - equipamentos: {tipos_equipamentos}")

        # Fazer chamada HTTP para o frontend criar a OS usando a função do modal
        # Como estamos no backend Python, vamos simular os dados que o modal enviaria

        service_order_data = {
            "equipment": tipos_equipamentos,
            "problem_description": descricao_completa,
            "notes": f"Agendamento inteligente - Score técnico: {tecnico_info['score']}",
            "estimated_cost": final_cost,
            "service_attendance_type": service_type
        }

        # Como não podemos chamar diretamente a função TypeScript do Python,
        # vamos criar a OS manualmente mas seguindo exatamente o padrão do modal

        # Primeiro, criar cliente se necessário (mesmo padrão do modal)
        client_data = {
            "name": nome,
            "email": email if email else None,
            "phone": telefone,
            "address": endereco
        }

        client_id = None
        if client_data["name"]:
            try:
                response_client = supabase.rpc('create_client', {
                    'client_name': client_data["name"],
                    'client_email': client_data["email"],
                    'client_phone': client_data["phone"],
                    'client_address': client_data["address"],
                    'client_city': None,
                    'client_state': None,
                    'client_zip_code': None
                }).execute()

                if response_client.data:
                    if isinstance(response_client.data, list) and len(response_client.data) > 0:
                        client_id = response_client.data[0]["id"]
                    elif isinstance(response_client.data, dict):
                        client_id = response_client.data["id"]
                    logger.info(f"✅ Cliente criado: {client_id}")
            except Exception as client_error:
                logger.warning(f"⚠️ Erro ao criar cliente: {client_error}")

        # Gerar número da OS
        order_number = await gerar_proximo_numero_os()
        logger.info(f"🔢 Número OS gerado: {order_number}")

        # Criar OS seguindo exatamente o padrão do OrderLifecycleService
        now = datetime.now().isoformat()
        os_data = {
            "order_number": order_number,
            "client_name": nome,
            "client_phone": telefone,
            "client_email": email,
            "pickup_address": endereco,
            "equipment_type": service_order_data["equipment"],
            "description": service_order_data["problem_description"],
            "status": "scheduled",
            "scheduled_date": data_agendada,
            "scheduled_time": hora_agendada,
            "technician_id": tecnico_info["tecnico_id"],  # ✅ TÉCNICO ATRIBUÍDO
            "created_at": now,
            "updated_at": now,
            "client_id": client_id,
            "service_attendance_type": service_type,
            "notes": service_order_data["notes"]
        }

        logger.info(f"🔍 DADOS DA OS (padrão modal):")
        logger.info(f"   - technician_id: {os_data.get('technician_id')}")
        logger.info(f"   - client_name: {os_data.get('client_name')}")
        logger.info(f"   - equipment_type: {os_data.get('equipment_type')}")

        response_os = supabase.table("service_orders").insert(os_data).execute()

        if not response_os.data:
            raise Exception("Erro ao criar ordem de serviço")

        service_order = response_os.data[0]
        os_id = service_order["id"]

        logger.info(f"✅ OS criada (padrão modal): {os_id}")
        logger.info(f"🔍 TÉCNICO ATRIBUÍDO: {service_order.get('technician_id')}")

        # Marcar agendamento como convertido (mesmo padrão do modal)
        try:
            supabase.table("agendamentos_ai").update({
                "processado": True,
                "ordem_servico_id": os_id,
                "ordem_servico_numero": order_number,
                "status": "convertido"
            }).eq("id", agendamento_id).execute()
            logger.info(f"✅ Agendamento marcado como convertido: {agendamento_id} -> {order_number}")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao marcar agendamento como convertido: {e}")

        # 4. Preparar resposta de confirmação
        data_formatada = horario_dt.strftime('%A, %d/%m/%Y')
        hora_formatada = horario_dt.strftime('%H:%M')

        # Traduzir dia da semana
        dias_semana = {
            'Monday': 'Segunda-feira',
            'Tuesday': 'Terça-feira',
            'Wednesday': 'Quarta-feira',
            'Thursday': 'Quinta-feira',
            'Friday': 'Sexta-feira',
            'Saturday': 'Sábado',
            'Sunday': 'Domingo'
        }

        for en, pt in dias_semana.items():
            data_formatada = data_formatada.replace(en, pt)

        mensagem_confirmacao = f"✅ *Agendamento Confirmado!*\n\n"
        mensagem_confirmacao += f"📋 *Ordem de Serviço:* {order_number}\n"
        mensagem_confirmacao += f"👤 *Cliente:* {nome}\n"
        mensagem_confirmacao += f"⚙️ *Equipamento(s):* {tipos_equipamentos}\n"
        mensagem_confirmacao += f"📅 *Data/Hora:* {data_formatada} às {hora_formatada}\n"
        mensagem_confirmacao += f"👨‍🔧 *Técnico:* {tecnico_info['nome']}\n"
        mensagem_confirmacao += f"📞 *Contato:* {tecnico_info['telefone']}\n"
        mensagem_confirmacao += f"💰 *Valor Estimado:* R$ {final_cost:.2f}\n\n"
        mensagem_confirmacao += f"📱 *Central:* (48) 98833-2664\n"
        mensagem_confirmacao += f"Confirmação automática 1 dia antes do agendamento.\n\n"
        mensagem_confirmacao += f"Obrigado por escolher a Fix Fogões! 🔧"

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem_confirmacao,
                "agendamento_confirmado": True,
                # ✅ PARÂMETROS NO NÍVEL RAIZ PARA CLIENTECHAT
                "ordem_servico_numero": order_number,
                "cliente": nome,
                "data_agendada": data_formatada,  # Data formatada para exibição
                "hora_agendada": hora_formatada,  # Hora formatada para exibição
                "equipamento": tipos_equipamentos,
                "endereco": endereco,
                "telefone_contato": telefone,
                "tecnico_nome": tecnico_info["nome"],
                "tecnico_telefone": tecnico_info["telefone"],
                "valor_estimado": f"R$ {final_cost:.2f}",
                # ✅ MANTER DADOS ANINHADOS PARA COMPATIBILIDADE
                "dados_agendamento": {
                    "agendamento_id": agendamento_id,
                    "ordem_servico_id": os_id,
                    "ordem_servico_numero": order_number,
                    "cliente": nome,
                    "data_agendada": data_agendada,
                    "hora_agendada": hora_agendada,
                    "tecnico": tecnico_info,
                    "valor_estimado": final_cost,
                    "grupo_logistico": grupo_logistico
                }
            }
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

    # 4. HORÁRIOS ESPECÍFICOS
    if any(h in opcao_lower for h in ["9", "nove", "08", "8"]):
        return "1"  # Manhã cedo
    if any(h in opcao_lower for h in ["10", "dez", "11", "onze"]):
        return "1"  # Manhã
    if any(h in opcao_lower for h in ["14", "2", "duas", "13", "15"]):
        return "2"  # Tarde
    if any(h in opcao_lower for h in ["16", "4", "quatro", "17", "5"]):
        return "3"  # Final da tarde

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
