import { supabase } from '@/integrations/supabase/client';

/**
 * Função para migrar valores da descrição para o campo final_cost
 * Útil para corrigir OS existentes que têm valores apenas na descrição
 */
export async function migrateFinalCostValues(): Promise<{
  updated: number;
  errors: number;
  details: Array<{ id: string; status: 'success' | 'error'; message: string }>;
}> {
  console.log('🔄 Iniciando migração de valores final_cost...');
  
  const results = {
    updated: 0,
    errors: 0,
    details: [] as Array<{ id: string; status: 'success' | 'error'; message: string }>
  };

  try {
    // Buscar OS que têm final_cost = 0 mas têm valores na descrição
    const { data: orders, error } = await supabase
      .from('service_orders')
      .select('id, description, final_cost, service_attendance_type')
      .eq('final_cost', 0)
      .like('description', '%Valor estimado: R$%');

    if (error) {
      console.error('❌ Erro ao buscar ordens:', error);
      throw error;
    }

    console.log(`📊 Encontradas ${orders?.length || 0} ordens para migração`);

    if (!orders || orders.length === 0) {
      console.log('✅ Nenhuma ordem precisa de migração');
      return results;
    }

    // Processar cada ordem
    for (const order of orders) {
      try {
        // Extrair valor da descrição usando regex
        const valueMatch = order.description.match(/Valor estimado: R\$ ([\d,]+\.?\d*)/);
        
        if (valueMatch) {
          const valueStr = valueMatch[1].replace(',', '');
          const finalCost = parseFloat(valueStr);
          
          if (finalCost > 0) {
            // Atualizar final_cost no banco
            const { error: updateError } = await supabase
              .from('service_orders')
              .update({ final_cost: finalCost })
              .eq('id', order.id);

            if (updateError) {
              console.error(`❌ Erro ao atualizar OS ${order.id}:`, updateError);
              results.errors++;
              results.details.push({
                id: order.id,
                status: 'error',
                message: `Erro: ${updateError.message}`
              });
            } else {
              console.log(`✅ OS ${order.id} atualizada: R$ ${finalCost.toFixed(2)}`);
              results.updated++;
              results.details.push({
                id: order.id,
                status: 'success',
                message: `Valor atualizado: R$ ${finalCost.toFixed(2)}`
              });
            }
          } else {
            results.details.push({
              id: order.id,
              status: 'error',
              message: 'Valor inválido extraído da descrição'
            });
          }
        } else {
          results.details.push({
            id: order.id,
            status: 'error',
            message: 'Não foi possível extrair valor da descrição'
          });
        }
      } catch (orderError) {
        console.error(`❌ Erro ao processar OS ${order.id}:`, orderError);
        results.errors++;
        results.details.push({
          id: order.id,
          status: 'error',
          message: `Erro no processamento: ${orderError}`
        });
      }
    }

    console.log(`🎉 Migração concluída: ${results.updated} atualizadas, ${results.errors} erros`);
    return results;

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

/**
 * Função para verificar o status dos valores final_cost
 */
export async function checkFinalCostStatus(): Promise<{
  total: number;
  withValues: number;
  withoutValues: number;
  needsMigration: number;
}> {
  try {
    // Total de OS
    const { count: total } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });

    // OS com valores
    const { count: withValues } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .gt('final_cost', 0);

    // OS sem valores
    const { count: withoutValues } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('final_cost', 0);

    // OS que precisam de migração (têm valor na descrição mas não no final_cost)
    const { count: needsMigration } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('final_cost', 0)
      .like('description', '%Valor estimado: R$%');

    return {
      total: total || 0,
      withValues: withValues || 0,
      withoutValues: withoutValues || 0,
      needsMigration: needsMigration || 0
    };
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  }
}
