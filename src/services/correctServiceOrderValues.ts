import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para corrigir os valores das ordens de serviço
 * Calcula final_cost baseado em initial_cost + estimated_cost do diagnóstico
 */
export class CorrectServiceOrderValuesService {
  
  /**
   * Corrige os valores de todas as ordens de serviço
   */
  static async correctAllOrderValues(): Promise<void> {
    try {
      console.log('🎯 [CorrectValues] Iniciando correção de valores das ordens...');
      
      // 1. Buscar todas as ordens com seus diagnósticos
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          initial_cost,
          final_cost,
          service_attendance_type,
          equipment_diagnostics (
            estimated_cost
          )
        `);

      if (error) {
        console.error('❌ Erro ao buscar ordens:', error);
        return;
      }

      if (!orders || orders.length === 0) {
        console.log('ℹ️ Nenhuma ordem encontrada');
        return;
      }

      console.log(`📋 Encontradas ${orders.length} ordens para processar`);

      // 2. Processar cada ordem
      let correctedCount = 0;
      
      for (const order of orders) {
        const correctedValue = this.calculateCorrectFinalCost(order);
        
        // Só atualizar se o valor estiver diferente
        if (correctedValue !== order.final_cost) {
          const { error: updateError } = await supabase
            .from('service_orders')
            .update({ final_cost: correctedValue })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar ordem ${order.id}:`, updateError);
          } else {
            console.log(`✅ Ordem ${order.id}: R$ ${order.final_cost} → R$ ${correctedValue}`);
            correctedCount++;
          }
        }
      }

      console.log(`✅ Correção concluída: ${correctedCount} ordens atualizadas`);
      
    } catch (error) {
      console.error('❌ Erro na correção de valores:', error);
    }
  }

  /**
   * Calcula o valor final correto baseado na lógica:
   * final_cost = initial_cost + estimated_cost (do diagnóstico)
   */
  private static calculateCorrectFinalCost(order: any): number {
    const initialCost = order.initial_cost || 0;
    const estimatedCost = order.equipment_diagnostics?.[0]?.estimated_cost || 0;
    
    // Se não há diagnóstico, final_cost = initial_cost
    if (estimatedCost === 0) {
      return initialCost;
    }
    
    // Se há diagnóstico, final_cost = initial_cost + estimated_cost
    return initialCost + estimatedCost;
  }

  /**
   * Corrige uma ordem específica
   */
  static async correctSingleOrder(orderId: string): Promise<boolean> {
    try {
      console.log(`🎯 [CorrectValues] Corrigindo ordem ${orderId}...`);
      
      // Buscar a ordem com diagnóstico
      const { data: order, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          initial_cost,
          final_cost,
          equipment_diagnostics (
            estimated_cost
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar ordem:', error);
        return false;
      }

      if (!order) {
        console.log('ℹ️ Ordem não encontrada');
        return false;
      }

      // Calcular valor correto
      const correctedValue = this.calculateCorrectFinalCost(order);
      
      // Atualizar se necessário
      if (correctedValue !== order.final_cost) {
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ final_cost: correctedValue })
          .eq('id', orderId);

        if (updateError) {
          console.error('❌ Erro ao atualizar ordem:', updateError);
          return false;
        }

        console.log(`✅ Ordem ${orderId}: R$ ${order.final_cost} → R$ ${correctedValue}`);
        return true;
      }

      console.log(`ℹ️ Ordem ${orderId} já está com valor correto: R$ ${order.final_cost}`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro na correção da ordem:', error);
      return false;
    }
  }

  /**
   * Gera relatório dos valores atuais vs corretos
   */
  static async generateValuesReport(): Promise<void> {
    try {
      console.log('📊 [CorrectValues] Gerando relatório de valores...');
      
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          initial_cost,
          final_cost,
          service_attendance_type,
          equipment_diagnostics (
            estimated_cost
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erro ao buscar ordens:', error);
        return;
      }

      if (!orders || orders.length === 0) {
        console.log('ℹ️ Nenhuma ordem encontrada');
        return;
      }

      console.log('\n📋 RELATÓRIO DE VALORES:');
      console.log('='.repeat(80));
      
      let needsCorrection = 0;
      
      for (const order of orders) {
        const correctValue = this.calculateCorrectFinalCost(order);
        const needsUpdate = correctValue !== order.final_cost;
        
        if (needsUpdate) needsCorrection++;
        
        console.log(`
🔍 Ordem: ${order.order_number || order.id.substring(0, 8)}
👤 Cliente: ${order.client_name}
💰 Atual: R$ ${order.final_cost || 0}
✅ Correto: R$ ${correctValue}
${needsUpdate ? '⚠️  PRECISA CORREÇÃO' : '✅ OK'}
${'─'.repeat(40)}`);
      }
      
      console.log(`\n📊 RESUMO: ${needsCorrection} ordens precisam de correção`);
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
    }
  }
}
