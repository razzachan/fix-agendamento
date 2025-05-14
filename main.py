from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase_client import inserir_agendamento, get_supabase_client
import uvicorn
import logging
import sys
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env se existir
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fix Fogões Middleware",
    description="API para receber dados de agendamentos do WhatsApp e inserir no Supabase",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar arquivos estáticos
# app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    """Endpoint principal que serve a interface web"""
    return {"message": "API Fix Agendamento"}

@app.get("/api/status")
async def api_status():
    """Endpoint de verificação de saúde da API"""
    return {"status": "online", "message": "Fix Fogões Middleware está funcionando!"}

@app.post("/")
async def receber_dados(request: Request):
    """
    Recebe dados de agendamento do WhatsApp e insere no Supabase

    Payload esperado:
    {
        "nome": "Nome do Cliente",
        "endereco": "Endereço completo",
        "equipamento": "Tipo de equipamento (ex: fogão, cooktop, coifa)",
        "problema": "Descrição do problema"
    }
    """
    try:
        # Obter dados da requisição
        dados = await request.json()
        logger.info(f"Dados recebidos: {dados}")

        # Validar campos obrigatórios
        campos_obrigatorios = ["nome", "endereco", "equipamento", "problema"]
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                logger.error(f"Campo obrigatório ausente: {campo}")
                return JSONResponse(
                    status_code=400,
                    content={"mensagem": f"Campo obrigatório ausente: {campo}"}
                )

        nome = dados.get("nome")
        endereco = dados.get("endereco")
        equipamento = dados.get("equipamento")
        problema = dados.get("problema")
        urgente = dados.get("urgente", False)

        # Determinar o técnico com base no tipo de equipamento
        tecnico = "Marcelo (marcelodsmoritz@gmail.com)" if "coifa" in equipamento.lower() else "Paulo Cesar (betonipaulo@gmail.com)"

        # Inserir agendamento no Supabase
        inserido = inserir_agendamento(
            nome=nome,
            endereco=endereco,
            equipamento=equipamento,
            problema=problema,
            urgente=urgente,
            status="pendente",
            tecnico=tecnico
        )

        if inserido:
            logger.info(f"Agendamento registrado com sucesso para {nome}")
            return {
                "sucesso": True,
                "mensagem": f"Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"
            }
        else:
            logger.error(f"Falha ao registrar agendamento para {nome}")
            return JSONResponse(
                status_code=500,
                content={
                    "sucesso": False,
                    "mensagem": "Houve um erro ao registrar o agendamento. Por favor, tente novamente mais tarde."
                }
            )

    except Exception as e:
        logger.error(f"Erro ao processar requisição: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "sucesso": False,
                "mensagem": "Erro interno do servidor. Por favor, tente novamente mais tarde."
            }
        )

@app.post("/agendamento")
async def agendamento_alternativo(request: Request):
    """Endpoint alternativo para compatibilidade com configurações anteriores"""
    return await receber_dados(request)

@app.post("/agendamento-inteligente")
async def agendamento_inteligente(request: Request):
    """Endpoint para agendamento inteligente via Clientechat"""
    logger.info("Recebendo requisição no endpoint /agendamento-inteligente")

    try:
        # Registrar os headers da requisição para debug
        headers = dict(request.headers.items())
        # Remover informações sensíveis
        if 'authorization' in headers:
            headers['authorization'] = '***REDACTED***'
        if 'apikey' in headers:
            headers['apikey'] = '***REDACTED***'
        logger.info(f"Headers da requisição: {headers}")

        # Tentar ler o corpo da requisição como texto
        try:
            body = await request.body()
            # Registrar o corpo bruto em hexadecimal para debug
            logger.info(f"Corpo da requisição (hex): {body.hex()}")

            # Tentar diferentes codificações
            try:
                body_text = body.decode('utf-8')
                logger.info("Corpo decodificado com UTF-8")
            except UnicodeDecodeError:
                try:
                    body_text = body.decode('latin-1')
                    logger.info("Corpo decodificado com latin-1")
                except UnicodeDecodeError:
                    try:
                        body_text = body.decode('iso-8859-1')
                        logger.info("Corpo decodificado com iso-8859-1")
                    except UnicodeDecodeError:
                        # Último recurso: ignorar erros de codificação
                        body_text = body.decode('utf-8', errors='ignore')
                        logger.warning("Corpo decodificado com UTF-8 ignorando erros de codificação")

            logger.info(f"Corpo da requisição (raw): {body_text}")

            # Verificar se o corpo está vazio
            if not body_text.strip():
                logger.error("Corpo da requisição está vazio")
                # Criar dados de teste para desenvolvimento
                dados = {
                    "nome": "Cliente Teste (corpo vazio)",
                    "endereco": "Endereço de Teste",
                    "equipamento": "Fogão",
                    "problema": "Problema de teste - requisição com corpo vazio",
                    "urgente": False
                }
                logger.info(f"Usando dados de teste: {dados}")
            else:
                # Tentar processar o JSON manualmente
                import json
                try:
                    # Tentar processar o JSON normalmente
                    dados = json.loads(body_text)
                    logger.info(f"Dados recebidos (JSON): {dados}")
                except Exception as e:
                    logger.error(f"Erro ao processar JSON manualmente: {str(e)}")

                    # Tentar processar o JSON com codificação especial
                    try:
                        # Remover caracteres não-ASCII que podem estar causando problemas
                        import re
                        cleaned_body = re.sub(r'[^\x00-\x7F]+', ' ', body_text)
                        logger.info(f"Tentando processar JSON com corpo limpo: {cleaned_body}")
                        dados = json.loads(cleaned_body)
                        logger.info(f"Dados recebidos após limpeza: {dados}")
                    except Exception as clean_error:
                        logger.error(f"Erro ao processar JSON após limpeza: {str(clean_error)}")

                    # Tentar processar como form data
                    try:
                        from urllib.parse import parse_qs
                        form_data = parse_qs(body_text)
                        logger.info(f"Dados recebidos (form data): {form_data}")

                        # Converter form data para o formato esperado
                        dados = {}
                        for key, value in form_data.items():
                            dados[key] = value[0] if value and len(value) > 0 else ""

                        logger.info(f"Dados convertidos de form data: {dados}")
                    except Exception as form_error:
                        logger.error(f"Erro ao processar como form data: {str(form_error)}")
                        return JSONResponse(
                            status_code=400,
                            content={
                                "mensagem": f"Erro ao processar dados: {str(e)}",
                                "form_error": str(form_error),
                                "body": body_text
                            }
                        )
        except Exception as e:
            logger.error(f"Erro ao ler corpo da requisição: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"mensagem": f"Erro ao ler corpo da requisição: {str(e)}"}
            )

        # Verificar variáveis de ambiente
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        logger.info(f"SUPABASE_URL definida: {'Sim' if supabase_url else 'Não'}")
        logger.info(f"SUPABASE_KEY definida: {'Sim' if supabase_key else 'Não'}")

        # Continuar com o processamento normal
        try:
            # Validar campos obrigatórios
            campos_obrigatorios = ["nome", "endereco", "equipamento", "problema"]
            for campo in campos_obrigatorios:
                if campo not in dados or not dados[campo]:
                    logger.error(f"Campo obrigatório ausente: {campo}")
                    return JSONResponse(
                        status_code=400,
                        content={"mensagem": f"Campo obrigatório ausente: {campo}"}
                    )

            nome = dados.get("nome")
            endereco = dados.get("endereco")
            equipamento = dados.get("equipamento")
            problema = dados.get("problema")
            urgente = dados.get("urgente", False)

            # Log para debug
            logger.info(f"Dados recebidos: nome={nome}, endereco={endereco}, equipamento={equipamento}, problema={problema}, urgente={urgente} (tipo: {type(urgente).__name__})")

            # Verificar se os valores são templates não substituídos
            campos_para_verificar = {
                "nome": nome,
                "endereco": endereco,
                "equipamento": equipamento,
                "problema": problema
            }

            for campo, valor in campos_para_verificar.items():
                if valor and isinstance(valor, str) and "{{" in valor and "}}" in valor:
                    logger.warning(f"Campo '{campo}' contém template não substituído: {valor}. Rejeitando requisição.")
                    return JSONResponse(
                        status_code=400,
                        content={
                            "sucesso": False,
                            "mensagem": f"Erro: variáveis de template não substituídas no campo '{campo}'. Verifique a configuração do Clientechat."
                        }
                    )

            # Converter urgente para booleano se for string
            if isinstance(urgente, str):
                logger.info(f"Convertendo urgente de string '{urgente}' para booleano")
                urgente_bool = urgente.lower() in ['true', 'sim', 'yes', 's', 'y', '1', 'verdadeiro', 'verdade']
                logger.info(f"Resultado da conversão: {urgente_bool}")
                urgente = urgente_bool

            # Determinar o técnico com base no tipo de equipamento
            tecnico = "Marcelo (marcelodsmoritz@gmail.com)" if "coifa" in equipamento.lower() else "Paulo Cesar (betonipaulo@gmail.com)"

            # Log detalhado antes de inserir no Supabase
            logger.info("Preparando para inserir agendamento no Supabase")
            logger.info(f"Nome: {nome} (tipo: {type(nome).__name__})")
            logger.info(f"Endereço: {endereco} (tipo: {type(endereco).__name__})")
            logger.info(f"Equipamento: {equipamento} (tipo: {type(equipamento).__name__})")
            logger.info(f"Problema: {problema} (tipo: {type(problema).__name__})")
            logger.info(f"Urgente: {urgente} (tipo: {type(urgente).__name__})")
            logger.info(f"Técnico: {tecnico} (tipo: {type(tecnico).__name__})")

            # Inserir agendamento no Supabase
            try:
                inserido = inserir_agendamento(
                    nome=nome,
                    endereco=endereco,
                    equipamento=equipamento,
                    problema=problema,
                    urgente=urgente,
                    status="pendente",
                    tecnico=tecnico
                )
                logger.info(f"Resultado da inserção: {inserido}")
            except Exception as e:
                logger.error(f"Erro ao inserir agendamento no Supabase: {str(e)}")
                logger.exception("Detalhes do erro:")
                return JSONResponse(
                    status_code=500,
                    content={
                        "sucesso": False,
                        "mensagem": f"Erro ao inserir agendamento: {str(e)}"
                    }
                )

            if inserido:
                logger.info(f"Agendamento registrado com sucesso para {nome}")
                return {
                    "sucesso": True,
                    "mensagem": f"Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"
                }
            else:
                logger.error(f"Falha ao registrar agendamento para {nome}")

                # Verificar se o erro é devido a permissões do Supabase
                error_message = "Houve um erro ao registrar o agendamento. Por favor, tente novamente mais tarde."

                # Adicionar informações para depuração
                debug_info = {
                    "supabase_url": supabase_url[:20] + "..." if supabase_url else "Não definida",
                    "supabase_key_defined": bool(supabase_key),
                    "nome": nome,
                    "equipamento": equipamento
                }

                return JSONResponse(
                    status_code=500,
                    content={
                        "sucesso": False,
                        "mensagem": error_message,
                        "debug_info": debug_info
                    }
                )
        except Exception as e:
            logger.error(f"Erro em processar dados: {str(e)}")
            logger.exception("Detalhes do erro:")
            return JSONResponse(
                status_code=500,
                content={
                    "sucesso": False,
                    "mensagem": f"Erro ao processar dados: {str(e)}"
                }
            )
    except Exception as e:
        logger.error(f"Erro ao processar requisição em /agendamento-inteligente: {str(e)}")
        logger.exception("Detalhes do erro:")
        return JSONResponse(
            status_code=500,
            content={
                "sucesso": False,
                "mensagem": f"Erro interno do servidor: {str(e)}"
            }
        )

@app.get("/agendamento-inteligente")
async def agendamento_inteligente_get():
    """Endpoint para verificar se o serviço de agendamento inteligente está online"""
    return {
        "status": "online",
        "message": "Serviço de agendamento inteligente está funcionando!",
        "instructions": "Este endpoint aceita requisições POST com dados de agendamento."
    }

@app.get("/health")
async def health_check():
    """Endpoint de verificação de saúde para monitoramento"""
    # Verificar variáveis de ambiente
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    env_status = {
        "SUPABASE_URL": "Definida" if supabase_url else "NÃO DEFINIDA",
        "SUPABASE_KEY": "Definida" if supabase_key else "NÃO DEFINIDA"
    }
    return {
        "status": "healthy",
        "environment": env_status
    }

@app.get("/test-supabase")
async def test_supabase():
    """Endpoint para testar a conexão com o Supabase"""
    try:
        # Verificar variáveis de ambiente
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            return {
                "status": "error",
                "message": "Variáveis de ambiente SUPABASE_URL e/ou SUPABASE_KEY não definidas",
                "supabase_url_defined": bool(supabase_url),
                "supabase_key_defined": bool(supabase_key)
            }

        # Testar conexão com o Supabase usando o cliente
        try:
            # Obter o cliente Supabase
            client = get_supabase_client()

            # Dados de teste
            test_data = {
                "nome": "TESTE API - Verificação de Ambiente",
                "endereco": "Endereço de Teste API",
                "equipamento": "Equipamento de Teste API",
                "problema": "Problema de Teste - Verificação de API",
                "urgente": False,
                "status": "teste",
                "tecnico": "Sistema (teste API)"
            }

            # Inserir no Supabase
            response = client.table("agendamentos_ai").insert(test_data).execute()

            # Verificar se a inserção foi bem-sucedida
            if response.data and len(response.data) > 0:
                return {
                    "status": "success",
                    "message": "Conexão com Supabase estabelecida com sucesso",
                    "response": response.data
                }
            else:
                return {
                    "status": "warning",
                    "message": "Conexão com Supabase estabelecida, mas a inserção não retornou dados",
                    "response": response
                }
        except Exception as e:
            logger.error(f"Erro ao testar cliente Supabase: {str(e)}")

            # Tentar método alternativo com requests
            logger.info("Tentando método alternativo com requests...")
            import requests

            # Construir a URL para a tabela agendamentos_ai
            api_url = f"{supabase_url}/rest/v1/agendamentos_ai"

            # Configurar os headers
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }

            # Dados de teste
            test_data = {
                "nome": "TESTE API - Verificação de Ambiente (Método Alternativo)",
                "endereco": "Endereço de Teste API",
                "equipamento": "Equipamento de Teste API",
                "problema": "Problema de Teste - Verificação de API",
                "urgente": False,
                "status": "teste",
                "tecnico": "Sistema (teste API)"
            }

            # Fazer a requisição
            response = requests.post(api_url, headers=headers, json=test_data)

            # Verificar o status da resposta
            if response.status_code in [200, 201]:
                return {
                    "status": "success",
                    "message": "Conexão com Supabase estabelecida com sucesso (método alternativo)",
                    "response": response.json(),
                    "client_error": str(e)
                }
            else:
                return {
                    "status": "error",
                    "message": f"Erro ao conectar com Supabase. Status code: {response.status_code}",
                    "response": response.text,
                    "headers_sent": headers,
                    "url": api_url,
                    "client_error": str(e)
                }
    except Exception as e:
        logger.exception("Erro ao testar conexão com Supabase")
        return {
            "status": "error",
            "message": f"Erro ao testar conexão com Supabase: {str(e)}"
        }

@app.post("/echo")
async def echo_request(request: Request):
    """Endpoint para ecoar os dados recebidos, útil para debug"""
    try:
        # Registrar os headers da requisição
        headers = dict(request.headers.items())
        # Remover informações sensíveis
        if 'authorization' in headers:
            headers['authorization'] = '***REDACTED***'
        if 'apikey' in headers:
            headers['apikey'] = '***REDACTED***'

        # Tentar ler o corpo da requisição
        try:
            body = await request.body()
            # Registrar o corpo bruto em hexadecimal
            body_hex = body.hex()

            # Tentar diferentes codificações
            try:
                body_text = body.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    body_text = body.decode('latin-1')
                except UnicodeDecodeError:
                    body_text = body.decode('iso-8859-1')

            # Tentar processar como JSON
            try:
                import json
                json_data = json.loads(body_text)
                is_json = True
            except:
                json_data = None
                is_json = False

            # Tentar processar como form data
            try:
                from urllib.parse import parse_qs
                form_data = parse_qs(body_text)
                is_form = True
            except:
                form_data = None
                is_form = False

            return {
                "success": True,
                "message": "Dados recebidos com sucesso",
                "headers": headers,
                "body_hex": body_hex,
                "body_text": body_text,
                "is_json": is_json,
                "json_data": json_data,
                "is_form": is_form,
                "form_data": form_data,
                "content_type": headers.get("content-type", "Não especificado")
            }
        except Exception as e:
            logger.error(f"Erro ao ler corpo da requisição: {str(e)}")
            return {
                "success": False,
                "message": f"Erro ao ler corpo da requisição: {str(e)}",
                "headers": headers
            }
    except Exception as e:
        logger.error(f"Erro ao processar requisição em /echo: {str(e)}")
        return {
            "success": False,
            "message": f"Erro interno do servidor: {str(e)}"
        }

@app.get("/env-check")
async def env_check():
    """Endpoint para verificar as variáveis de ambiente (apenas para diagnóstico)"""
    # Listar todas as variáveis de ambiente (exceto as sensíveis)
    env_vars = {}
    for key, value in os.environ.items():
        if "KEY" in key or "SECRET" in key or "TOKEN" in key or "PASSWORD" in key:
            env_vars[key] = "***REDACTED***"
        else:
            env_vars[key] = value

    # Verificar variáveis específicas
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    return {
        "environment_variables": env_vars,
        "supabase_status": {
            "SUPABASE_URL": "Definida" if supabase_url else "NÃO DEFINIDA",
            "SUPABASE_KEY": "Definida" if supabase_key else "NÃO DEFINIDA"
        }
    }

@app.get("/api/agendamentos")
async def get_agendamentos():
    """Endpoint para buscar todos os agendamentos"""
    try:
        # Obter cliente Supabase
        client = get_supabase_client()

        # Buscar agendamentos
        response = client.table("agendamentos_ai").select("*").order("created_at", desc=True).execute()

        # Verificar se a busca foi bem-sucedida
        if response.data is not None:
            return response.data
        else:
            logger.warning("Resposta vazia do Supabase ao buscar agendamentos")
            return []

    except Exception as e:
        logger.error(f"Erro ao buscar agendamentos: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "sucesso": False,
                "mensagem": f"Erro ao buscar agendamentos: {str(e)}"
            }
        )

if __name__ == "__main__":
    logger.info("Iniciando servidor Fix Fogões Middleware...")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
