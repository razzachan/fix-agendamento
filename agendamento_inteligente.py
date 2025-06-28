import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from supabase import create_client, Client
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

def get_supabase_client() -> Client:
    """Criar cliente Supabase"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise Exception("Variáveis SUPABASE_URL e SUPABASE_KEY são obrigatórias")
    return create_client(url, key)

async def consultar_disponibilidade_simples(data: dict):
    """
    ETAPA 1: Consultar horários disponíveis
    """
    try:
        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()
        telefone = data.get("telefone", "").strip()

        # Validar dados obrigatórios
        if not nome or not endereco or not equipamento:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Nome, endereço e equipamento são obrigatórios"}
            )

        # Gerar horários disponíveis (próximos 3 dias úteis)
        horarios_disponiveis = []
        data_atual = datetime.now()
        
        # Pular fins de semana
        while len(horarios_disponiveis) < 3:
            data_atual += timedelta(days=1)
            if data_atual.weekday() < 5:  # Segunda a sexta
                # Horários: 9h, 14h, 16h
                for hora in [9, 14, 16]:
                    horario_dt = data_atual.replace(hour=hora, minute=0, second=0, microsecond=0)
                    horarios_disponiveis.append({
                        "numero": len(horarios_disponiveis) + 1,
                        "texto": f"{horario_dt.strftime('%d/%m')} às {horario_dt.strftime('%H:%M')}",
                        "datetime_agendamento": horario_dt.isoformat()
                    })
                    if len(horarios_disponiveis) >= 3:
                        break

        # Resposta para o cliente
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:\n\n"
        for h in horarios_disponiveis:
            mensagem += f"{h['numero']}. {h['texto']}\n"
        
        mensagem += f"\nResponda com o número da opção desejada (1, 2 ou 3)."

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "horarios": horarios_disponiveis,
                "action": "select_time"
            }
        )

    except Exception as e:
        logger.error(f"Erro ao consultar disponibilidade: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar consulta: {str(e)}"}
        )

async def confirmar_agendamento_simples(data: dict, horario_escolhido: str):
    """
    ETAPA 2: Confirmar agendamento
    """
    try:
        supabase = get_supabase_client()
        
        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()
        telefone = data.get("telefone", "").strip()
        problema = data.get("problema", "Não especificado").strip()

        # Processar horário escolhido
        try:
            horario_dt = datetime.fromisoformat(horario_escolhido)
            data_agendada = horario_dt.strftime('%Y-%m-%d')
            hora_agendada = horario_dt.strftime('%H:%M')
        except:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Formato de horário inválido"}
            )

        # Criar pré-agendamento
        agendamento_data = {
            "nome": nome,
            "telefone": telefone,
            "endereco": endereco,
            "equipamento": equipamento,
            "problema": problema,
            "data_agendada": horario_dt.isoformat(),
            "tecnico": "A definir",
            "urgente": False,
            "status": "confirmado",
            "origem": "clientechat_inteligente"
        }

        response = supabase.table("agendamentos_ai").insert(agendamento_data).execute()

        if not response.data:
            raise Exception("Erro ao criar agendamento")

        agendamento_id = response.data[0]["id"]

        # Resposta de confirmação
        mensagem = f"✅ *Agendamento Confirmado!*\n\n"
        mensagem += f"📋 *ID:* #{agendamento_id}\n"
        mensagem += f"👤 *Cliente:* {nome}\n"
        mensagem += f"📍 *Endereço:* {endereco}\n"
        mensagem += f"🔧 *Equipamento:* {equipamento}\n"
        mensagem += f"📅 *Data:* {horario_dt.strftime('%d/%m/%Y')}\n"
        mensagem += f"⏰ *Horário:* {hora_agendada}\n"
        mensagem += f"📱 *Contato:* (48) 98833-2664\n\n"
        mensagem += f"Você receberá uma confirmação por WhatsApp 1 dia antes do atendimento."

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "agendamento_id": agendamento_id
            }
        )

    except Exception as e:
        logger.error(f"Erro ao confirmar agendamento: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao confirmar agendamento: {str(e)}"}
        )

async def agendamento_inteligente_completo_handler(request: Request):
    """
    Endpoint principal que gerencia consulta + confirmação
    """
    try:
        data = await request.json()
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")

        # DETECTAR QUAL ETAPA EXECUTAR
        horario_escolhido = data.get("horario_escolhido", "").strip()

        if not horario_escolhido:
            # ETAPA 1: CONSULTAR DISPONIBILIDADE
            logger.info("Executando ETAPA 1: Consulta de disponibilidade")
            return await consultar_disponibilidade_simples(data)
        else:
            # ETAPA 2: CONFIRMAR AGENDAMENTO
            logger.info("Executando ETAPA 2: Confirmação de agendamento")
            return await confirmar_agendamento_simples(data, horario_escolhido)

    except Exception as e:
        logger.error(f"Erro no agendamento inteligente: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro interno: {str(e)}"}
        )
