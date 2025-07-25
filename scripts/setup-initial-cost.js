/**
 * Script para verificar e criar a coluna initial_cost no Supabase
 * Execute: node scripts/setup-initial-cost.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave de serviço para operações admin

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas:');
  console.error('- VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumnExists() {
  console.log('🔍 Verificando se a coluna initial_cost existe...');
  
  try {
    // Verificar estrutura da tabela
    const { data, error } = await supabase
      .from('service_orders')
      .select('initial_cost')
      .limit(1);

    if (error) {
      if (error.message.includes('column "initial_cost" does not exist')) {
        console.log('❌ Coluna initial_cost NÃO existe');
        return false;
      }
      throw error;
    }

    console.log('✅ Coluna initial_cost já existe');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar coluna:', error.message);
    return false;
  }
}

async function createInitialCostColumn() {
  console.log('🔧 Criando coluna initial_cost...');
  
  try {
    // Executar SQL para adicionar a coluna
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- 1. Adicionar a coluna initial_cost
        ALTER TABLE service_orders 
        ADD COLUMN IF NOT EXISTS initial_cost DECIMAL(10,2) DEFAULT 0;

        -- 2. Comentários para documentação
        COMMENT ON COLUMN service_orders.initial_cost IS 'Valor inicial pago (sinal para coleta diagnóstico)';
        COMMENT ON COLUMN service_orders.final_cost IS 'Valor final total do serviço (inicial + adicional)';

        -- 3. Migrar dados existentes para coleta diagnóstico
        UPDATE service_orders 
        SET initial_cost = CASE 
          WHEN service_attendance_type = 'coleta_diagnostico' AND final_cost > 0 THEN 
            LEAST(final_cost, 350.00)
          ELSE 0
        END
        WHERE initial_cost IS NULL OR initial_cost = 0;

        -- 4. Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_service_orders_initial_cost ON service_orders(initial_cost);
      `
    });

    if (error) {
      throw error;
    }

    console.log('✅ Coluna initial_cost criada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar coluna:', error.message);
    return false;
  }
}

async function verifyMigration() {
  console.log('📊 Verificando migração de dados...');
  
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select('service_attendance_type, initial_cost, final_cost')
      .not('initial_cost', 'is', null);

    if (error) {
      throw error;
    }

    // Agrupar por tipo de atendimento
    const stats = data.reduce((acc, order) => {
      const type = order.service_attendance_type || 'unknown';
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalInitial: 0,
          totalFinal: 0
        };
      }
      acc[type].count++;
      acc[type].totalInitial += parseFloat(order.initial_cost || 0);
      acc[type].totalFinal += parseFloat(order.final_cost || 0);
      return acc;
    }, {});

    console.log('📈 Estatísticas por tipo de atendimento:');
    Object.entries(stats).forEach(([type, stat]) => {
      console.log(`  ${type}:`);
      console.log(`    - Ordens: ${stat.count}`);
      console.log(`    - Valor inicial médio: R$ ${(stat.totalInitial / stat.count).toFixed(2)}`);
      console.log(`    - Valor final médio: R$ ${(stat.totalFinal / stat.count).toFixed(2)}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error.message);
    return false;
  }
}

async function testNewOrder() {
  console.log('🧪 Testando criação de OS com initial_cost...');
  
  try {
    // Criar uma OS de teste
    const testOrder = {
      client_name: 'Teste Initial Cost',
      client_phone: '48999999999',
      equipment_type: 'Teste',
      description: 'Teste da coluna initial_cost',
      service_attendance_type: 'coleta_diagnostico',
      status: 'scheduled',
      initial_cost: 350.00,
      final_cost: 350.00,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('service_orders')
      .insert(testOrder)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ OS de teste criada:', {
      id: data.id,
      initial_cost: data.initial_cost,
      final_cost: data.final_cost
    });

    // Remover OS de teste
    await supabase
      .from('service_orders')
      .delete()
      .eq('id', data.id);

    console.log('🗑️ OS de teste removida');
    return true;
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando setup da coluna initial_cost...\n');

  // 1. Verificar se a coluna existe
  const columnExists = await checkColumnExists();
  
  if (!columnExists) {
    // 2. Criar a coluna se não existir
    const created = await createInitialCostColumn();
    if (!created) {
      console.error('❌ Falha ao criar coluna. Abortando...');
      process.exit(1);
    }
  }

  // 3. Verificar migração de dados
  await verifyMigration();

  // 4. Testar criação de nova OS
  await testNewOrder();

  console.log('\n✅ Setup concluído com sucesso!');
  console.log('📋 Próximos passos:');
  console.log('  1. Atualizar middleware para usar initial_cost');
  console.log('  2. Testar criação de OS via ClienteChat');
  console.log('  3. Verificar exibição no frontend');
}

// Executar script
main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
