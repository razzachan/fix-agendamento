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
import pytz
from datetime import datetime, timedelta

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("🚀 MIDDLEWARE V4.1 INICIADO - SISTEMA INTELIGENTE COMPLETO COM DEBUG 🚀")

# Carregar variáveis de ambiente
load_dotenv()

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
    telefone: str = None
    cpf: str = None
    email: str = None

def get_supabase_client() -> Client:
    """Criar cliente Supabase"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise Exception("Variáveis SUPABASE_URL e SUPABASE_KEY são obrigatórias")
    return create_client(url, key)

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

async def gerar_horarios_disponiveis_v4(tecnico: str, grupo_logistico: str, urgente: bool) -> List[Dict]:
    """
    Gera horários disponíveis baseado no técnico e grupo logístico
    """
    try:
        horarios = []
        agora = datetime.now(pytz.timezone('America/Sao_Paulo'))

        # Para urgente, começar amanhã. Para normal, começar em 2 dias
        inicio = agora + timedelta(days=1 if urgente else 2)

        # Gerar horários para os próximos 7 dias
        for i in range(7):
            data = inicio + timedelta(days=i)

            # Apenas dias úteis (segunda a sexta)
            if data.weekday() < 5:
                # Horários disponíveis: 8h às 17h
                for hora in range(8, 18):
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

def processar_escolha_horario(horario_escolhido: str, horarios_disponiveis: List[Dict]) -> Optional[str]:
    """
    Processa a escolha do cliente (número 1, 2, 3 ou horário ISO)
    Retorna o horário ISO correspondente
    """
    try:
        # Verificar se é um número (1, 2, 3)
        if horario_escolhido.strip().isdigit():
            opcao = int(horario_escolhido.strip())
            if 1 <= opcao <= len(horarios_disponiveis):
                horario_selecionado = horarios_disponiveis[opcao - 1]
                return horario_selecionado.get('datetime_agendamento')
            else:
                return None

        # Verificar se é um horário ISO (fallback)
        else:
            try:
                datetime.fromisoformat(horario_escolhido)
                return horario_escolhido
            except:
                return None

    except Exception as e:
        logger.error(f"Erro ao processar escolha de horário: {e}")
        return None

@app.get("/")
async def root():
    """Endpoint principal que serve a interface web"""
    return {"message": "🚀 MIDDLEWARE V4.0 - SISTEMA INTELIGENTE COMPLETO ATIVO 🚀", "version": "4.0", "status": "DEPLOY_OK"}

@app.post("/")
async def receber_dados(agendamento: Agendamento):
    """
    Recebe dados de agendamento do WhatsApp e insere no Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Inserir no Supabase
        response = supabase.table("agendamentos_ai").insert({
            "nome": agendamento.nome,
            "endereco": agendamento.endereco,
            "equipamento": agendamento.equipamento,
            "problema": agendamento.problema,
            "urgente": agendamento.urgente.lower() in ['sim', 'true', 'urgente'],
            "telefone": agendamento.telefone,
            "cpf": agendamento.cpf,
            "email": agendamento.email,
            "status": "pendente",
            "origem": "whatsapp"
        }).execute()
        
        logger.info(f"Agendamento inserido: {response}")
        
        return {
            "sucesso": True,
            "mensagem": "SISTEMA ANTIGO - Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"
        }
        
    except Exception as e:
        logger.error(f"Erro ao inserir agendamento: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar agendamento: {str(e)}"
        }

@app.get("/api/status")
async def api_status():
    """Endpoint de verificação de saúde da API"""
    return {"status": "online", "timestamp": datetime.now().isoformat()}

@app.post("/agendamento")
async def agendamento_alternativo(request: Request):
    """Endpoint alternativo para compatibilidade com configurações anteriores"""
    try:
        data = await request.json()
        agendamento = Agendamento(**data)
        return await receber_dados(agendamento)
    except Exception as e:
        logger.error(f"Erro no endpoint alternativo: {e}")
        return {"sucesso": False, "mensagem": f"Erro: {str(e)}"}

@app.get("/agendamento-inteligente")
async def agendamento_inteligente_get():
    """Endpoint para verificar se o serviço de agendamento inteligente está online"""
    return {"status": "online", "message": "Serviço de agendamento inteligente ativo"}

@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """🚀 SISTEMA DE AGENDAMENTO INTELIGENTE V4.1 - CLIENTECHAT DUAS ETAPAS COM DEBUG 🚀"""
    try:
        data = await request.json()
        logger.info(f"🚀 SISTEMA V4.1 - dados recebidos: {data}")

        # DETECTAR QUAL ETAPA EXECUTAR
        horario_escolhido = data.get("horario_escolhido", "").strip()

        logger.info(f"🔍 DEBUG ETAPA - horario_escolhido RAW: '{data.get('horario_escolhido')}'")
        logger.info(f"🔍 DEBUG ETAPA - horario_escolhido STRIP: '{horario_escolhido}'")
        logger.info(f"🔍 DEBUG ETAPA - not horario_escolhido: {not horario_escolhido}")
        logger.info(f"🔍 DEBUG ETAPA - bool(horario_escolhido): {bool(horario_escolhido)}")
        logger.info(f"🔍 DEBUG ETAPA - len(horario_escolhido): {len(horario_escolhido)}")

        if not horario_escolhido:
            # ETAPA 1: CONSULTAR DISPONIBILIDADE
            logger.info("🚀 EXECUTANDO ETAPA 1: Consulta de disponibilidade")
            return await consultar_disponibilidade_v4(data)
        else:
            # ETAPA 2: CONFIRMAR AGENDAMENTO
            logger.info("🚀 EXECUTANDO ETAPA 2: Confirmação de agendamento")
            logger.info(f"🎯 PRESTES A CHAMAR confirmar_agendamento_v4 com data={data} e horario_escolhido='{horario_escolhido}'")
            resultado = await confirmar_agendamento_v4(data, horario_escolhido)
            logger.info(f"🎯 RESULTADO DA CHAMADA: {resultado}")
            return resultado

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"🚨 EXCEÇÃO CAPTURADA NO AGENDAMENTO INTELIGENTE: {e}")
        logger.error(f"🚨 TRACEBACK COMPLETO: {error_details}")
        return JSONResponse(
            status_code=500,
            content={"sucesso": False, "mensagem": f"Erro interno: {str(e)}"}
        )

async def processar_mensagem_clientechat(data: dict):
    """🤖 PROCESSAR MENSAGEM DO CLIENTECHAT - DUAS ETAPAS AUTOMÁTICAS"""
    try:
        mensagem = data.get('message', '').strip()
        telefone = data.get('phone', '').replace('+', '').replace(' ', '').replace('-', '')

        logger.info(f"📱 ClienteChat - Telefone: {telefone}")
        logger.info(f"💬 ClienteChat - Mensagem: {mensagem}")

        # ETAPA 2: DETECTAR ESCOLHA DE HORÁRIO (números 1, 2 ou 3)
        if mensagem in ['1', '2', '3']:
            logger.info(f"🎯 ClienteChat - ETAPA 2: Escolha de horário {mensagem}")
            return await processar_escolha_horario_clientechat(telefone, mensagem)

        # ETAPA 1: DETECTAR DADOS COMPLETOS PARA AGENDAMENTO
        if all(campo in mensagem.lower() for campo in ['nome', 'endereço', 'cpf', 'e-mail']):
            logger.info("🎯 ClienteChat - ETAPA 1: Consulta de disponibilidade")
            return await processar_primeira_consulta_clientechat(mensagem, telefone)

        # MENSAGEM INCOMPLETA
        return {
            "response": "❌ Para agendar, preciso dos seguintes dados:\n\n1️⃣ Nome completo\n2️⃣ Endereço completo com CEP e complemento (se tiver)\n3️⃣ CPF\n4️⃣ E-mail\n\nAssim que eu tiver esses dados, podemos prosseguir com o agendamento!"
        }

    except Exception as e:
        logger.error(f"❌ ClienteChat - Erro: {e}")
        return {
            "response": f"❌ Erro ao processar sua mensagem: {str(e)}"
        }

async def processar_primeira_consulta_clientechat(mensagem: str, telefone: str):
    """🎯 ETAPA 1: PROCESSAR DADOS E CONSULTAR HORÁRIOS DISPONÍVEIS"""
    try:
        # Extrair dados da mensagem usando regex ou parsing simples
        dados_extraidos = extrair_dados_mensagem(mensagem)

        if not dados_extraidos:
            return {
                "response": "❌ Não consegui extrair todos os dados necessários. Por favor, envie:\n\n1️⃣ Nome completo\n2️⃣ Endereço completo com CEP\n3️⃣ CPF\n4️⃣ E-mail"
            }

        # Adicionar telefone aos dados
        dados_extraidos['telefone'] = telefone

        # Consultar horários disponíveis usando a lógica existente
        resultado = await consultar_disponibilidade_v4(dados_extraidos)

        # Retornar horários formatados para ClienteChat
        if resultado.get('sucesso'):
            horarios = resultado.get('horarios_disponiveis', [])
            if horarios:
                # Salvar dados E horários temporariamente para a segunda etapa
                dados_extraidos['horarios_disponiveis'] = horarios
                await salvar_dados_temporarios(telefone, dados_extraidos)

                response = "✅ Encontrei horários disponíveis para você:\n\n"
                for i, horario in enumerate(horarios[:3], 1):  # Máximo 3 opções
                    if isinstance(horario, dict):
                        response += f"{i}️⃣ {horario.get('texto', horario)}\n"
                    else:
                        response += f"{i}️⃣ {horario}\n"
                response += "\n📱 Responda com o número da opção desejada (1, 2 ou 3)"
                return {"response": response}
            else:
                return {"response": "❌ Não encontrei horários disponíveis no momento. Tente novamente mais tarde."}
        else:
            return {"response": f"❌ {resultado.get('mensagem', 'Erro ao consultar horários')}"}

    except Exception as e:
        logger.error(f"❌ Erro na primeira consulta ClienteChat: {e}")
        return {"response": f"❌ Erro ao processar consulta: {str(e)}"}

async def processar_escolha_horario_clientechat(telefone: str, escolha: str):
    """🎯 ETAPA 2: PROCESSAR ESCOLHA DE HORÁRIO E CRIAR AGENDAMENTO"""
    try:
        # Recuperar dados salvos temporariamente
        dados_salvos = await recuperar_dados_temporarios(telefone)

        if not dados_salvos:
            return {
                "response": "❌ Não encontrei seus dados. Por favor, inicie o agendamento novamente com seus dados completos."
            }

        # Recuperar horários disponíveis salvos
        horarios_disponiveis = dados_salvos.get('horarios_disponiveis', [])

        if not horarios_disponiveis:
            return {
                "response": "❌ Não encontrei os horários disponíveis. Por favor, inicie o agendamento novamente."
            }

        # Converter escolha numérica em horário real
        try:
            indice = int(escolha) - 1  # Converter 1,2,3 para 0,1,2
            if indice < 0 or indice >= len(horarios_disponiveis):
                return {
                    "response": f"❌ Opção inválida. Escolha entre 1 e {len(horarios_disponiveis)}."
                }

            horario_obj = horarios_disponiveis[indice]

            # Extrair o datetime do horário escolhido
            if isinstance(horario_obj, dict):
                horario_escolhido = horario_obj.get('datetime_agendamento', horario_obj.get('texto', str(horario_obj)))
            else:
                horario_escolhido = str(horario_obj)

            logger.info(f"🎯 Horário escolhido: {horario_escolhido}")

        except ValueError:
            return {
                "response": "❌ Por favor, envie apenas o número da opção (1, 2 ou 3)."
            }

        # Adicionar horário escolhido aos dados
        dados_salvos['horario_escolhido'] = horario_escolhido

        # Confirmar agendamento usando a lógica existente
        resultado = await confirmar_agendamento_v4(dados_salvos, horario_escolhido)

        # Limpar dados temporários
        await limpar_dados_temporarios(telefone)

        # Retornar confirmação formatada para ClienteChat
        if resultado.get('sucesso'):
            return {"response": f"✅ {resultado.get('mensagem', 'Agendamento confirmado com sucesso!')}"}
        else:
            return {"response": f"❌ {resultado.get('mensagem', 'Erro ao confirmar agendamento')}"}

    except Exception as e:
        logger.error(f"❌ Erro na escolha de horário ClienteChat: {e}")
        return {"response": f"❌ Erro ao processar escolha: {str(e)}"}

# FUNÇÕES AUXILIARES PARA CLIENTECHAT
import re

# Armazenamento temporário em memória (em produção, usar Redis ou banco)
dados_temporarios = {}

def extrair_dados_mensagem(mensagem: str) -> dict:
    """Extrair dados estruturados da mensagem do cliente"""
    try:
        dados = {}

        # Extrair nome (primeira linha ou após "nome:")
        nome_match = re.search(r'nome[:\s]+([^\n]+)', mensagem, re.IGNORECASE)
        if nome_match:
            dados['nome'] = nome_match.group(1).strip()

        # Extrair endereço
        endereco_match = re.search(r'endere[çc]o[:\s]+([^\n]+)', mensagem, re.IGNORECASE)
        if endereco_match:
            dados['endereco'] = endereco_match.group(1).strip()

        # Extrair CPF
        cpf_match = re.search(r'cpf[:\s]+([0-9.-]+)', mensagem, re.IGNORECASE)
        if cpf_match:
            dados['cpf'] = cpf_match.group(1).strip()

        # Extrair email
        email_match = re.search(r'e-?mail[:\s]+([^\s\n]+@[^\s\n]+)', mensagem, re.IGNORECASE)
        if email_match:
            dados['email'] = email_match.group(1).strip()

        # Extrair equipamento (opcional)
        equipamento_match = re.search(r'equipamento[:\s]+([^\n]+)', mensagem, re.IGNORECASE)
        if equipamento_match:
            dados['equipamento'] = equipamento_match.group(1).strip()
        else:
            dados['equipamento'] = 'Fogão'  # Padrão

        # Validar se tem dados mínimos
        if all(key in dados for key in ['nome', 'endereco', 'cpf', 'email']):
            return dados
        else:
            return None

    except Exception as e:
        logger.error(f"❌ Erro ao extrair dados: {e}")
        return None

async def salvar_dados_temporarios(telefone: str, dados: dict):
    """Salvar dados temporariamente para a segunda etapa"""
    dados_temporarios[telefone] = {
        'dados': dados,
        'timestamp': datetime.now().isoformat()
    }
    logger.info(f"💾 Dados salvos para {telefone}")

async def recuperar_dados_temporarios(telefone: str) -> dict:
    """Recuperar dados salvos temporariamente"""
    if telefone in dados_temporarios:
        dados_salvos = dados_temporarios[telefone]['dados']
        logger.info(f"📂 Dados recuperados para {telefone}")
        return dados_salvos
    return None

async def limpar_dados_temporarios(telefone: str):
    """Limpar dados temporários após uso"""
    if telefone in dados_temporarios:
        del dados_temporarios[telefone]
        logger.info(f"🗑️ Dados limpos para {telefone}")

async def consultar_disponibilidade_simples(data: dict):
    """ETAPA 1: Consultar horários disponíveis"""
    try:
        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()

        # Validar dados obrigatórios
        if not nome or not endereco or not equipamento:
            return {
                "sucesso": False,
                "mensagem": "Nome, endereço e equipamento são obrigatórios"
            }

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
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:"
        mensagem += "\n\n"
        for h in horarios_disponiveis:
            mensagem += f"{h['numero']}. {h['texto']}"
            mensagem += "\n"

        mensagem += "\nResponda com o número da opção desejada (1, 2 ou 3)."

        return {
            "sucesso": True,
            "mensagem": mensagem,
            "horarios": horarios_disponiveis,
            "action": "select_time"
        }

    except Exception as e:
        logger.error(f"Erro ao consultar disponibilidade: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar consulta: {str(e)}"
        }

async def confirmar_agendamento_simples(data: dict, horario_escolhido: str):
    """ETAPA 2: Confirmar agendamento"""
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
        except:
            return {
                "sucesso": False,
                "mensagem": "Formato de horário inválido"
            }

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
        mensagem += f"⏰ *Horário:* {horario_dt.strftime('%H:%M')}\n"
        mensagem += f"📱 *Contato:* (48) 98833-2664\n\n"
        mensagem += f"Você receberá uma confirmação por WhatsApp 1 dia antes do atendimento."

        return {
            "sucesso": True,
            "mensagem": mensagem,
            "agendamento_id": agendamento_id
        }

    except Exception as e:
        logger.error(f"Erro ao confirmar agendamento: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao confirmar agendamento: {str(e)}"
        }

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde para monitoramento"""
    return {
        "status": "healthy",
        "environment": {
            "SUPABASE_URL": "Definida" if os.getenv("SUPABASE_URL") else "Não definida",
            "SUPABASE_KEY": "Definida" if os.getenv("SUPABASE_KEY") else "Não definida"
        }
    }

# NOVO ENDPOINT - SISTEMA INTELIGENTE V4.0
@app.post("/agendamento-v4")
async def agendamento_inteligente_v4(request: Request):
    """SISTEMA DE AGENDAMENTO INTELIGENTE V4.0 - ENDPOINT NOVO"""
    try:
        data = await request.json()
        logger.info(f"🚀 SISTEMA V4.0 - dados recebidos: {data}")

        # DETECTAR QUAL ETAPA EXECUTAR
        horario_escolhido = data.get("horario_escolhido", "").strip()
        logger.info(f"🚀 SISTEMA V4.0 - horario_escolhido: '{horario_escolhido}'")

        if not horario_escolhido:
            # ETAPA 1: CONSULTAR DISPONIBILIDADE
            logger.info("🚀 SISTEMA V4.0 - Executando ETAPA 1: Consulta de disponibilidade")
            return await consultar_disponibilidade_v4(data)
        else:
            # ETAPA 2: CONFIRMAR AGENDAMENTO
            logger.info("🚀 SISTEMA V4.0 - Executando ETAPA 2: Confirmação de agendamento")
            return await confirmar_agendamento_v4(data, horario_escolhido)

    except Exception as e:
        logger.error(f"🚀 SISTEMA V4.0 - Erro: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar agendamento V4.0: {str(e)}"
        }

async def consultar_disponibilidade_v4(data: dict):
    """ETAPA 1: Consultar horários disponíveis - V4.0"""
    try:
        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()

        # Validar dados obrigatórios
        if not nome or not endereco or not equipamento:
            return {
                "sucesso": False,
                "mensagem": "Nome, endereço e equipamento são obrigatórios"
            }

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
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:"
        mensagem += "\n\n"
        for h in horarios_disponiveis:
            mensagem += f"{h['numero']}. {h['texto']}"
            mensagem += "\n"

        mensagem += "\nResponda com o número da opção desejada (1, 2 ou 3)."

        return {
            "sucesso": True,
            "mensagem": mensagem,
            "horarios_disponiveis": horarios_disponiveis,
            "action": "select_time",
            "version": "4.0"
        }

    except Exception as e:
        logger.error(f"🚀 V4.0 - Erro ao consultar disponibilidade: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao processar consulta V4.0: {str(e)}"
        }

async def confirmar_agendamento_v4(data: dict, horario_escolhido: str):
    """ETAPA 2: Confirmar agendamento - V4.0"""
    try:
        supabase = get_supabase_client()

        # Extrair dados básicos
        nome = data.get("nome", "").strip()
        endereco = data.get("endereco", "").strip()
        equipamento = data.get("equipamento", "").strip()
        telefone = data.get("telefone", "").strip()
        problema = data.get("problema", "Não especificado").strip()

        # Determinar técnico e grupo logístico
        tecnico = determinar_tecnico(equipamento)
        grupo_logistico = determinar_grupo_logistico(endereco)
        urgente = data.get("urgente", "não")
        if isinstance(urgente, str):
            urgente = urgente.lower() in ['sim', 'true', 'urgente', '1', 'yes']

        # Gerar horários disponíveis para processar a escolha
        horarios_disponiveis = await gerar_horarios_disponiveis_v4(tecnico, grupo_logistico, urgente)

        # Processar horário escolhido (aceita 1, 2, 3 ou ISO)
        horario_iso = processar_escolha_horario(horario_escolhido, horarios_disponiveis)

        if not horario_iso:
            return {
                "sucesso": False,
                "mensagem": "Opção de horário inválida. Por favor, escolha 1, 2 ou 3."
            }

        # Converter para datetime
        try:
            horario_dt = datetime.fromisoformat(horario_iso)
        except:
            return {
                "sucesso": False,
                "mensagem": "Formato de horário inválido"
            }

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
            "origem": "clientechat_v4"
        }

        response = supabase.table("agendamentos_ai").insert(agendamento_data).execute()

        if not response.data:
            raise Exception("Erro ao criar agendamento")

        agendamento_id = response.data[0]["id"]

        # Resposta de confirmação
        mensagem = f"✅ *Agendamento Confirmado V4.0!*\n\n"
        mensagem += f"📋 *ID:* #{agendamento_id}\n"
        mensagem += f"👤 *Cliente:* {nome}\n"
        mensagem += f"📍 *Endereço:* {endereco}\n"
        mensagem += f"🔧 *Equipamento:* {equipamento}\n"
        mensagem += f"📅 *Data:* {horario_dt.strftime('%d/%m/%Y')}\n"
        mensagem += f"⏰ *Horário:* {horario_dt.strftime('%H:%M')}\n"
        mensagem += f"📱 *Contato:* (48) 98833-2664\n\n"
        mensagem += f"Você receberá uma confirmação por WhatsApp 1 dia antes do atendimento."

        return {
            "sucesso": True,
            "mensagem": mensagem,
            "agendamento_id": agendamento_id,
            "version": "4.0"
        }

    except Exception as e:
        logger.error(f"🚀 V4.0 - Erro ao confirmar agendamento: {e}")
        return {
            "sucesso": False,
            "mensagem": f"Erro ao confirmar agendamento V4.0: {str(e)}"
        }

# Endpoint para consultar disponibilidade
@app.post("/consultar-disponibilidade")
async def consultar_disponibilidade(request: Request):
    try:
        data = await request.json()
        logger.info(f"Consultando disponibilidade: {data}")

        # Extrair dados básicos
        endereco = data.get("endereco", "").strip()
        nome = data.get("nome", "").strip()
        telefone = data.get("telefone", "").strip()
        equipamento = data.get("equipamento", "").strip()
        problema = data.get("problema", "").strip()

        # Validar dados obrigatórios
        if not nome:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Nome é obrigatório"}
            )
        if not endereco:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Endereço é obrigatório"}
            )
        if not telefone:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Telefone é obrigatório"}
            )
        if not equipamento:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Equipamento é obrigatório"}
            )

        # Determinar técnico baseado no equipamento
        tecnico = determinar_tecnico(equipamento)

        # Determinar grupo logístico
        grupo_logistico = determinar_grupo_logistico(endereco)

        # Determinar urgência
        urgente = data.get("urgente", "não")
        if isinstance(urgente, str):
            urgente = urgente.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        elif isinstance(urgente, bool):
            urgente = urgente
        else:
            urgente = False

        # Gerar horários disponíveis
        horarios_disponiveis = await gerar_horarios_disponiveis_v4(
            tecnico, grupo_logistico, urgente
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

        # Formatar resposta para o cliente
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:\n\n"
        for i, horario in enumerate(horarios_disponiveis[:3], 1):
            mensagem += f"{i}. {horario['texto']}\n"

        mensagem += "\nResponda com o número da opção desejada (1, 2 ou 3)."

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "horarios_disponiveis": horarios_disponiveis[:3],
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
                "equipamento": equipamento,
                "problema": problema
            }
        )

    except Exception as e:
        logger.error(f"Erro ao consultar disponibilidade: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao consultar disponibilidade: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
