#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🧪 TESTE SIMPLES DO MIDDLEWARE
Verifica se o middleware consegue criar uma OS corretamente
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

def test_middleware_os_creation():
    """Testa se o middleware cria OS corretamente"""
    
    print("🧪 TESTE: Criação de OS pelo Middleware")
    print("=" * 50)
    
    # URL do middleware
    middleware_url = "http://localhost:8000"
    
    # Dados de teste
    test_data = {
        "nome": "Teste Middleware Debug",
        "telefone": "11999999999", 
        "endereco": "Rua Teste, 123, São Paulo, SP",
        "problema": "Teste de criação de OS",
        "equipamento": "Fogão",
        "tecnico": "Paulo Cesar Betoni",
        "horario_agendado": "2025-08-05T15:00:00-03:00"
    }
    
    print(f"📋 Dados de teste:")
    for key, value in test_data.items():
        print(f"  - {key}: {value}")
    print()
    
    try:
        # Testar endpoint de agendamento inteligente
        print("🔄 Enviando requisição para /agendamento-inteligente...")
        
        response = requests.post(
            f"{middleware_url}/agendamento-inteligente",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Sucesso! Resposta:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Verificar se contém os campos esperados
            if result.get("success"):
                print("\n🎯 ANÁLISE DA RESPOSTA:")
                print(f"  - OS Número: {result.get('os_numero', 'N/A')}")
                print(f"  - OS ID: {result.get('os_id', 'N/A')}")
                print(f"  - Cliente ID: {result.get('cliente_id', 'N/A')}")
                print(f"  - Conta Criada: {result.get('conta_criada', 'N/A')}")
                
                return True
            else:
                print(f"❌ Falha na criação: {result.get('message', 'Erro desconhecido')}")
                return False
                
        else:
            print(f"❌ Erro HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Detalhes do erro:")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                print(f"📋 Resposta raw: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERRO: Não foi possível conectar ao middleware")
        print("   Verifique se o middleware está rodando em http://localhost:8000")
        return False
        
    except requests.exceptions.Timeout:
        print("❌ ERRO: Timeout na requisição (>30s)")
        return False
        
    except Exception as e:
        print(f"❌ ERRO INESPERADO: {str(e)}")
        return False

def check_middleware_health():
    """Verifica se o middleware está rodando"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Middleware está rodando e respondendo")
            return True
        else:
            print(f"⚠️ Middleware respondeu com status {response.status_code}")
            return False
    except:
        print("❌ Middleware não está respondendo")
        return False

if __name__ == "__main__":
    print("🚀 INICIANDO TESTE DO MIDDLEWARE")
    print("=" * 50)
    
    # Verificar se middleware está rodando
    if not check_middleware_health():
        print("\n💡 DICA: Execute 'python middleware.py' em outro terminal")
        sys.exit(1)
    
    print()
    
    # Executar teste
    success = test_middleware_os_creation()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 TESTE CONCLUÍDO COM SUCESSO!")
        print("✅ O middleware conseguiu criar a OS corretamente")
    else:
        print("❌ TESTE FALHOU!")
        print("🔍 Verifique os logs do middleware para mais detalhes")
    
    print("=" * 50)
