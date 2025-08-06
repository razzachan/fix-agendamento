/**
 * 🔧 UTILITÁRIOS DE SINCRONIZAÇÃO DO CALENDÁRIO
 * 
 * Funções para garantir consistência entre service_orders e scheduled_services
 * no sistema de drag and drop do calendário.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Sincroniza uma service_order com seu scheduled_service correspondente
 */
export async function syncServiceOrderWithScheduledService(
  serviceOrderId: string, 
  newScheduledDate: Date
): Promise<boolean> {
  try {
    console.warn(`🔄 [SYNC] Sincronizando ordem ${serviceOrderId} com data ${newScheduledDate.toISOString()}`);

    // 1. Atualizar service_order
    const { error: orderError } = await supabase
      .from('service_orders')
      .update({
        scheduled_date: newScheduledDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceOrderId);

    if (orderError) {
      console.error('❌ [SYNC] Erro ao atualizar service_order:', orderError);
      return false;
    }

    // 2. Procurar e atualizar scheduled_service correspondente
    const { data: scheduledService, error: findError } = await supabase
      .from('scheduled_services')
      .select('id')
      .eq('service_order_id', serviceOrderId)
      .single();

    if (!findError && scheduledService) {
      const endTime = new Date(newScheduledDate.getTime() + 60 * 60 * 1000); // +1 hora

      const { error: serviceError } = await supabase
        .from('scheduled_services')
        .update({
          scheduled_start_time: newScheduledDate.toISOString(),
          scheduled_end_time: endTime.toISOString()
        })
        .eq('id', scheduledService.id);

      if (serviceError) {
        console.warn('⚠️ [SYNC] Erro ao atualizar scheduled_service:', serviceError);
        // Não falhar se apenas o scheduled_service der erro
      } else {
        console.warn('✅ [SYNC] Scheduled_service também atualizado!');
      }
    } else {
      console.warn('ℹ️ [SYNC] Nenhum scheduled_service encontrado para esta ordem');
    }

    console.warn('✅ [SYNC] Sincronização concluída com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ [SYNC] Erro na sincronização:', error);
    return false;
  }
}

/**
 * Verifica se há inconsistências entre service_orders e scheduled_services
 */
export async function checkCalendarConsistency(): Promise<{
  consistent: boolean;
  issues: string[];
}> {
  try {
    console.log('🔍 [CONSISTENCY] Verificando consistência do calendário...');

    const issues: string[] = [];

    // Buscar todas as ordens com scheduled_services
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`
        id,
        scheduled_date,
        scheduled_services (
          id,
          scheduled_start_time
        )
      `)
      .not('scheduled_date', 'is', null);

    if (ordersError) {
      issues.push(`Erro ao buscar ordens: ${ordersError.message}`);
      return { consistent: false, issues };
    }

    // Verificar inconsistências
    orders?.forEach(order => {
      if (order.scheduled_services && order.scheduled_services.length > 0) {
        const service = order.scheduled_services[0];
        const orderDate = new Date(order.scheduled_date).getTime();
        const serviceDate = new Date(service.scheduled_start_time).getTime();

        // Permitir diferença de até 1 minuto (para compensar precisão)
        if (Math.abs(orderDate - serviceDate) > 60000) {
          issues.push(
            `Ordem ${order.id}: service_order (${order.scheduled_date}) != scheduled_service (${service.scheduled_start_time})`
          );
        }
      }
    });

    const consistent = issues.length === 0;
    console.log(`🔍 [CONSISTENCY] Resultado: ${consistent ? 'Consistente' : `${issues.length} problemas encontrados`}`);

    return { consistent, issues };

  } catch (error) {
    console.error('❌ [CONSISTENCY] Erro na verificação:', error);
    return { 
      consistent: false, 
      issues: [`Erro na verificação: ${error.message}`] 
    };
  }
}

/**
 * Corrige inconsistências encontradas (usa service_order como fonte da verdade)
 */
export async function fixCalendarInconsistencies(): Promise<{
  success: boolean;
  fixed: number;
  errors: string[];
}> {
  try {
    console.warn('🔧 [FIX] Iniciando correção de inconsistências...');

    const { consistent, issues } = await checkCalendarConsistency();
    
    if (consistent) {
      console.log('✅ [FIX] Nenhuma inconsistência encontrada!');
      return { success: true, fixed: 0, errors: [] };
    }

    const errors: string[] = [];
    let fixed = 0;

    // Buscar todas as ordens com problemas
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`
        id,
        scheduled_date,
        scheduled_services (
          id,
          scheduled_start_time
        )
      `)
      .not('scheduled_date', 'is', null);

    if (ordersError) {
      errors.push(`Erro ao buscar ordens: ${ordersError.message}`);
      return { success: false, fixed: 0, errors };
    }

    // Corrigir cada inconsistência
    for (const order of orders || []) {
      if (order.scheduled_services && order.scheduled_services.length > 0) {
        const service = order.scheduled_services[0];
        const orderDate = new Date(order.scheduled_date).getTime();
        const serviceDate = new Date(service.scheduled_start_time).getTime();

        // Se há diferença significativa, corrigir
        if (Math.abs(orderDate - serviceDate) > 60000) {
          try {
            const newEndTime = new Date(new Date(order.scheduled_date).getTime() + 60 * 60 * 1000);

            const { error: updateError } = await supabase
              .from('scheduled_services')
              .update({
                scheduled_start_time: order.scheduled_date,
                scheduled_end_time: newEndTime.toISOString()
              })
              .eq('id', service.id);

            if (updateError) {
              errors.push(`Erro ao corrigir ordem ${order.id}: ${updateError.message}`);
            } else {
              console.warn(`✅ [FIX] Ordem ${order.id} corrigida!`);
              fixed++;
            }
          } catch (fixError) {
            errors.push(`Erro ao corrigir ordem ${order.id}: ${fixError.message}`);
          }
        }
      }
    }

    console.warn(`🔧 [FIX] Correção concluída: ${fixed} itens corrigidos, ${errors.length} erros`);

    return {
      success: errors.length === 0,
      fixed,
      errors
    };

  } catch (error) {
    console.error('❌ [FIX] Erro na correção:', error);
    return {
      success: false,
      fixed: 0,
      errors: [`Erro geral: ${error.message}`]
    };
  }
}

/**
 * Função de debug para verificar o estado atual do calendário
 */
export async function debugCalendarState(serviceOrderId?: string): Promise<void> {
  try {
    console.group('🔍 [DEBUG] Estado do Calendário');

    if (serviceOrderId) {
      // Debug específico de uma ordem
      const { data: order, error: orderError } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          scheduled_date,
          status,
          updated_at
        `)
        .eq('id', serviceOrderId)
        .single();

      if (orderError) {
        console.error('❌ Erro ao buscar ordem:', orderError);
        return;
      }

      console.log('📋 Service Order:', order);

      const { data: service, error: serviceError } = await supabase
        .from('scheduled_services')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .single();

      if (serviceError) {
        console.log('ℹ️ Nenhum scheduled_service encontrado');
      } else {
        console.log('📅 Scheduled Service:', service);
        
        // Verificar consistência
        const orderDate = new Date(order.scheduled_date).getTime();
        const serviceDate = new Date(service.scheduled_start_time).getTime();
        const diff = Math.abs(orderDate - serviceDate);
        
        console.log(`🔍 Diferença de tempo: ${diff}ms (${diff > 60000 ? '❌ INCONSISTENTE' : '✅ OK'})`);
      }
    } else {
      // Debug geral
      const { consistent, issues } = await checkCalendarConsistency();
      console.log(`📊 Consistência geral: ${consistent ? '✅ OK' : '❌ PROBLEMAS'}`);
      if (!consistent) {
        console.log('🚨 Problemas encontrados:', issues);
      }
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    console.groupEnd();
  }
}
