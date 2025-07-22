#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔧 Script para Corrigir client_id Faltantes na Tabela scheduled_services

Este script identifica registros na tabela scheduled_services que não têm client_id
e tenta corrigi-los usando informações de service_orders ou clients.
"""

import os
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_client_ids.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

def get_supabase_client() -> Client:
    """Criar cliente Supabase"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas no .env")
    
    return create_client(url, key)

def find_missing_client_ids(supabase: Client):
    """Encontrar registros sem client_id"""
    try:
        logger.info("🔍 Buscando registros sem client_id...")
        
        response = supabase.table("scheduled_services").select(
            "id, client_id, client_name, service_order_id, created_at"
        ).is_("client_id", "null").execute()
        
        missing_records = response.data
        logger.info(f"📊 Encontrados {len(missing_records)} registros sem client_id")
        
        return missing_records
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar registros: {e}")
        return []

def find_client_by_service_order(supabase: Client, service_order_id: str):
    """Buscar client_id através da service_order"""
    try:
        if not service_order_id:
            return None
            
        response = supabase.table("service_orders").select(
            "client_id, client_name"
        ).eq("id", service_order_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0].get("client_id")
            
    except Exception as e:
        logger.error(f"❌ Erro ao buscar por service_order {service_order_id}: {e}")
    
    return None

def find_client_by_name_and_phone(supabase: Client, client_name: str):
    """Buscar client_id por nome (e telefone se disponível)"""
    try:
        if not client_name or client_name.strip() == "":
            return None
            
        # Buscar por nome exato primeiro
        response = supabase.table("clients").select(
            "id, name, phone"
        ).eq("name", client_name.strip()).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]["id"]
        
        # Buscar por nome similar (case insensitive)
        response = supabase.table("clients").select(
            "id, name, phone"
        ).ilike("name", f"%{client_name.strip()}%").execute()
        
        if response.data and len(response.data) > 0:
            # Se encontrou múltiplos, pegar o primeiro
            logger.warning(f"⚠️ Múltiplos clientes encontrados para '{client_name}', usando o primeiro")
            return response.data[0]["id"]
            
    except Exception as e:
        logger.error(f"❌ Erro ao buscar cliente por nome '{client_name}': {e}")
    
    return None

def create_client_if_not_exists(supabase: Client, client_name: str):
    """Criar cliente se não existir"""
    try:
        if not client_name or client_name.strip() == "":
            return None
            
        # Verificar se já existe
        existing_id = find_client_by_name_and_phone(supabase, client_name)
        if existing_id:
            return existing_id
        
        # Criar novo cliente
        client_data = {
            "name": client_name.strip(),
            "email": f"{client_name.lower().replace(' ', '.')}@cliente.com",
            "phone": "",
            "address": "",
            "created_at": datetime.now().isoformat()
        }
        
        response = supabase.table("clients").insert(client_data).execute()
        
        if response.data and len(response.data) > 0:
            new_client_id = response.data[0]["id"]
            logger.info(f"✅ Cliente criado: {client_name} (ID: {new_client_id})")
            return new_client_id
            
    except Exception as e:
        logger.error(f"❌ Erro ao criar cliente '{client_name}': {e}")
    
    return None

def update_scheduled_service_client_id(supabase: Client, scheduled_service_id: str, client_id: str):
    """Atualizar client_id no scheduled_service"""
    try:
        response = supabase.table("scheduled_services").update({
            "client_id": client_id
        }).eq("id", scheduled_service_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"✅ Atualizado scheduled_service {scheduled_service_id} com client_id {client_id}")
            return True
        else:
            logger.error(f"❌ Falha ao atualizar scheduled_service {scheduled_service_id}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar scheduled_service {scheduled_service_id}: {e}")
        return False

def fix_missing_client_ids():
    """Função principal para corrigir client_ids faltantes"""
    try:
        logger.info("🚀 Iniciando correção de client_ids faltantes...")
        
        supabase = get_supabase_client()
        
        # 1. Encontrar registros sem client_id
        missing_records = find_missing_client_ids(supabase)
        
        if not missing_records:
            logger.info("✅ Nenhum registro sem client_id encontrado!")
            return
        
        fixed_count = 0
        created_count = 0
        failed_count = 0
        
        for record in missing_records:
            record_id = record["id"]
            client_name = record.get("client_name", "")
            service_order_id = record.get("service_order_id")
            
            logger.info(f"🔧 Processando registro {record_id}: {client_name}")
            
            client_id = None
            
            # 2. Tentar encontrar client_id através da service_order
            if service_order_id:
                client_id = find_client_by_service_order(supabase, service_order_id)
                if client_id:
                    logger.info(f"📋 Client_id encontrado via service_order: {client_id}")
            
            # 3. Se não encontrou, tentar por nome do cliente
            if not client_id and client_name:
                client_id = find_client_by_name_and_phone(supabase, client_name)
                if client_id:
                    logger.info(f"👤 Client_id encontrado por nome: {client_id}")
            
            # 4. Se ainda não encontrou, criar novo cliente
            if not client_id and client_name:
                client_id = create_client_if_not_exists(supabase, client_name)
                if client_id:
                    logger.info(f"🆕 Novo cliente criado: {client_id}")
                    created_count += 1
            
            # 5. Atualizar o scheduled_service
            if client_id:
                success = update_scheduled_service_client_id(supabase, record_id, client_id)
                if success:
                    fixed_count += 1
                else:
                    failed_count += 1
            else:
                logger.warning(f"⚠️ Não foi possível determinar client_id para registro {record_id}")
                failed_count += 1
        
        # Relatório final
        logger.info("📊 ═══════════════════════════════════════════════════════════")
        logger.info("📊 RELATÓRIO FINAL DA CORREÇÃO")
        logger.info("📊 ═══════════════════════════════════════════════════════════")
        logger.info(f"📋 Total de registros processados: {len(missing_records)}")
        logger.info(f"✅ Registros corrigidos: {fixed_count}")
        logger.info(f"🆕 Novos clientes criados: {created_count}")
        logger.info(f"❌ Falhas: {failed_count}")
        logger.info("📊 ═══════════════════════════════════════════════════════════")
        
        if fixed_count > 0:
            logger.info("🎉 Correção concluída com sucesso!")
        else:
            logger.warning("⚠️ Nenhum registro foi corrigido.")
            
    except Exception as e:
        logger.error(f"❌ Erro geral na correção: {e}")

if __name__ == "__main__":
    fix_missing_client_ids()
