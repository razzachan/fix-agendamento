import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("🚀 MIDDLEWARE V4.0 INICIADO - SISTEMA INTELIGENTE COMPLETO 🚀")

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
    """🚀 SISTEMA DE AGENDAMENTO INTELIGENTE V4.0 - ATUALIZADO 🚀"""
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
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:\n\n"
        for h in horarios_disponiveis:
            mensagem += f"{h['numero']}. {h['texto']}\n"

        mensagem += f"\nResponda com o número da opção desejada (1, 2 ou 3)."

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
        mensagem = f"✅ Encontrei horários disponíveis para {equipamento}:\n\n"
        for h in horarios_disponiveis:
            mensagem += f"{h['numero']}. {h['texto']}\n"

        mensagem += f"\nResponda com o número da opção desejada (1, 2 ou 3)."

        return {
            "sucesso": True,
            "mensagem": mensagem,
            "horarios": horarios_disponiveis,
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

        # Extrair múltiplos equipamentos
        equipamento_2 = data.get("equipamento_2", "").strip()
        problema_2 = data.get("problema_2", "").strip()
        equipamento_3 = data.get("equipamento_3", "").strip()
        problema_3 = data.get("problema_3", "").strip()

        # Extrair tipos de atendimento para cada equipamento
        tipo_atendimento_1 = data.get("tipo_atendimento_1", data.get("tipo_atendimento", "em_domicilio")).strip()
        tipo_atendimento_2 = data.get("tipo_atendimento_2", "").strip()
        tipo_atendimento_3 = data.get("tipo_atendimento_3", "").strip()

        # Extrair valores para cada equipamento
        valor_os_1 = data.get("valor_os_1", data.get("valor_os", "0")).strip()
        valor_os_2 = data.get("valor_os_2", "0").strip()
        valor_os_3 = data.get("valor_os_3", "0").strip()

        urgente = data.get("urgente", "não").strip().lower() in ['sim', 'true', 'urgente', '1', 'yes']

        # Processar horário escolhido
        try:
            # Se é um número (1, 2, 3), converter para horário ISO
            if horario_escolhido.strip().isdigit():
                opcao = int(horario_escolhido.strip())
                # Gerar os mesmos horários da ETAPA 1
                horarios_disponiveis = await consultar_disponibilidade_v4(data)
                if horarios_disponiveis.get("sucesso") and horarios_disponiveis.get("horarios"):
                    horarios = horarios_disponiveis["horarios"]
                    if 1 <= opcao <= len(horarios):
                        horario_selecionado = horarios[opcao - 1]
                        horario_iso = horario_selecionado.get('datetime_agendamento')
                        horario_dt = datetime.fromisoformat(horario_iso)
                    else:
                        return {
                            "sucesso": False,
                            "mensagem": f"Opção inválida. Escolha entre 1 e {len(horarios)}."
                        }
                else:
                    return {
                        "sucesso": False,
                        "mensagem": "Erro ao recuperar horários disponíveis"
                    }
            else:
                # Se já é ISO, usar diretamente
                horario_dt = datetime.fromisoformat(horario_escolhido)
        except:
            return {
                "sucesso": False,
                "mensagem": "Formato de horário inválido"
            }

        # Criar pré-agendamento com múltiplos equipamentos
        agendamento_data = {
            "nome": nome,
            "telefone": telefone,
            "endereco": endereco,
            "equipamento": equipamento,
            "problema": problema,
            "data_agendada": horario_dt.isoformat(),
            "tecnico": "A definir",
            "urgente": urgente,
            "status": "confirmado",
            "origem": "clientechat_v4",
            # Múltiplos equipamentos
            "equipamento_2": equipamento_2 if equipamento_2 else None,
            "problema_2": problema_2 if problema_2 else None,
            "equipamento_3": equipamento_3 if equipamento_3 else None,
            "problema_3": problema_3 if problema_3 else None,
            # Tipos de atendimento
            "tipo_atendimento_1": tipo_atendimento_1,
            "tipo_atendimento_2": tipo_atendimento_2 if tipo_atendimento_2 else None,
            "tipo_atendimento_3": tipo_atendimento_3 if tipo_atendimento_3 else None,
            # Valores
            "valor_os_1": float(valor_os_1) if valor_os_1.replace('.', '').replace(',', '').isdigit() else 0.0,
            "valor_os_2": float(valor_os_2) if valor_os_2.replace('.', '').replace(',', '').isdigit() else 0.0,
            "valor_os_3": float(valor_os_3) if valor_os_3.replace('.', '').replace(',', '').isdigit() else 0.0
        }

        response = supabase.table("agendamentos_ai").insert(agendamento_data).execute()

        if not response.data:
            raise Exception("Erro ao criar agendamento")

        agendamento_id = response.data[0]["id"]

        # Resposta de confirmação com informações de múltiplos equipamentos
        mensagem = f"✅ *Agendamento Confirmado V4.0!*\n\n"
        mensagem += f"📋 *ID:* #{agendamento_id}\n"
        mensagem += f"👤 *Cliente:* {nome}\n"
        mensagem += f"📍 *Endereço:* {endereco}\n"
        mensagem += f"📅 *Data:* {horario_dt.strftime('%d/%m/%Y')}\n"
        mensagem += f"⏰ *Horário:* {horario_dt.strftime('%H:%M')}\n\n"

        # Listar equipamentos e seus tipos de atendimento
        equipamentos_info = []

        # Equipamento 1
        if equipamento:
            info = f"🔧 *{equipamento}*\n"
            if tipo_atendimento_1 == "coleta_diagnostico":
                info += f"   🔍 Coleta para Diagnóstico - R$ 350,00\n"
                info += f"   ⏱️ Diagnóstico em até 2 dias úteis\n"
            elif tipo_atendimento_1 == "coleta_conserto":
                info += f"   🔧 Coleta para Conserto\n"
                if float(valor_os_1) > 0:
                    info += f"   💰 R$ {float(valor_os_1):.2f} (50% coleta + 50% entrega)\n"
                info += f"   ⏱️ Conserto em até 7 dias úteis\n"
            elif tipo_atendimento_1 == "em_domicilio":
                info += f"   🏠 Atendimento em Domicílio\n"
                if float(valor_os_1) > 0:
                    info += f"   💰 R$ {float(valor_os_1):.2f} (pago na conclusão)\n"
                info += f"   ⏱️ Mesmo dia ou próximo dia útil\n"
            equipamentos_info.append(info)

        # Equipamento 2
        if equipamento_2:
            info = f"🔧 *{equipamento_2}*\n"
            if tipo_atendimento_2 == "coleta_diagnostico":
                info += f"   🔍 Coleta para Diagnóstico - R$ 350,00\n"
                info += f"   ⏱️ Diagnóstico em até 2 dias úteis\n"
            elif tipo_atendimento_2 == "coleta_conserto":
                info += f"   🔧 Coleta para Conserto\n"
                if float(valor_os_2) > 0:
                    info += f"   💰 R$ {float(valor_os_2):.2f} (50% coleta + 50% entrega)\n"
                info += f"   ⏱️ Conserto em até 7 dias úteis\n"
            elif tipo_atendimento_2 == "em_domicilio":
                info += f"   🏠 Atendimento em Domicílio\n"
                if float(valor_os_2) > 0:
                    info += f"   💰 R$ {float(valor_os_2):.2f} (pago na conclusão)\n"
                info += f"   ⏱️ Mesmo dia ou próximo dia útil\n"
            equipamentos_info.append(info)

        # Equipamento 3
        if equipamento_3:
            info = f"🔧 *{equipamento_3}*\n"
            if tipo_atendimento_3 == "coleta_diagnostico":
                info += f"   🔍 Coleta para Diagnóstico - R$ 350,00\n"
                info += f"   ⏱️ Diagnóstico em até 2 dias úteis\n"
            elif tipo_atendimento_3 == "coleta_conserto":
                info += f"   🔧 Coleta para Conserto\n"
                if float(valor_os_3) > 0:
                    info += f"   💰 R$ {float(valor_os_3):.2f} (50% coleta + 50% entrega)\n"
                info += f"   ⏱️ Conserto em até 7 dias úteis\n"
            elif tipo_atendimento_3 == "em_domicilio":
                info += f"   🏠 Atendimento em Domicílio\n"
                if float(valor_os_3) > 0:
                    info += f"   💰 R$ {float(valor_os_3):.2f} (pago na conclusão)\n"
                info += f"   ⏱️ Mesmo dia ou próximo dia útil\n"
            equipamentos_info.append(info)

        # Adicionar informações dos equipamentos
        mensagem += "\n".join(equipamentos_info)

        mensagem += f"\n📱 *Contato:* (48) 98833-2664\n"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
