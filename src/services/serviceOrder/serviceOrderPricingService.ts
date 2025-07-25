import { ServiceOrder } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PricingCalculation {
  initialCost: number;
  additionalCost: number;
  finalCost: number;
  description: string;
}

/**
 * Serviço para gerenciar a lógica de preços das ordens de serviço
 */
export class ServiceOrderPricingService {
  
  /**
   * Calcula os valores para diferentes tipos de atendimento
   */
  static calculatePricing(
    serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico',
    serviceItems: any[],
    diagnosisEstimatedCost?: number
  ): PricingCalculation {
    
    switch (serviceAttendanceType) {
      case 'em_domicilio':
        return this.calculateDomicilioPricing(serviceItems);
        
      case 'coleta_conserto':
        return this.calculateColetaConsertoPricing(serviceItems);
        
      case 'coleta_diagnostico':
        return this.calculateColetaDiagnosticoPricing(serviceItems, diagnosisEstimatedCost);
        
      default:
        throw new Error(`Tipo de atendimento não suportado: ${serviceAttendanceType}`);
    }
  }

  /**
   * Preços para atendimento em domicílio
   */
  private static calculateDomicilioPricing(serviceItems: any[]): PricingCalculation {
    const totalFromItems = serviceItems.reduce((total, item) => {
      const itemValue = parseFloat(item.serviceValue || '0') / 100;
      return total + itemValue;
    }, 0);

    return {
      initialCost: 0, // Sem sinal
      additionalCost: 0,
      finalCost: totalFromItems,
      description: 'Pagamento único no atendimento'
    };
  }

  /**
   * Preços para coleta conserto (preço fixo conhecido)
   */
  private static calculateColetaConsertoPricing(serviceItems: any[]): PricingCalculation {
    const totalFromItems = serviceItems.reduce((total, item) => {
      const itemValue = parseFloat(item.serviceValue || '0') / 100;
      return total + itemValue;
    }, 0);

    return {
      initialCost: 0, // Sem sinal
      additionalCost: 0,
      finalCost: totalFromItems,
      description: 'Preço fixo para conserto conhecido'
    };
  }

  /**
   * Preços para coleta diagnóstico (sinal + valor adicional após aprovação)
   */
  private static calculateColetaDiagnosticoPricing(
    serviceItems: any[], 
    diagnosisEstimatedCost?: number
  ): PricingCalculation {
    // Valor inicial (sinal) - geralmente R$ 350,00
    const initialCost = serviceItems.reduce((total, item) => {
      const itemValue = parseFloat(item.serviceValue || '0') / 100;
      return total + itemValue;
    }, 0) || 350; // Fallback para R$ 350,00

    // Valor adicional após diagnóstico
    const additionalCost = diagnosisEstimatedCost || 0;

    // Valor final = sinal + valor adicional
    const finalCost = initialCost + additionalCost;

    return {
      initialCost,
      additionalCost,
      finalCost,
      description: diagnosisEstimatedCost 
        ? `Sinal: R$ ${initialCost.toFixed(2)} + Reparo: R$ ${additionalCost.toFixed(2)}`
        : `Sinal: R$ ${initialCost.toFixed(2)} (aguardando diagnóstico)`
    };
  }

  /**
   * Atualiza os valores da OS após aprovação do orçamento
   */
  static async updatePricingAfterQuoteApproval(
    serviceOrderId: string,
    diagnosisEstimatedCost: number
  ): Promise<boolean> {
    try {
      console.log('💰 Atualizando preços após aprovação do orçamento:', {
        serviceOrderId,
        diagnosisEstimatedCost
      });

      // Buscar OS atual
      const { data: order, error: fetchError } = await supabase
        .from('service_orders')
        .select('initial_cost, service_attendance_type')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError || !order) {
        console.error('❌ Erro ao buscar OS:', fetchError);
        return false;
      }

      // Calcular novo valor final
      const initialCost = order.initial_cost || 350; // Sinal já pago
      const finalCost = initialCost + diagnosisEstimatedCost;

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ 
          final_cost: finalCost 
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar valores:', updateError);
        toast.error('Erro ao atualizar valores da OS');
        return false;
      }

      console.log('✅ Valores atualizados:', {
        initialCost,
        additionalCost: diagnosisEstimatedCost,
        finalCost
      });

      toast.success(`Valores atualizados: Total R$ ${finalCost.toFixed(2)}`);
      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar preços:', error);
      toast.error('Erro ao atualizar valores');
      return false;
    }
  }

  /**
   * Obtém o resumo de valores de uma OS
   */
  static getPricingSummary(order: ServiceOrder): {
    initialCost: number;
    additionalCost: number;
    finalCost: number;
    isPaid: boolean;
    description: string;
  } {
    const initialCost = order.initialCost || 0;
    const finalCost = order.finalCost || 0;
    const additionalCost = finalCost - initialCost;

    let description = '';
    let isPaid = false;

    switch (order.serviceAttendanceType) {
      case 'coleta_diagnostico':
        if (additionalCost > 0) {
          description = `Sinal: R$ ${initialCost.toFixed(2)} + Reparo: R$ ${additionalCost.toFixed(2)}`;
        } else {
          description = `Sinal: R$ ${initialCost.toFixed(2)} (aguardando diagnóstico)`;
        }
        isPaid = ['completed', 'paid'].includes(order.status);
        break;

      case 'coleta_conserto':
      case 'em_domicilio':
        description = `Valor total: R$ ${finalCost.toFixed(2)}`;
        isPaid = ['completed', 'paid'].includes(order.status);
        break;
    }

    return {
      initialCost,
      additionalCost,
      finalCost,
      isPaid,
      description
    };
  }
}

export default ServiceOrderPricingService;
