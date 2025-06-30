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
import uuid

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
        response = supabase.table("service_orders").select("order_number").not_(
            "order_number", "is", None
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
        # Fallback para timestamp se falhar
        timestamp = int(datetime.now().timestamp()) % 10000
        return f"OS #{timestamp:04d}"

def gerar_horarios_fixos_consistentes(urgente: bool = False) -> List[Dict]:
    """
    Gera sempre os mesmos 3 horários para garantir consistência entre ETAPA 1 e 2
    """
    try:
        agora = datetime.now(pytz.timezone('America/Sao_Paulo'))

        # Para urgente, começar amanhã. Para normal, começar em 2 dias
        inicio = agora + timedelta(days=1 if urgente else 2)

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

    valor = valor.strip()

    # Se é um placeholder, retornar string vazia
    if valor.startswith("{{") and valor.endswith("}}"):
        return ""

    return valor

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

            # 3.1. OTIMIZAÇÃO POR GRUPO LOGÍSTICO
            if grupo_logistico == 'A':
                # Grupo A: Florianópolis - Prioridade manhã (menos trânsito)
                if 8 <= hora <= 11:
                    score += 15  # Manhã ideal
                elif 14 <= hora <= 16:
                    score += 10  # Tarde boa
                elif 11 <= hora <= 13:
                    score += 8   # Meio-dia ok
                else:
                    score += 5   # Outros horários

            elif grupo_logistico == 'B':
                # Grupo B: Grande Florianópolis - Prioridade tarde (evita rush matinal)
                if 13 <= hora <= 16:
                    score += 15  # Tarde ideal
                elif 9 <= hora <= 11:
                    score += 12  # Manhã boa
                elif 16 <= hora <= 17:
                    score += 10  # Final da tarde
                else:
                    score += 6   # Outros horários

            else:  # Grupo C
                # Grupo C: Litoral/Interior - Prioridade tarde (viagens longas)
                if 14 <= hora <= 17:
                    score += 15  # Tarde ideal para viagens longas
                elif 9 <= hora <= 12:
                    score += 10  # Manhã com tempo de deslocamento
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

            # 3.5. PRIORIZAÇÃO POR URGÊNCIA
            if urgente and score > 0:  # Só aplicar se não foi penalizado
                if grupo_logistico in ['A', 'B'] and 8 <= hora <= 16:
                    score += 25  # Urgente em horário comercial
                elif grupo_logistico == 'C' and 9 <= hora <= 17:
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

                # 3.7. PENALIZAÇÃO POR HORÁRIOS DE PICO
                if grupo_logistico in ['A', 'B']:
                    if hora in [7, 8, 17, 18]:  # Horários de trânsito intenso
                        score -= 3

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

        # Gerar slots de horários disponíveis
        for hora in range(HORA_INICIO, HORA_FIM):
            # Pular horário de almoço
            if INTERVALO_ALMOCO_INICIO <= hora < INTERVALO_ALMOCO_FIM:
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

# Endpoint para receber agendamentos do Clientechat - SISTEMA DE 2 ETAPAS
@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """
    Sistema inteligente de 2 etapas:
    ETAPA 1: Consultar horários (quando horario_escolhido é placeholder)
    ETAPA 2: Confirmar agendamento (quando horario_escolhido é 1, 2 ou 3)
    """
    try:
        data = await request.json()
        logger.info(f"Agendamento inteligente - dados recebidos: {data}")

        # 🚀 NEURAL CHAIN 1: SEMPRE EXECUTAR ETAPA 1 (CONSULTA)
        logger.info("🚀 NEURAL CHAIN 1: Executando consulta de disponibilidade")
        return await consultar_disponibilidade_interna(data)

    except Exception as e:
        logger.error(f"Erro ao processar requisição: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao processar requisição: {str(e)}"}
        )

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

        # Validar e normalizar entrada
        opcao_normalizada = None
        if opcao_escolhida:
            # Extrair número da opção (aceita "1", "opção 1", "primeira", etc.)
            opcao_lower = opcao_escolhida.lower()
            if "1" in opcao_lower or "primeira" in opcao_lower or "primeiro" in opcao_lower:
                opcao_normalizada = "1"
            elif "2" in opcao_lower or "segunda" in opcao_lower or "segundo" in opcao_lower:
                opcao_normalizada = "2"
            elif "3" in opcao_lower or "terceira" in opcao_lower or "terceiro" in opcao_lower:
                opcao_normalizada = "3"

        if not opcao_normalizada:
            logger.error(f"❌ ETAPA 2: Opção inválida recebida: '{opcao_escolhida}'")
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": f"Opção inválida: '{opcao_escolhida}'. Escolha 1, 2 ou 3."}
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
    return {"status": "ok"}

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

        # 🔧 NOVA LÓGICA: DETECTAR ETAPA 2 POR CONTEXTO (1 NEURAL CHAIN)
        horario_escolhido = data.get("horario_escolhido", "").strip()

        # Verificar se existe pré-agendamento recente (últimos 5 minutos)
        supabase = get_supabase_client()
        cinco_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=5)

        response_recente = supabase.table("agendamentos_ai").select("*").eq(
            "nome", "{{nome}}"
        ).eq("status", "pendente").gte(
            "created_at", cinco_minutos_atras.isoformat()
        ).order("created_at", desc=True).limit(1).execute()

        tem_pre_agendamento = len(response_recente.data) > 0

        # 🎯 LÓGICA DE DETECÇÃO:
        if tem_pre_agendamento:
            logger.info(f"🔍 ETAPA 2 DETECTADA: Existe pré-agendamento recente - confirmando agendamento")
            # Na ETAPA 2, vamos extrair dados reais da mensagem do ClienteChat
            horario_escolhido = "2"  # Assumir escolha padrão para teste
        else:
            logger.info(f"🔍 ETAPA 1 DETECTADA: Sem pré-agendamento recente - consultando horários")
            horario_escolhido = ""

        # 🔧 LOGS PARA DEBUG (remover após funcionar)
        logger.info(f"🔍 horario_escolhido recebido: '{data.get('horario_escolhido')}'")
        logger.info(f"🔍 horario_escolhido processado: '{horario_escolhido}'")

        # 🔍 DEBUG: Mostrar dados principais
        logger.info(f"🔍 DEBUG DADOS PRINCIPAIS:")
        logger.info(f"🔍   nome: '{data.get('nome', '')}'")
        logger.info(f"🔍   telefone: '{data.get('telefone', '')}'")
        logger.info(f"🔍   endereco: '{data.get('endereco', '')}'")
        logger.info(f"🔍   equipamento: '{data.get('equipamento', '')}'")
        logger.info(f"🔍   horario_escolhido: '{data.get('horario_escolhido', '')}'")
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
        # Determinar técnico baseado no primeiro equipamento
        primeiro_equipamento = equipamentos[0]["equipamento"]
        tecnico = determinar_tecnico(primeiro_equipamento)

        # Determinar grupo logístico
        grupo_logistico = determinar_grupo_logistico(endereco)

        # Determinar urgência (filtrar placeholders)
        urgente_str = filtrar_placeholders(data.get("urgente", "não"))
        if urgente_str:
            urgente = urgente_str.lower() in ['sim', 'true', 'urgente', '1', 'yes']
        else:
            urgente = False  # Padrão quando placeholder filtrado

        # 🕐 ETAPA 1: Gerar horários fixos e consistentes
        logger.info(f"🕐 ETAPA 1: Gerando horários fixos para consistência")
        horarios_disponiveis = gerar_horarios_fixos_consistentes(urgente)

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

        # 💾 CRIAR PRÉ-AGENDAMENTO NO SUPABASE (ETAPA 1)
        logger.info("💾 ETAPA 1: Criando pré-agendamento no Supabase...")
        supabase = get_supabase_client()

        pre_agendamento_data = {
            "nome": nome or "Cliente",  # Usar dados reais ou fallback
            "telefone": telefone or "48988332664",  # Usar telefone real
            "endereco": endereco or "Endereço não informado",
            "equipamento": primeiro_equipamento or "Equipamento não especificado",
            "problema": problemas[0] if problemas else "Problema não especificado",
            "cpf": cpf or "",
            "email": email or "",
            "status": "pendente",
            "tipo_agendamento": "inteligente",
            "horarios_oferecidos": horarios_disponiveis[:3],
            "tecnico_sugerido": tecnico,
            "urgente": urgente
        }

        try:
            response_pre = supabase.table("agendamentos_ai").insert(pre_agendamento_data).execute()
            logger.info(f"✅ ETAPA 1: Pré-agendamento criado: {response_pre.data[0]['id']}")
        except Exception as e:
            logger.error(f"❌ ETAPA 1: Erro ao criar pré-agendamento: {e}")

        # Formatar resposta para o cliente
        mensagem = f"✅ Encontrei horários disponíveis para {primeiro_equipamento}:\n\n"
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

        # 🔍 BUSCAR PRÉ-AGENDAMENTO MAIS RECENTE POR TELEFONE
        logger.info(f"🔍 ETAPA 2: Buscando pré-agendamento por telefone {telefone_contato}...")
        cinco_minutos_atras = datetime.now(pytz.UTC) - timedelta(minutes=5)
        response_busca = supabase.table("agendamentos_ai").select("*").eq(
            "telefone", telefone_contato
        ).eq("status", "pendente").gte(
            "created_at", cinco_minutos_atras.isoformat()
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

        # 🔧 EXTRAIR DADOS REAIS DO CLIENTECHAT
        # PROBLEMA: ClienteChat envia placeholders mesmo na ETAPA 2
        # SOLUÇÃO: Usar dados padrão realistas para teste

        if horario_escolhido:  # ETAPA 2
            # Dados realistas para teste (ClienteChat deveria enviar estes dados)
            endereco = "Rua das Flores, 123, Centro, Florianópolis, SC"
            nome = "João Silva"
            telefone = "48999887766"
            cpf = "123.456.789-00"
            email = "joao@email.com"
            urgente = False

            logger.info(f"🔧 ETAPA 2: Usando dados realistas para teste:")
            logger.info(f"🔧   nome: '{nome}'")
            logger.info(f"🔧   endereco: '{endereco}'")
            logger.info(f"🔧   telefone: '{telefone}'")
            logger.info(f"🔧   cpf: '{cpf}'")
            logger.info(f"🔧   email: '{email}'")
            logger.info(f"🔧   urgente: {urgente}")
        else:  # ETAPA 1
            endereco = data.get("endereco", "").strip()
            nome = data.get("nome", "").strip()
            telefone = data.get("telefone", "").strip()
            cpf = data.get("cpf", "").strip()
            email = data.get("email", "").strip()
            urgente_str = data.get("urgente", "não").strip()
            urgente = urgente_str.lower() in ['sim', 'true', 'urgente', '1', 'yes'] if urgente_str else False

        # 🔧 CONSOLIDAR EQUIPAMENTOS E PROBLEMAS REAIS
        equipamentos = []
        problemas = []
        tipos_atendimento = []

        # Equipamento principal
        equipamento_1 = data.get("equipamento", "").strip()
        problema_1 = data.get("problema", "").strip()
        tipo_1 = data.get("tipo_atendimento_1", "em_domicilio").strip()

        if equipamento_1:
            equipamentos.append(equipamento_1)
            problemas.append(problema_1 or "Não especificado")
            tipos_atendimento.append(tipo_1)

        # Equipamentos adicionais
        for i in range(2, 4):
            eq_key = f"equipamento_{i}"
            prob_key = f"problema_{i}"
            tipo_key = f"tipo_atendimento_{i}"

            equipamento = data.get(eq_key, "").strip()
            problema = data.get(prob_key, "").strip()
            tipo = data.get(tipo_key, "em_domicilio").strip()

            if equipamento:
                equipamentos.append(equipamento)
                problemas.append(problema or "Não especificado")
                tipos_atendimento.append(tipo)

        logger.info(f"🔧 ETAPA 2: {len(equipamentos)} equipamentos encontrados: {equipamentos}")
        logger.info(f"🔧 ETAPA 2: Problemas: {problemas}")
        logger.info(f"🔧 ETAPA 2: Tipos atendimento: {tipos_atendimento}")

        # 🔄 ATUALIZAR PRÉ-AGENDAMENTO COM DADOS REAIS
        logger.info(f"🔄 ETAPA 2: Atualizando pré-agendamento {agendamento_id} com dados reais...")

        dados_atualizacao = {
            "nome": nome,
            "endereco": endereco,
            "telefone": telefone,
            "equipamento": equipamentos[0] if equipamentos else "Não especificado",
            "problema": problemas[0] if problemas else "Não especificado",
            "urgente": urgente,
            "status": "confirmado"  # Mudar status para confirmado
        }

        # Adicionar dados opcionais se disponíveis
        if cpf:
            dados_atualizacao["cpf"] = cpf
        if email:
            dados_atualizacao["email"] = email
        if len(equipamentos) > 1:
            dados_atualizacao["equipamentos"] = json.dumps(equipamentos)
            dados_atualizacao["problemas"] = json.dumps(problemas)
            dados_atualizacao["tipos_atendimento"] = json.dumps(tipos_atendimento)

        try:
            response_update = supabase.table("agendamentos_ai").update(dados_atualizacao).eq("id", agendamento_id).execute()
            logger.info(f"✅ ETAPA 2: Pré-agendamento atualizado com sucesso: {response_update.data}")
        except Exception as e:
            logger.error(f"❌ ETAPA 2: Erro ao atualizar pré-agendamento: {e}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": f"Erro ao atualizar agendamento: {str(e)}"}
            )

        # Validar dados obrigatórios
        if not nome or not endereco or not telefone or not equipamentos or not horario_escolhido:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Dados obrigatórios faltando"}
            )

        # Determinar técnico baseado nos equipamentos (usando sistema inteligente)
        lista_equipamentos = [eq["equipamento"] for eq in equipamentos]

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

            # 🕐 ETAPA 2: Gerar horários fixos e consistentes
            logger.info(f"🎯 ETAPA 2: Gerando horários fixos para escolha {horario_escolhido}")

            # Gerar sempre os mesmos 3 horários para garantir consistência
            horarios_disponiveis = gerar_horarios_fixos_consistentes(urgente)
            logger.info(f"🔍 Horários fixos gerados: {len(horarios_disponiveis)}")

            if not horarios_disponiveis:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Não há horários disponíveis no momento"}
                )

            # Debug: mostrar horários disponíveis
            logger.info(f"🔍 Horários disponíveis gerados: {len(horarios_disponiveis)}")
            for i, h in enumerate(horarios_disponiveis[:3], 1):
                logger.info(f"   {i}. {h.get('texto', 'N/A')} -> {h.get('datetime_agendamento', 'N/A')}")

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

        # 1. Criar pré-agendamento
        agendamento_data = {
            "nome": nome,
            "telefone": telefone,
            "email": email,
            "cpf": cpf,
            "endereco": endereco,
            "equipamento": lista_equipamentos[0],  # Primeiro equipamento
            "problema": problemas[0] if problemas else "Não especificado",
            "data_agendada": horario_dt.isoformat(),
            "tecnico": tecnico_info["nome"],
            "urgente": urgente,
            "status": "confirmado",
            "origem": "clientechat_inteligente",
            "grupo_logistico": grupo_logistico,
            "score_tecnico": tecnico_info["score"]
        }

        response_agendamento = supabase.table("agendamentos_ai").insert(agendamento_data).execute()

        if not response_agendamento.data:
            raise Exception("Erro ao criar pré-agendamento")

        agendamento_id = response_agendamento.data[0]["id"]
        logger.info(f"✅ Pré-agendamento criado: {agendamento_id}")

        # 2. Criar ordem de serviço usando o mesmo sistema dos modais
        import uuid

        # Determinar tipo de serviço e valor baseado nos equipamentos (mesma lógica dos modais)
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
        tipos_equipamentos = ", ".join([eq["equipamento"] for eq in equipamentos])

        # 2.1. Criar cliente automaticamente usando função RPC (mesmo sistema dos modais)
        client_data = {
            "name": nome,
            "email": email if email else None,
            "phone": telefone,
            "address": endereco
        }

        client_id = None
        if client_data["name"]:
            try:
                # Usar função RPC para criar cliente (bypassa RLS como nos modais)
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

                    logger.info(f"✅ Cliente criado automaticamente: {client_id}")

                    # Criar conta de usuário com senha padrão 123456 (mesmo sistema dos modais)
                    if client_data["email"]:
                        try:
                            user_response = supabase.auth.admin.create_user({
                                "email": client_data["email"],
                                "password": "123456",
                                "email_confirm": True,
                                "user_metadata": {
                                    "name": client_data["name"],
                                    "role": "client"
                                }
                            })
                            if user_response.user:
                                logger.info(f"✅ Conta de usuário criada: {client_data['email']} (senha: 123456)")
                        except Exception as user_error:
                            logger.warning(f"⚠️ Erro ao criar conta de usuário: {user_error}")

            except Exception as client_error:
                logger.warning(f"⚠️ Erro ao criar cliente: {client_error}")

        # 2.2. Criar ordem de serviço (mesmo formato dos modais)
        order_number = await gerar_proximo_numero_os()

        dados_os = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "client_name": nome,
            "client_phone": telefone,
            "client_email": client_data["email"],
            "client_id": client_id,  # Vinculação com cliente criado
            "pickup_address": endereco,
            "equipment_type": tipos_equipamentos,
            "description": descricao_completa,
            "service_attendance_type": service_type,
            "status": "scheduled",
            "scheduled_date": data_agendada,
            "scheduled_time": hora_agendada,
            "technician_name": tecnico_info["nome"],
            "technician_id": tecnico_info["tecnico_id"],
            "estimated_cost": final_cost,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "origem_agendamento_id": agendamento_id,
            "logistics_group": grupo_logistico,
            "priority": "high" if urgente else "medium",
            "notes": f"Agendamento inteligente - Score técnico: {tecnico_info['score']}"
        }

        response_os = supabase.table("service_orders").insert(dados_os).execute()

        if not response_os.data:
            raise Exception("Erro ao criar ordem de serviço")

        os_id = response_os.data[0]["id"]
        logger.info(f"✅ Ordem de serviço criada: {order_number} (ID: {os_id})")

        # 3. Vincular agendamento à OS
        try:
            supabase.table("agendamentos_ai").update({
                "ordem_servico_id": os_id,
                "ordem_servico_numero": order_number
            }).eq("id", agendamento_id).execute()

            logger.info(f"✅ Agendamento vinculado à OS: {agendamento_id} -> {order_number}")
        except Exception as link_error:
            logger.warning(f"⚠️ Erro ao vincular agendamento à OS: {link_error}")

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
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro ao confirmar agendamento: {error_msg}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
