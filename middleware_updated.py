import os
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta
import pytz
import json

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Função para obter cliente Supabase
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")
        raise ValueError("Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não definidas")
    
    return create_client(url, key)

# Função para determinar técnico baseado no equipamento
def determinar_tecnico(equipamento: str) -> str:
    """Determina o técnico baseado no tipo de equipamento"""
    equipamento_lower = equipamento.lower()

    if "coifa" in equipamento_lower:
        return "Marcelo (marcelodsmoritz@gmail.com)"
    else:
        return "Paulo Cesar (betonipaulo@gmail.com)"

# Função para obter horários disponíveis
async def obter_horarios_disponiveis(data_inicio: datetime, dias: int = 5) -> List[Dict[str, Any]]:
    """Obtém horários disponíveis dos técnicos nos próximos dias"""
    supabase = get_supabase_client()
    horarios_disponiveis = []

    # Configuração de horários de trabalho
    HORA_INICIO = 8  # 8h
    HORA_FIM = 18    # 18h
    INTERVALO_ALMOCO_INICIO = 12  # 12h
    INTERVALO_ALMOCO_FIM = 13     # 13h

    # Timezone do Brasil
    tz_brasil = pytz.timezone('America/Sao_Paulo')

    for i in range(dias):
        data_atual = data_inicio + timedelta(days=i)

        # Pular fins de semana
        if data_atual.weekday() >= 5:  # 5=sábado, 6=domingo
            continue

        # Buscar agendamentos existentes para esta data
        data_str = data_atual.strftime('%Y-%m-%d')

        try:
            # Buscar agendamentos AI
            response_ai = supabase.table("agendamentos_ai").select("*").gte("data_agendada", f"{data_str}T00:00:00").lt("data_agendada", f"{data_str}T23:59:59").execute()
            agendamentos_ai = response_ai.data if response_ai.data else []

            # Buscar ordens de serviço
            response_os = supabase.table("service_orders").select("*").eq("scheduled_date", data_str).execute()
            ordens_servico = response_os.data if response_os.data else []

        except Exception as e:
            logger.error(f"Erro ao buscar agendamentos para {data_str}: {e}")
            agendamentos_ai = []
            ordens_servico = []

        # Gerar slots de horários disponíveis
        for hora in range(HORA_INICIO, HORA_FIM):
            # Pular horário de almoço
            if INTERVALO_ALMOCO_INICIO <= hora < INTERVALO_ALMOCO_FIM:
                continue

            horario_inicio = data_atual.replace(hour=hora, minute=0, second=0, microsecond=0)
            horario_fim = horario_inicio + timedelta(hours=2)  # Slots de 2 horas

            # Verificar se há conflitos
            conflito = False

            # Verificar agendamentos AI
            for ag in agendamentos_ai:
                if ag.get('data_agendada'):
                    try:
                        data_ag = datetime.fromisoformat(ag['data_agendada'].replace('Z', '+00:00'))
                        if horario_inicio <= data_ag < horario_fim:
                            conflito = True
                            break
                    except:
                        continue

            # Verificar ordens de serviço
            if not conflito:
                for os in ordens_servico:
                    if os.get('scheduled_time'):
                        try:
                            hora_os = int(os['scheduled_time'].split(':')[0])
                            if hora <= hora_os < hora + 2:
                                conflito = True
                                break
                        except:
                            continue

            if not conflito:
                horarios_disponiveis.append({
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "hora_inicio": f"{hora:02d}:00",
                    "hora_fim": f"{hora+2:02d}:00",
                    "datetime": horario_inicio.isoformat(),
                    "data_formatada": data_atual.strftime('%d/%m/%Y'),
                    "dia_semana": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"][data_atual.weekday()]
                })

    return horarios_disponiveis

# Função para inserir agendamento no Supabase
async def inserir_agendamento(agendamento: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase_client()
    
    # Processar equipamentos, problemas e tipos de atendimento
    equipamentos = []
    problemas = []
    tipos_atendimento = []

    # Equipamento principal (sempre presente)
    if 'equipamento' in agendamento and agendamento['equipamento']:
        equipamentos.append(agendamento['equipamento'])
        problemas.append(agendamento.get('problema', 'Não especificado'))
        tipos_atendimento.append(agendamento.get('tipo_atendimento_1', 'em_domicilio'))

    # Equipamentos adicionais
    for i in range(2, 4):  # Para equipamento_2 e equipamento_3
        equip_key = f'equipamento_{i}'
        prob_key = f'problema_{i}'
        tipo_key = f'tipo_atendimento_{i}'

        if equip_key in agendamento and agendamento[equip_key]:
            equipamentos.append(agendamento[equip_key])
            problemas.append(agendamento.get(prob_key, 'Não especificado'))
            tipos_atendimento.append(agendamento.get(tipo_key, 'em_domicilio'))
    
    # Preparar dados para inserção
    dados_agendamento = {
        "nome": agendamento.get("nome", ""),
        "endereco": agendamento.get("endereco", ""),
        "equipamento": agendamento.get("equipamento", ""),
        "problema": agendamento.get("problema", ""),
        "urgente": agendamento.get("urgente", "não").lower() == "sim",
        "status": "pendente",
        "telefone": agendamento.get("telefone", ""),
        "cpf": agendamento.get("cpf", ""),
        "email": agendamento.get("email", ""),
        "origem": "clientechat",
        "equipamentos": json.dumps(equipamentos) if equipamentos else None,
        "problemas": json.dumps(problemas) if problemas else None,
        "tipos_atendimento": json.dumps(tipos_atendimento) if tipos_atendimento else None
    }
    
    logger.info(f"Inserindo agendamento: {dados_agendamento}")
    
    try:
        response = supabase.table("agendamentos_ai").insert(dados_agendamento).execute()
        logger.info(f"Agendamento inserido com sucesso: {response}")
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Erro ao inserir agendamento: {e}")
        return {"success": False, "error": str(e)}

# Endpoint para receber agendamentos do Clientechat
@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    try:
        data = await request.json()
        logger.info(f"Dados recebidos: {data}")
        
        # Validar dados
        if not data.get("nome") or not data.get("endereco") or not data.get("equipamento"):
            logger.error("Dados incompletos")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Dados incompletos"}
            )
        
        # Inserir agendamento
        resultado = await inserir_agendamento(data)
        
        if resultado["success"]:
            return JSONResponse(
                status_code=200,
                content={"success": True, "message": "Agendamento recebido com sucesso"}
            )
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Erro ao processar agendamento: {resultado.get('error')}"}
            )
    
    except Exception as e:
        logger.error(f"Erro ao processar requisição: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar requisição: {str(e)}"}
        )

# Endpoint para verificar saúde da API
@app.get("/health")
async def health_check():
    return {"status": "ok"}

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

        # Validar dados básicos
        if not data.get("endereco") or not data.get("equipamento"):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Endereço e equipamento são obrigatórios"}
            )

        urgente = data.get("urgente", "não").lower() == "sim"
        data_preferida = data.get("data_preferida")

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

        # Obter horários disponíveis
        horarios = await obter_horarios_disponiveis(data_inicio, dias_busca)

        # Limitar a 3 melhores opções
        melhores_horarios = horarios[:3]

        # Determinar técnico
        tecnico = determinar_tecnico(data.get("equipamento", ""))

        # Formatar resposta
        if not melhores_horarios:
            mensagem = "Não encontrei horários disponíveis para os próximos dias. Entre em contato pelo telefone (48) 98833-2664 para agendarmos manualmente."
        else:
            mensagem = f"🗓️ *Horários Disponíveis* (Técnico: {tecnico.split('(')[0].strip()})\n\n"

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
                "urgente": urgente
            }
        )

    except Exception as e:
        logger.error(f"Erro ao consultar disponibilidade: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro interno: {str(e)}"}
        )

# Endpoint para agendamento inteligente (criação de OS)
@app.post("/agendamento-inteligente-completo")
async def agendamento_inteligente_completo(request: Request):
    try:
        data = await request.json()
        logger.info(f"Criando agendamento inteligente: {data}")

        # Validar dados
        campos_obrigatorios = ["nome", "endereco", "equipamento", "problema", "telefone", "horario_escolhido"]
        for campo in campos_obrigatorios:
            if not data.get(campo):
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": f"Campo obrigatório: {campo}"}
                )

        # Determinar técnico
        tecnico = determinar_tecnico(data.get("equipamento", ""))

        # Processar horário escolhido
        try:
            horario_dt = datetime.fromisoformat(data["horario_escolhido"])
            data_agendada = horario_dt.strftime('%Y-%m-%d')
            hora_agendada = horario_dt.strftime('%H:%M')
        except:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Formato de horário inválido"}
            )

        supabase = get_supabase_client()

        # 1. Criar pré-agendamento
        dados_agendamento = {
            "nome": data["nome"],
            "endereco": data["endereco"],
            "equipamento": data["equipamento"],
            "problema": data["problema"],
            "urgente": data.get("urgente", "não").lower() == "sim",
            "status": "confirmado",
            "telefone": data["telefone"],
            "cpf": data.get("cpf", ""),
            "email": data.get("email", ""),
            "origem": "clientechat_inteligente",
            "tecnico": tecnico,
            "data_agendada": horario_dt.isoformat(),
            "equipamentos": json.dumps([data["equipamento"]]),
            "problemas": json.dumps([data["problema"]]),
            "tipos_atendimento": json.dumps(["em_domicilio"])
        }

        response_agendamento = supabase.table("agendamentos_ai").insert(dados_agendamento).execute()

        if not response_agendamento.data:
            raise Exception("Erro ao criar pré-agendamento")

        agendamento_id = response_agendamento.data[0]["id"]

        # 2. Criar ordem de serviço automaticamente
        import uuid
        order_number = f"OS-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

        # Determinar tipo de serviço e valor
        if "coifa" in data["equipamento"].lower():
            service_type = "em_domicilio"
            final_cost = 150.00  # Valor padrão para coifas
        else:
            service_type = "em_domicilio"
            final_cost = 120.00  # Valor padrão para outros equipamentos

        dados_os = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "client_name": data["nome"],
            "client_phone": data["telefone"],
            "client_email": data.get("email", ""),
            "address": data["endereco"],
            "equipment_type": data["equipamento"],
            "problem_description": data["problema"],
            "service_type": service_type,
            "status": "agendado",
            "scheduled_date": data_agendada,
            "scheduled_time": hora_agendada,
            "technician_name": tecnico.split('(')[0].strip(),
            "final_cost": final_cost,
            "created_at": datetime.now().isoformat(),
            "agendamento_origem_id": agendamento_id
        }

        response_os = supabase.table("service_orders").insert(dados_os).execute()

        if not response_os.data:
            raise Exception("Erro ao criar ordem de serviço")

        # 3. Atualizar agendamento com ID da OS
        supabase.table("agendamentos_ai").update({
            "ordem_servico_id": dados_os["id"],
            "status": "os_criada"
        }).eq("id", agendamento_id).execute()

        # Formatar resposta de confirmação
        mensagem = f"✅ *Agendamento Confirmado!*\n\n"
        mensagem += f"📋 *Ordem de Serviço:* {order_number}\n"
        mensagem += f"👤 *Cliente:* {data['nome']}\n"
        mensagem += f"🔧 *Equipamento:* {data['equipamento']}\n"
        mensagem += f"📅 *Data:* {horario_dt.strftime('%d/%m/%Y')}\n"
        mensagem += f"⏰ *Horário:* {hora_agendada}\n"
        mensagem += f"👨‍🔧 *Técnico:* {tecnico.split('(')[0].strip()}\n"
        mensagem += f"💰 *Valor:* R$ {final_cost:.2f}\n\n"
        mensagem += f"📱 *Contato:* (48) 98833-2664\n"
        mensagem += f"Você receberá uma confirmação por WhatsApp 1 dia antes do atendimento."

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": mensagem,
                "order_number": order_number,
                "agendamento_id": agendamento_id,
                "ordem_servico_id": dados_os["id"]
            }
        )

    except Exception as e:
        logger.error(f"Erro ao criar agendamento inteligente: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar agendamento: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
