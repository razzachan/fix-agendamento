#!/usr/bin/env python3
"""
Script para criar tabelas de estoque móvel no Supabase
EletroFix Hub Pro - Sistema de Estoque Móvel
"""

import os
import sys
import logging
from supabase import create_client, Client

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurações do Supabase
SUPABASE_URL = "https://hdyucwabemspehokoiks.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"

def get_supabase_client() -> Client:
    """Cria e retorna cliente Supabase"""
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Cliente Supabase criado com sucesso")
        return client
    except Exception as e:
        logger.error(f"❌ Erro ao criar cliente Supabase: {e}")
        sys.exit(1)

def execute_sql(client: Client, sql: str, description: str) -> bool:
    """Executa SQL no Supabase"""
    try:
        logger.info(f"🔄 Executando: {description}")
        
        # Usar rpc para executar SQL
        result = client.rpc('exec_sql', {'sql_query': sql}).execute()
        
        if result.data is not None:
            logger.info(f"✅ {description} - Sucesso")
            return True
        else:
            logger.error(f"❌ {description} - Falhou")
            return False
            
    except Exception as e:
        logger.error(f"❌ {description} - Erro: {e}")
        return False

def main():
    """Função principal"""
    logger.info("🚀 Iniciando criação das tabelas de estoque móvel...")
    
    # Criar cliente Supabase
    client = get_supabase_client()
    
    # SQL Commands
    commands = [
        # 1. Tabela de itens de estoque
        {
            "sql": """
            CREATE TABLE IF NOT EXISTS technician_stock_items (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              code VARCHAR(50) UNIQUE NOT NULL,
              name VARCHAR(200) NOT NULL,
              description TEXT,
              category VARCHAR(100) NOT NULL,
              unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
              sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
              weight_kg DECIMAL(8,3),
              dimensions VARCHAR(100),
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );
            """,
            "description": "Criando tabela technician_stock_items"
        },
        
        # 2. Tabela de estoque do técnico
        {
            "sql": """
            CREATE TABLE IF NOT EXISTS technician_stock (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              technician_id UUID NOT NULL REFERENCES auth.users(id),
              item_id UUID NOT NULL REFERENCES technician_stock_items(id),
              current_quantity INTEGER NOT NULL DEFAULT 0,
              min_quantity INTEGER NOT NULL DEFAULT 0,
              max_quantity INTEGER NOT NULL DEFAULT 0,
              location_in_vehicle VARCHAR(100),
              last_updated TIMESTAMP DEFAULT NOW(),
              UNIQUE(technician_id, item_id)
            );
            """,
            "description": "Criando tabela technician_stock"
        },
        
        # 3. Tabela de movimentações
        {
            "sql": """
            CREATE TABLE IF NOT EXISTS technician_stock_movements (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              technician_id UUID NOT NULL REFERENCES auth.users(id),
              item_id UUID NOT NULL REFERENCES technician_stock_items(id),
              movement_type VARCHAR(20) NOT NULL,
              quantity INTEGER NOT NULL,
              previous_quantity INTEGER NOT NULL,
              new_quantity INTEGER NOT NULL,
              reason VARCHAR(500),
              service_order_id UUID REFERENCES service_orders(id),
              location VARCHAR(200),
              created_by UUID REFERENCES auth.users(id),
              created_at TIMESTAMP DEFAULT NOW()
            );
            """,
            "description": "Criando tabela technician_stock_movements"
        },
        
        # 4. Tabela de solicitações
        {
            "sql": """
            CREATE TABLE IF NOT EXISTS technician_stock_requests (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              technician_id UUID NOT NULL REFERENCES auth.users(id),
              item_id UUID NOT NULL REFERENCES technician_stock_items(id),
              requested_quantity INTEGER NOT NULL,
              current_quantity INTEGER NOT NULL,
              reason VARCHAR(500),
              priority VARCHAR(20) DEFAULT 'normal',
              status VARCHAR(20) DEFAULT 'pending',
              requested_at TIMESTAMP DEFAULT NOW(),
              approved_at TIMESTAMP,
              approved_by UUID REFERENCES auth.users(id),
              delivered_at TIMESTAMP,
              notes TEXT
            );
            """,
            "description": "Criando tabela technician_stock_requests"
        },
        
        # 5. Índices
        {
            "sql": """
            CREATE INDEX IF NOT EXISTS idx_technician_stock_technician_id ON technician_stock(technician_id);
            CREATE INDEX IF NOT EXISTS idx_technician_stock_item_id ON technician_stock(item_id);
            CREATE INDEX IF NOT EXISTS idx_technician_stock_movements_technician_id ON technician_stock_movements(technician_id);
            """,
            "description": "Criando índices"
        },
        
        # 6. View principal
        {
            "sql": """
            CREATE OR REPLACE VIEW v_technician_stock_current AS
            SELECT 
                ts.technician_id,
                u.email as technician_email,
                tsi.code,
                tsi.name,
                tsi.category,
                ts.current_quantity,
                ts.min_quantity,
                ts.max_quantity,
                ts.location_in_vehicle,
                tsi.unit_cost,
                tsi.sale_price,
                (ts.current_quantity * tsi.sale_price) as total_value,
                CASE 
                    WHEN ts.current_quantity = 0 THEN 'out_of_stock'
                    WHEN ts.current_quantity <= ts.min_quantity THEN 'low_stock'
                    WHEN ts.current_quantity >= ts.max_quantity THEN 'full_stock'
                    ELSE 'normal'
                END as stock_status,
                ts.last_updated
            FROM technician_stock ts
            JOIN technician_stock_items tsi ON ts.item_id = tsi.id
            JOIN auth.users u ON ts.technician_id = u.id
            WHERE tsi.is_active = true;
            """,
            "description": "Criando view v_technician_stock_current"
        },
        
        # 7. RLS Policies
        {
            "sql": """
            ALTER TABLE technician_stock_items ENABLE ROW LEVEL SECURITY;
            ALTER TABLE technician_stock ENABLE ROW LEVEL SECURITY;
            ALTER TABLE technician_stock_movements ENABLE ROW LEVEL SECURITY;
            ALTER TABLE technician_stock_requests ENABLE ROW LEVEL SECURITY;
            """,
            "description": "Habilitando RLS"
        },
        
        # 8. Políticas RLS
        {
            "sql": """
            CREATE POLICY "Todos podem ver itens de estoque" ON technician_stock_items FOR SELECT USING (true);
            CREATE POLICY "Técnicos veem apenas seu estoque" ON technician_stock FOR ALL USING (auth.uid() = technician_id);
            CREATE POLICY "Técnicos veem apenas suas movimentações" ON technician_stock_movements FOR ALL USING (auth.uid() = technician_id OR auth.uid() = created_by);
            CREATE POLICY "Técnicos veem apenas suas solicitações" ON technician_stock_requests FOR ALL USING (auth.uid() = technician_id);
            """,
            "description": "Criando políticas RLS"
        }
    ]
    
    # Executar comandos
    success_count = 0
    for i, command in enumerate(commands, 1):
        logger.info(f"📋 Comando {i}/{len(commands)}")
        if execute_sql(client, command["sql"], command["description"]):
            success_count += 1
        else:
            logger.warning(f"⚠️ Comando {i} falhou, continuando...")
    
    logger.info(f"📊 Resultado: {success_count}/{len(commands)} comandos executados com sucesso")
    
    if success_count == len(commands):
        logger.info("🎉 Todas as tabelas foram criadas com sucesso!")
        return True
    else:
        logger.warning("⚠️ Algumas tabelas podem não ter sido criadas corretamente")
        return False

if __name__ == "__main__":
    try:
        success = main()
        if success:
            logger.info("✅ Script concluído com sucesso!")
            sys.exit(0)
        else:
            logger.error("❌ Script concluído com erros")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("🛑 Script interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Erro inesperado: {e}")
        sys.exit(1)
