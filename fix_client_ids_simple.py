#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔧 Script Simples para Corrigir client_id Faltantes

Executa correção direta usando as mesmas configurações do middleware
"""

import os
import sys
import logging
from datetime import datetime

# Adicionar o diretório atual ao path para importar do middleware
sys.path.append('.')

try:
    from middleware import get_supabase_client
    print("✅ Importação do middleware bem-sucedida")
except ImportError as e:
    print(f"❌ Erro ao importar middleware: {e}")
    print("Certifique-se de estar no diretório correto")
    sys.exit(1)

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_missing_client_ids_simple():
    """Versão simplificada da correção"""
    try:
        print("🚀 Iniciando correção de client_ids faltantes...")
        
        supabase = get_supabase_client()
        
        # 1. Buscar registros sem client_id
        print("🔍 Buscando registros sem client_id...")
        response = supabase.table("scheduled_services").select(
            "id, client_id, client_name, service_order_id"
        ).is_("client_id", "null").limit(50).execute()  # Limitar a 50 para teste
        
        missing_records = response.data
        print(f"📊 Encontrados {len(missing_records)} registros sem client_id")
        
        if not missing_records:
            print("✅ Nenhum registro sem client_id encontrado!")
            return
        
        fixed_count = 0
        
        for record in missing_records:
            record_id = record["id"]
            client_name = record.get("client_name", "")
            service_order_id = record.get("service_order_id")
            
            print(f"🔧 Processando: {record_id} - {client_name}")
            
            client_id = None
            
            # Método 1: Buscar via service_order
            if service_order_id:
                try:
                    so_response = supabase.table("service_orders").select(
                        "client_id"
                    ).eq("id", service_order_id).execute()
                    
                    if so_response.data and len(so_response.data) > 0:
                        client_id = so_response.data[0].get("client_id")
                        if client_id:
                            print(f"  📋 Client_id encontrado via service_order: {client_id}")
                except Exception as e:
                    print(f"  ⚠️ Erro ao buscar via service_order: {e}")
            
            # Método 2: Buscar cliente por nome
            if not client_id and client_name and client_name.strip():
                try:
                    client_response = supabase.table("clients").select(
                        "id"
                    ).eq("name", client_name.strip()).execute()
                    
                    if client_response.data and len(client_response.data) > 0:
                        client_id = client_response.data[0]["id"]
                        print(f"  👤 Client_id encontrado por nome: {client_id}")
                    else:
                        # Buscar similar
                        similar_response = supabase.table("clients").select(
                            "id, name"
                        ).ilike("name", f"%{client_name.strip()}%").execute()
                        
                        if similar_response.data and len(similar_response.data) > 0:
                            client_id = similar_response.data[0]["id"]
                            print(f"  👤 Client_id encontrado por similaridade: {client_id}")
                except Exception as e:
                    print(f"  ⚠️ Erro ao buscar cliente: {e}")
            
            # Método 3: Criar cliente se necessário
            if not client_id and client_name and client_name.strip():
                try:
                    new_client_data = {
                        "name": client_name.strip(),
                        "email": f"{client_name.lower().replace(' ', '.')}@cliente.com",
                        "phone": "",
                        "address": "",
                        "created_at": datetime.now().isoformat()
                    }
                    
                    create_response = supabase.table("clients").insert(new_client_data).execute()
                    
                    if create_response.data and len(create_response.data) > 0:
                        client_id = create_response.data[0]["id"]
                        print(f"  🆕 Novo cliente criado: {client_id}")
                except Exception as e:
                    print(f"  ❌ Erro ao criar cliente: {e}")
            
            # Atualizar scheduled_service
            if client_id:
                try:
                    update_response = supabase.table("scheduled_services").update({
                        "client_id": client_id
                    }).eq("id", record_id).execute()
                    
                    if update_response.data:
                        print(f"  ✅ Atualizado com client_id: {client_id}")
                        fixed_count += 1
                    else:
                        print(f"  ❌ Falha ao atualizar")
                except Exception as e:
                    print(f"  ❌ Erro ao atualizar: {e}")
            else:
                print(f"  ⚠️ Não foi possível determinar client_id")
        
        print("\n📊 ═══════════════════════════════════════")
        print("📊 RELATÓRIO FINAL")
        print("📊 ═══════════════════════════════════════")
        print(f"📋 Total processados: {len(missing_records)}")
        print(f"✅ Corrigidos: {fixed_count}")
        print(f"❌ Não corrigidos: {len(missing_records) - fixed_count}")
        print("📊 ═══════════════════════════════════════")
        
        if fixed_count > 0:
            print("🎉 Correção concluída com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_missing_client_ids_simple()
