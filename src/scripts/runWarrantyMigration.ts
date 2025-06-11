import { supabase } from '@/integrations/supabase/client';

/**
 * Script para executar a migração de garantia no banco de dados
 */
async function runWarrantyMigration() {
  try {
    console.log('Iniciando migração de garantia...');
    
    // Adicionar campos de garantia à tabela service_orders
    console.log('Adicionando campos de garantia à tabela service_orders...');
    const { error: alterTableError } = await supabase.rpc('run_sql', {
      sql: `
        ALTER TABLE service_orders
        ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
        ADD COLUMN IF NOT EXISTS related_warranty_order_id UUID REFERENCES service_orders(id);
      `
    });
    
    if (alterTableError) {
      console.error('Erro ao adicionar campos de garantia:', alterTableError);
      return;
    }
    
    // Criar tabela para rastrear serviços realizados em garantia
    console.log('Criando tabela warranty_services...');
    const { error: createTableError } = await supabase.rpc('run_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS warranty_services (
          id UUID PRIMARY KEY,
          original_order_id UUID NOT NULL REFERENCES service_orders(id),
          warranty_order_id UUID NOT NULL REFERENCES service_orders(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          notes TEXT,
          
          CONSTRAINT fk_original_order FOREIGN KEY (original_order_id) REFERENCES service_orders(id),
          CONSTRAINT fk_warranty_order FOREIGN KEY (warranty_order_id) REFERENCES service_orders(id)
        );
      `
    });
    
    if (createTableError) {
      console.error('Erro ao criar tabela warranty_services:', createTableError);
      return;
    }
    
    console.log('Migração de garantia concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração de garantia:', error);
  }
}

// Executar a migração
runWarrantyMigration();
