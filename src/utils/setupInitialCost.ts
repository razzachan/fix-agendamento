import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitário para verificar e configurar a coluna initial_cost
 */
export class InitialCostSetup {
  
  /**
   * Verifica se a coluna initial_cost existe
   */
  static async checkColumnExists(): Promise<boolean> {
    try {
      console.log('🔍 Verificando se a coluna initial_cost existe...');
      
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
      console.error('❌ Erro ao verificar coluna:', error);
      return false;
    }
  }

  /**
   * Executa SQL para criar a coluna initial_cost
   */
  static async createColumn(): Promise<boolean> {
    try {
      console.log('🔧 Tentando criar coluna initial_cost via SQL...');
      
      // Tentar executar SQL diretamente
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE service_orders 
          ADD COLUMN IF NOT EXISTS initial_cost DECIMAL(10,2) DEFAULT 0;
        `
      });

      if (error) {
        console.warn('⚠️ Não foi possível executar SQL diretamente:', error.message);
        return false;
      }

      console.log('✅ Coluna criada via SQL');
      return true;
    } catch (error) {
      console.warn('⚠️ Erro ao executar SQL:', error);
      return false;
    }
  }

  /**
   * Migra dados existentes para definir initial_cost
   */
  static async migrateExistingData(): Promise<void> {
    try {
      console.log('📊 Migrando dados existentes...');
      
      // Buscar ordens de coleta diagnóstico sem initial_cost
      const { data: orders, error: fetchError } = await supabase
        .from('service_orders')
        .select('id, service_attendance_type, final_cost, initial_cost')
        .eq('service_attendance_type', 'coleta_diagnostico')
        .or('initial_cost.is.null,initial_cost.eq.0');

      if (fetchError) {
        throw fetchError;
      }

      if (!orders || orders.length === 0) {
        console.log('✅ Nenhuma ordem precisa de migração');
        return;
      }

      console.log(`📋 Encontradas ${orders.length} ordens para migrar`);

      // Atualizar cada ordem
      for (const order of orders) {
        const initialCost = Math.min(order.final_cost || 350, 350); // Máximo R$ 350
        
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ initial_cost: initialCost })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ordem ${order.id}:`, updateError);
        } else {
          console.log(`✅ Ordem ${order.id} atualizada: R$ ${initialCost}`);
        }
      }

      console.log('✅ Migração concluída');
    } catch (error) {
      console.error('❌ Erro na migração:', error);
    }
  }

  /**
   * Testa a criação de uma nova OS com initial_cost
   */
  static async testNewOrder(): Promise<boolean> {
    try {
      console.log('🧪 Testando criação de OS com initial_cost...');
      
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
      console.error('❌ Erro no teste:', error);
      return false;
    }
  }

  /**
   * Verifica estatísticas dos valores
   */
  static async getStatistics(): Promise<void> {
    try {
      console.log('📊 Verificando estatísticas...');
      
      const { data, error } = await supabase
        .from('service_orders')
        .select('service_attendance_type, initial_cost, final_cost')
        .not('final_cost', 'is', null);

      if (error) {
        throw error;
      }

      // Agrupar por tipo
      const stats = data.reduce((acc: any, order) => {
        const type = order.service_attendance_type || 'unknown';
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            totalInitial: 0,
            totalFinal: 0
          };
        }
        acc[type].count++;
        acc[type].totalInitial += parseFloat(order.initial_cost || '0');
        acc[type].totalFinal += parseFloat(order.final_cost || '0');
        return acc;
      }, {});

      console.log('📈 Estatísticas por tipo:');
      Object.entries(stats).forEach(([type, stat]: [string, any]) => {
        console.log(`  ${type}:`);
        console.log(`    - Ordens: ${stat.count}`);
        console.log(`    - Inicial médio: R$ ${(stat.totalInitial / stat.count).toFixed(2)}`);
        console.log(`    - Final médio: R$ ${(stat.totalFinal / stat.count).toFixed(2)}`);
      });
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
    }
  }

  /**
   * Executa o setup completo
   */
  static async runSetup(): Promise<boolean> {
    try {
      console.log('🚀 Iniciando setup da coluna initial_cost...\n');

      // 1. Verificar se existe
      const exists = await this.checkColumnExists();
      
      if (!exists) {
        // 2. Tentar criar
        const created = await this.createColumn();
        if (!created) {
          console.error('❌ Não foi possível criar a coluna automaticamente');
          console.log('📋 Execute manualmente no SQL Editor do Supabase:');
          console.log('ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS initial_cost DECIMAL(10,2) DEFAULT 0;');
          return false;
        }
      }

      // 3. Migrar dados
      await this.migrateExistingData();

      // 4. Testar
      const testPassed = await this.testNewOrder();
      
      // 5. Estatísticas
      await this.getStatistics();

      if (testPassed) {
        console.log('\n✅ Setup concluído com sucesso!');
        return true;
      } else {
        console.log('\n⚠️ Setup parcialmente concluído (teste falhou)');
        return false;
      }
    } catch (error) {
      console.error('💥 Erro no setup:', error);
      return false;
    }
  }
}

export default InitialCostSetup;
