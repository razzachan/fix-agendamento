#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔍 Teste da API do Railway para acessar logs

Este script testa diferentes queries GraphQL para acessar logs do Railway
"""

import requests
import json
import os

# Endpoint da API do Railway
RAILWAY_API_URL = "https://backboard.railway.com/graphql/v2"

# Token da API (você precisa criar um em https://railway.com/account/tokens)
# Para testar, você pode definir como variável de ambiente:
# export RAILWAY_TOKEN="seu_token_aqui"
RAILWAY_TOKEN = os.getenv("RAILWAY_TOKEN")

def test_railway_api():
    """Testa diferentes queries da API do Railway"""
    
    if not RAILWAY_TOKEN:
        print("❌ RAILWAY_TOKEN não definido!")
        print("💡 Crie um token em: https://railway.com/account/tokens")
        print("💡 E defina: export RAILWAY_TOKEN='seu_token_aqui'")
        return
    
    headers = {
        "Authorization": f"Bearer {RAILWAY_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Query 1: Teste básico - informações do usuário
    print("🔍 Testando query básica...")
    query_me = {
        "query": """
        query {
            me {
                name
                email
                id
            }
        }
        """
    }
    
    try:
        response = requests.post(RAILWAY_API_URL, json=query_me, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Query básica funcionou!")
            print(f"Usuário: {data.get('data', {}).get('me', {}).get('name', 'N/A')}")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Query 2: Listar projetos
    print("🔍 Testando query de projetos...")
    query_projects = {
        "query": """
        query {
            projects {
                edges {
                    node {
                        id
                        name
                        services {
                            edges {
                                node {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
        """
    }
    
    try:
        response = requests.post(RAILWAY_API_URL, json=query_projects, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Query de projetos funcionou!")
            projects = data.get('data', {}).get('projects', {}).get('edges', [])
            for project in projects:
                project_data = project.get('node', {})
                print(f"📋 Projeto: {project_data.get('name')} (ID: {project_data.get('id')})")
                services = project_data.get('services', {}).get('edges', [])
                for service in services:
                    service_data = service.get('node', {})
                    print(f"  🔧 Serviço: {service_data.get('name')} (ID: {service_data.get('id')})")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Query 3: Tentar acessar logs (estrutura hipotética)
    print("🔍 Testando query de logs...")
    
    # Primeiro, vamos tentar descobrir a estrutura com introspection
    introspection_query = {
        "query": """
        query IntrospectionQuery {
            __schema {
                types {
                    name
                    fields {
                        name
                        type {
                            name
                        }
                    }
                }
            }
        }
        """
    }
    
    try:
        response = requests.post(RAILWAY_API_URL, json=introspection_query, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Introspection funcionou!")
            
            # Procurar por tipos relacionados a logs
            schema_types = data.get('data', {}).get('__schema', {}).get('types', [])
            log_related_types = []
            
            for type_info in schema_types:
                type_name = type_info.get('name', '')
                if any(keyword in type_name.lower() for keyword in ['log', 'deployment', 'build']):
                    log_related_types.append(type_info)
            
            print(f"🔍 Encontrados {len(log_related_types)} tipos relacionados a logs:")
            for log_type in log_related_types:
                print(f"  📝 {log_type.get('name')}")
                fields = log_type.get('fields', [])
                if fields:
                    for field in fields[:5]:  # Mostrar apenas os primeiros 5 campos
                        field_name = field.get('name')
                        field_type = field.get('type', {}).get('name', 'Unknown')
                        print(f"    - {field_name}: {field_type}")
                    if len(fields) > 5:
                        print(f"    ... e mais {len(fields) - 5} campos")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

def test_specific_log_queries():
    """Testa queries específicas para logs baseadas em estruturas comuns"""
    
    if not RAILWAY_TOKEN:
        print("❌ RAILWAY_TOKEN não definido!")
        return
    
    headers = {
        "Authorization": f"Bearer {RAILWAY_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Possíveis queries para logs
    possible_queries = [
        {
            "name": "deploymentLogs",
            "query": """
            query {
                deploymentLogs(deploymentId: "DEPLOYMENT_ID") {
                    message
                    timestamp
                }
            }
            """
        },
        {
            "name": "serviceLogs", 
            "query": """
            query {
                serviceLogs(serviceId: "SERVICE_ID") {
                    message
                    timestamp
                }
            }
            """
        },
        {
            "name": "logs",
            "query": """
            query {
                logs {
                    message
                    timestamp
                }
            }
            """
        }
    ]
    
    print("🔍 Testando queries específicas para logs...")
    
    for query_info in possible_queries:
        print(f"\n📝 Testando query: {query_info['name']}")
        
        try:
            response = requests.post(RAILWAY_API_URL, json={"query": query_info["query"]}, headers=headers)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if 'errors' in data:
                    print(f"⚠️ Erros GraphQL: {data['errors']}")
                else:
                    print("✅ Query executada com sucesso!")
                    print(f"Dados: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ Erro HTTP: {response.text}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    print("🚀 Testando API do Railway...")
    print("="*50)
    
    test_railway_api()
    
    print("\n" + "="*50 + "\n")
    
    test_specific_log_queries()
    
    print("\n🎯 Para usar este script:")
    print("1. Crie um token em: https://railway.com/account/tokens")
    print("2. Execute: export RAILWAY_TOKEN='seu_token_aqui'")
    print("3. Execute: python test-railway-api.py")
