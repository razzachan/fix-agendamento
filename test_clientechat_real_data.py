#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste dos endpoints ClienteChat com dados reais do Supabase.
Este script busca dados reais no banco para testar os endpoints.
"""

import requests
import json
import sys
import time
from supabase_client import get_supabase_client

# URL base do middleware
BASE_URL = "https://fix-agendamento-production.up.railway.app"

def get_real_test_data():
    """
    Busca dados reais do Supabase para usar nos testes.
    """
    try:
        print("🔍 Buscando dados reais do Supabase para testes...")
        
        client = get_supabase_client()
        
        # Buscar um pré-agendamento recente
        agendamentos = client.table("agendamentos_ai").select("*").limit(5).order("created_at", desc=True).execute()
        
        # Buscar uma ordem de serviço recente
        ordens = client.table("service_orders").select("*").limit(5).order("created_at", desc=True).execute()
        
        test_data = {
            "agendamentos": agendamentos.data if agendamentos.data else [],
            "ordens": ordens.data if ordens.data else [],
            "telefones": set(),
            "order_ids": set()
        }
        
        # Extrair telefones únicos
        for agendamento in test_data["agendamentos"]:
            if agendamento.get("telefone"):
                test_data["telefones"].add(agendamento["telefone"])
                test_data["order_ids"].add(agendamento["id"])
        
        for ordem in test_data["ordens"]:
            if ordem.get("client_phone"):
                test_data["telefones"].add(ordem["client_phone"])
                test_data["order_ids"].add(ordem["id"])
        
        # Converter sets para listas
        test_data["telefones"] = list(test_data["telefones"])
        test_data["order_ids"] = list(test_data["order_ids"])
        
        print(f"✅ Encontrados {len(test_data['agendamentos'])} pré-agendamentos")
        print(f"✅ Encontradas {len(test_data['ordens'])} ordens de serviço")
        print(f"✅ Telefones únicos: {len(test_data['telefones'])}")
        print(f"✅ IDs únicos: {len(test_data['order_ids'])}")
        
        return test_data
        
    except Exception as e:
        print(f"❌ Erro ao buscar dados reais: {str(e)}")
        return None

def test_real_client_orders(test_data):
    """
    Testa busca de ordens com telefones reais.
    """
    print("\n🔍 TESTANDO BUSCA DE ORDENS COM DADOS REAIS")
    print("-" * 50)
    
    if not test_data["telefones"]:
        print("❌ Nenhum telefone encontrado para teste")
        return
    
    # Testar com os primeiros 3 telefones
    for i, telefone in enumerate(test_data["telefones"][:3]):
        print(f"\n📱 Testando telefone {i+1}: {telefone}")
        
        url = f"{BASE_URL}/api/clientechat/client/{telefone}/orders"
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    print("✅ Sucesso!")
                    print(f"📊 Total encontrado: {data['data']['total']}")
                    print(f"📱 Mensagem ClienteChat:")
                    print(data['message'][:200] + "..." if len(data['message']) > 200 else data['message'])
                else:
                    print(f"❌ Falhou: {data.get('message', 'Erro desconhecido')}")
            else:
                print(f"❌ Erro HTTP: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
        
        time.sleep(1)  # Pausa entre testes

def test_real_order_status(test_data):
    """
    Testa busca de status com IDs reais.
    """
    print("\n🔍 TESTANDO BUSCA DE STATUS COM DADOS REAIS")
    print("-" * 50)
    
    if not test_data["order_ids"]:
        print("❌ Nenhum ID de ordem encontrado para teste")
        return
    
    # Testar com os primeiros 3 IDs
    for i, order_id in enumerate(test_data["order_ids"][:3]):
        print(f"\n🆔 Testando ordem {i+1}: {order_id}")
        
        url = f"{BASE_URL}/api/clientechat/order/{order_id}/status"
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    print("✅ Sucesso!")
                    print(f"📱 Mensagem ClienteChat:")
                    print(data['message'][:200] + "..." if len(data['message']) > 200 else data['message'])
                else:
                    print(f"❌ Falhou: {data.get('message', 'Erro desconhecido')}")
            else:
                print(f"❌ Erro HTTP: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
        
        time.sleep(1)  # Pausa entre testes

def test_real_order_budget(test_data):
    """
    Testa busca de orçamento com IDs reais.
    """
    print("\n🔍 TESTANDO BUSCA DE ORÇAMENTO COM DADOS REAIS")
    print("-" * 50)
    
    if not test_data["order_ids"]:
        print("❌ Nenhum ID de ordem encontrado para teste")
        return
    
    # Testar com os primeiros 3 IDs
    for i, order_id in enumerate(test_data["order_ids"][:3]):
        print(f"\n💰 Testando orçamento {i+1}: {order_id}")
        
        url = f"{BASE_URL}/api/clientechat/order/{order_id}/budget"
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data["success"]:
                    print("✅ Sucesso!")
                    print(f"📱 Mensagem ClienteChat:")
                    print(data['message'][:200] + "..." if len(data['message']) > 200 else data['message'])
                else:
                    print(f"❌ Falhou: {data.get('message', 'Erro desconhecido')}")
            else:
                print(f"❌ Erro HTTP: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
        
        time.sleep(1)  # Pausa entre testes

def test_database_functions():
    """
    Testa as funções do supabase_client diretamente.
    """
    print("\n🔍 TESTANDO FUNÇÕES DO BANCO DIRETAMENTE")
    print("-" * 50)
    
    try:
        from supabase_client import buscar_ordens_cliente, buscar_status_ordem, buscar_orcamento_ordem
        
        # Buscar dados reais primeiro
        client = get_supabase_client()
        agendamentos = client.table("agendamentos_ai").select("telefone, id").limit(1).execute()
        
        if agendamentos.data and len(agendamentos.data) > 0:
            telefone_teste = agendamentos.data[0]["telefone"]
            id_teste = agendamentos.data[0]["id"]
            
            print(f"📱 Testando com telefone: {telefone_teste}")
            print(f"🆔 Testando com ID: {id_teste}")
            
            # Teste 1: Buscar ordens do cliente
            print("\n1️⃣ Testando buscar_ordens_cliente...")
            resultado = buscar_ordens_cliente(telefone_teste)
            print(f"✅ Total encontrado: {resultado['total']}")
            
            # Teste 2: Buscar status da ordem
            print("\n2️⃣ Testando buscar_status_ordem...")
            status = buscar_status_ordem(id_teste)
            if status:
                print(f"✅ Status encontrado: {status['status']}")
            else:
                print("❌ Status não encontrado")
            
            # Teste 3: Buscar orçamento
            print("\n3️⃣ Testando buscar_orcamento_ordem...")
            orcamento = buscar_orcamento_ordem(id_teste)
            if orcamento:
                print(f"✅ Orçamento: {orcamento.get('status', 'N/A')}")
            else:
                print("❌ Orçamento não encontrado")
                
        else:
            print("❌ Nenhum dado encontrado no banco para teste")
            
    except Exception as e:
        print(f"❌ Erro ao testar funções do banco: {str(e)}")

def run_real_data_tests():
    """
    Executa todos os testes com dados reais.
    """
    print("🚀 INICIANDO TESTES COM DADOS REAIS")
    print("=" * 60)
    
    # Buscar dados reais
    test_data = get_real_test_data()
    
    if not test_data:
        print("❌ Não foi possível obter dados reais. Abortando testes.")
        return
    
    # Testar funções do banco diretamente
    test_database_functions()
    
    # Testar endpoints com dados reais
    test_real_client_orders(test_data)
    test_real_order_status(test_data)
    test_real_order_budget(test_data)
    
    print("\n🏁 TESTES COM DADOS REAIS CONCLUÍDOS!")
    print("=" * 60)
    print("\n📊 RESUMO:")
    print(f"📱 Telefones testados: {len(test_data['telefones'][:3])}")
    print(f"🆔 IDs testados: {len(test_data['order_ids'][:3])}")
    print("\n📝 PRÓXIMOS PASSOS:")
    print("1. Verificar se todas as respostas estão formatadas corretamente")
    print("2. Testar com ClienteChat real")
    print("3. Configurar neural chains para usar os novos endpoints")

if __name__ == "__main__":
    run_real_data_tests()
