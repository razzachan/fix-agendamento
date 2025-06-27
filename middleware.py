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

# Configurações de roteirização inteligente
FLORIANOPOLIS_CENTER = [-48.5554, -27.5969]  # Coordenadas do centro de referência
GROUP_A_RADIUS = 10  # Até 10km do centro
GROUP_B_RADIUS = 25  # Entre 10km e 25km do centro
# Grupo C: Acima de 25km do centro

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

        async with httpx.AsyncClient() as client:
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
    urgente: bool
) -> List[Dict[str, Any]]:
    """
    Obtém horários disponíveis otimizados por grupo logístico
    """
    # Usar a função original como base
    horarios_base = await obter_horarios_disponiveis(data_inicio, dias)

    # Aplicar otimizações baseadas no grupo logístico
    horarios_otimizados = []

    for horario in horarios_base:
        # Calcular prioridade baseada no grupo logístico
        prioridade = 0

        if grupo_logistico == 'A':
            # Grupo A: Prioridade para horários da manhã (mais próximo do centro)
            hora = int(horario['hora_inicio'].split(':')[0])
            if 8 <= hora <= 12:
                prioridade += 10
            elif 13 <= hora <= 15:
                prioridade += 5
        elif grupo_logistico == 'B':
            # Grupo B: Prioridade para horários da tarde
            hora = int(horario['hora_inicio'].split(':')[0])
            if 13 <= hora <= 16:
                prioridade += 10
            elif 8 <= hora <= 12:
                prioridade += 5
        else:  # Grupo C
            # Grupo C: Prioridade para horários mais tardios (viagens longas)
            hora = int(horario['hora_inicio'].split(':')[0])
            if 14 <= hora <= 17:
                prioridade += 10
            elif 8 <= hora <= 13:
                prioridade += 3

        # Bonus para urgente
        if urgente:
            prioridade += 20

        horario['prioridade'] = prioridade
        horarios_otimizados.append(horario)

    # Ordenar por prioridade (maior primeiro)
    horarios_otimizados.sort(key=lambda x: x['prioridade'], reverse=True)

    # Log da otimização
    logger.info(f"🎯 Horários otimizados para grupo {grupo_logistico}: {len(horarios_otimizados)} opções")

    return horarios_otimizados

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
        horarios = await obter_horarios_disponiveis_otimizados(data_inicio, dias_busca, grupo_logistico, urgente)

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

            # Emoji do grupo logístico
            grupo_emoji = {"A": "🏢", "B": "🏘️", "C": "🌄"}

            mensagem = f"🔧 *Agendamento para {nome or 'Cliente'}*\n"
            mensagem += f"📍 {endereco}\n"
            mensagem += f"⚙️ {resumo_equipamentos}\n"
            mensagem += f"{grupo_emoji.get(grupo_logistico, '📍')} *Região: Grupo {grupo_logistico}*\n"
            if coordenadas:
                distancia = calculate_distance(FLORIANOPOLIS_CENTER, coordenadas)
                mensagem += f"📏 Distância: {distancia:.1f}km do centro\n"
            if urgente:
                mensagem += f"🚨 *URGENTE*\n"

            # Informações do técnico selecionado
            mensagem += f"\n👨‍🔧 *Técnico Selecionado:* {tecnico_info['nome']}\n"
            mensagem += f"🎯 *Especialidades:* {', '.join(tecnico_info['especialidades'][:3])}\n"
            mensagem += f"⭐ *Score de Compatibilidade:* {tecnico_info['score']}/100\n"
            mensagem += f"📞 *Contato:* {tecnico_info['telefone']}\n"

            mensagem += f"\n🗓️ *Horários Otimizados*\n\n"

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
                "roteirização": {
                    "grupo_logistico": grupo_logistico,
                    "coordenadas": coordenadas,
                    "distancia_centro": calculate_distance(FLORIANOPOLIS_CENTER, coordenadas) if coordenadas else None,
                    "otimizado": True
                },
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

        # DETECTAR QUAL ETAPA EXECUTAR
        horario_escolhido = data.get("horario_escolhido", "").strip()

        if not horario_escolhido:
            # ETAPA 1: CONSULTAR DISPONIBILIDADE
            logger.info("Executando ETAPA 1: Consulta de disponibilidade")
            return await consultar_disponibilidade_interna(data)
        else:
            # ETAPA 2: CONFIRMAR AGENDAMENTO
            logger.info("Executando ETAPA 2: Confirmação de agendamento")
            return await confirmar_agendamento_final(data)

    except Exception as e:
        logger.error(f"Erro no agendamento inteligente: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro interno: {str(e)}"}
        )

# Função interna para consulta de disponibilidade
async def consultar_disponibilidade_interna(data: dict):
    try:
        # Extrair dados básicos
        endereco = data.get("endereco", "").strip()
        nome = data.get("nome", "").strip()
        telefone = data.get("telefone", "").strip()
        cpf = data.get("cpf", "").strip()
        email = data.get("email", "").strip()

        # Consolidar equipamentos
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
        if not equipamentos:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Pelo menos um equipamento deve ser informado"}
            )
        if not horario_escolhido:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Horário escolhido é obrigatório"}
            )

        # Determinar técnico baseado no primeiro equipamento
        primeiro_equipamento = equipamentos[0]["equipamento"]
        tecnico = determinar_tecnico(primeiro_equipamento)

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

        # Determinar urgência
        urgente = data.get("urgente", "não")
        if isinstance(urgente, str):
            urgente = urgente.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        elif isinstance(urgente, bool):
            urgente = urgente
        else:
            urgente = False

        supabase = get_supabase_client()

        # 1. Criar pré-agendamento
        dados_agendamento = {
            "nome": nome,
            "endereco": endereco,
            "equipamento": primeiro_equipamento,  # Equipamento principal
            "problema": problemas[0] if problemas else "Não especificado",  # Problema principal
            "urgente": urgente,
            "status": "confirmado",
            "telefone": telefone,
            "cpf": data.get("cpf", ""),
            "email": data.get("email", ""),
            "origem": "clientechat_inteligente",
            "tecnico": tecnico,
            "data_agendada": horario_dt.isoformat(),
            "equipamentos": json.dumps([eq["equipamento"] for eq in equipamentos]),
            "problemas": json.dumps(problemas),
            "tipos_atendimento": json.dumps(["em_domicilio"]),
            "tipos_equipamentos": json.dumps([eq["tipo"] for eq in equipamentos])
        }

        response_agendamento = supabase.table("agendamentos_ai").insert(dados_agendamento).execute()

        if not response_agendamento.data:
            raise Exception("Erro ao criar pré-agendamento")

        agendamento_id = response_agendamento.data[0]["id"]

        # 2. Criar ordem de serviço automaticamente
        import uuid
        order_number = f"OS-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

        # Determinar tipo de serviço e valor baseado nos equipamentos
        service_type = "em_domicilio"
        final_cost = 120.00  # Valor padrão

        # Ajustar valor baseado nos equipamentos
        for eq in equipamentos:
            if "coifa" in eq["equipamento"].lower():
                final_cost = max(final_cost, 150.00)
            elif "forno" in eq["equipamento"].lower():
                final_cost = max(final_cost, 130.00)

        # Se múltiplos equipamentos, adicionar taxa
        if len(equipamentos) > 1:
            final_cost += (len(equipamentos) - 1) * 30.00

        # Consolidar descrição dos problemas
        descricao_completa = " | ".join(problemas) if problemas else "Não especificado"

        # Consolidar tipos de equipamentos
        tipos_equipamentos = ", ".join([eq["equipamento"] for eq in equipamentos])

        dados_os = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "client_name": nome,
            "client_phone": telefone,
            "client_email": data.get("email", ""),
            "address": endereco,
            "equipment_type": tipos_equipamentos,
            "problem_description": descricao_completa,
            "service_type": service_type,
            "status": "agendado",
            "scheduled_date": data_agendada,
            "scheduled_time": hora_agendada,
            "technician_name": tecnico.split('(')[0].strip(),
            "final_cost": final_cost,
            "created_at": datetime.now().isoformat(),
            "agendamento_origem_id": agendamento_id,
            "urgente": urgente
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
        mensagem += f"👤 *Cliente:* {nome}\n"
        mensagem += f"📍 *Endereço:* {endereco}\n"
        mensagem += f"🔧 *Equipamento(s):* {tipos_equipamentos}\n"
        if len(problemas) > 0:
            mensagem += f"⚠️ *Problema(s):* {descricao_completa}\n"
        mensagem += f"📅 *Data:* {horario_dt.strftime('%d/%m/%Y')}\n"
        mensagem += f"⏰ *Horário:* {hora_agendada}\n"
        mensagem += f"👨‍🔧 *Técnico:* {tecnico.split('(')[0].strip()}\n"
        if urgente:
            mensagem += f"🚨 *ATENDIMENTO URGENTE*\n"
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
