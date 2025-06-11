import { supabase } from '@/integrations/supabase/client';

export interface PaymentStageConfig {
  stage: 'collection' | 'delivery' | 'full';
  amount: number;
  percentage?: number;
  collectionFee?: number;
  description: string;
  requiresPhoto: boolean;
}

export interface ServiceOrderPaymentInfo {
  id: string;
  service_attendance_type: string;
  final_cost?: number;
  status: string;
}

/**
 * Calcula os valores de pagamento por etapa baseado no tipo de atendimento
 */
export class PaymentStageService {
  
  /**
   * Calcula configuração de pagamento para coleta
   */
  static calculateCollectionPayment(serviceOrder: ServiceOrderPaymentInfo): PaymentStageConfig | null {
    const { service_attendance_type, final_cost = 0 } = serviceOrder;

    switch (service_attendance_type) {
      case 'coleta_diagnostico':
        return {
          stage: 'collection',
          amount: 350, // Valor fixo para coleta diagnóstico
          collectionFee: 350,
          description: 'Taxa de coleta para diagnóstico (R$ 350,00)',
          requiresPhoto: true
        };

      case 'coleta_conserto':
        const collectionAmount = final_cost * 0.5; // 50% do valor total
        return {
          stage: 'collection',
          amount: collectionAmount,
          percentage: 50,
          description: `Pagamento da coleta (50% do valor total: R$ ${collectionAmount.toFixed(2)})`,
          requiresPhoto: true
        };

      case 'em_domicilio':
        // Em domicílio não tem coleta separada
        return null;

      default:
        return null;
    }
  }

  /**
   * Calcula configuração de pagamento para entrega
   */
  static async calculateDeliveryPayment(serviceOrder: ServiceOrderPaymentInfo): Promise<PaymentStageConfig | null> {
    const { service_attendance_type, final_cost = 0 } = serviceOrder;

    switch (service_attendance_type) {
      case 'coleta_diagnostico':
        // Para coleta_diagnostico, buscar o valor do orçamento aprovado nos eventos
        let budgetValue = final_cost;

        try {
          const { data: diagnosisData, error } = await supabase
            .from('service_events')
            .select('description')
            .eq('service_order_id', serviceOrder.id)
            .eq('type', 'diagnosis')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && diagnosisData && diagnosisData.length > 0) {
            const description = typeof diagnosisData[0].description === 'string'
              ? JSON.parse(diagnosisData[0].description)
              : diagnosisData[0].description;

            if (description.estimated_cost) {
              budgetValue = parseFloat(description.estimated_cost);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar orçamento do diagnóstico:', error);
        }

        // Valor a receber na entrega = valor do orçamento (taxa de coleta já foi paga)
        return {
          stage: 'delivery',
          amount: budgetValue,
          description: `Pagamento da entrega (Valor do orçamento: R$ ${budgetValue.toFixed(2)})`,
          requiresPhoto: true
        };

      case 'coleta_conserto':
        const remainingAmount = final_cost * 0.5; // 50% restante
        return {
          stage: 'delivery',
          amount: remainingAmount,
          percentage: 50,
          description: `Pagamento da entrega (50% restante do valor total: R$ ${remainingAmount.toFixed(2)})`,
          requiresPhoto: true
        };

      case 'em_domicilio':
        // Em domicílio não tem entrega separada
        return null;

      default:
        return null;
    }
  }

  /**
   * Calcula configuração de pagamento completo (para em domicílio)
   */
  static calculateFullPayment(serviceOrder: ServiceOrderPaymentInfo): PaymentStageConfig | null {
    const { service_attendance_type, final_cost = 0 } = serviceOrder;

    if (service_attendance_type === 'em_domicilio') {
      return {
        stage: 'full',
        amount: final_cost,
        percentage: 100,
        description: `Pagamento completo do serviço em domicílio (R$ ${final_cost.toFixed(2)})`,
        requiresPhoto: true
      };
    }

    return null;
  }

  /**
   * Verifica se já existe pagamento para uma etapa específica
   */
  static async hasPaymentForStage(serviceOrderId: string, stage: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('service_order_id', serviceOrderId)
        .eq('payment_stage', stage)
        .eq('status', 'confirmed');

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Erro ao verificar pagamento da etapa:', error);
      return false;
    }
  }

  /**
   * Registra pagamento de uma etapa
   */
  static async recordStagePayment(
    serviceOrderId: string,
    stageConfig: PaymentStageConfig,
    paymentData: {
      payment_method: string;
      technician_id: string;
      technician_name: string;
      notes?: string;
      discount_amount?: number;
      discount_reason?: string;
    }
  ): Promise<boolean> {
    try {
      const finalAmount = stageConfig.amount - (paymentData.discount_amount || 0);

      const { error } = await supabase
        .from('payments')
        .insert({
          service_order_id: serviceOrderId,
          amount: stageConfig.amount,
          discount_amount: paymentData.discount_amount || 0,
          final_amount: finalAmount,
          payment_method: paymentData.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          payment_stage: stageConfig.stage,
          stage_percentage: stageConfig.percentage,
          collection_fee: stageConfig.collectionFee,
          confirmed_by_technician_id: paymentData.technician_id,
          technician_name: paymentData.technician_name,
          notes: paymentData.notes,
          discount_reason: paymentData.discount_reason,
          status: 'confirmed',
          requires_photo: stageConfig.requiresPhoto,
          photo_uploaded: false // Será atualizado quando foto for enviada
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao registrar pagamento da etapa:', error);
      return false;
    }
  }

  /**
   * Atualiza status de foto enviada para um pagamento
   */
  static async updatePhotoStatus(serviceOrderId: string, stage: string, photoUploaded: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ photo_uploaded: photoUploaded })
        .eq('service_order_id', serviceOrderId)
        .eq('payment_stage', stage);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status da foto:', error);
      return false;
    }
  }

  /**
   * Verifica se todas as validações foram cumpridas para avançar status
   */
  static async canAdvanceStatus(serviceOrderId: string, currentStatus: string, nextStatus: string): Promise<{
    canAdvance: boolean;
    missingRequirements: string[];
  }> {
    const missingRequirements: string[] = [];

    try {
      // Buscar informações da ordem
      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .select('service_attendance_type, final_cost')
        .eq('id', serviceOrderId)
        .single();

      if (orderError) throw orderError;

      const serviceOrder = { 
        id: serviceOrderId, 
        status: currentStatus,
        ...orderData 
      };

      // Verificar requisitos baseado na transição de status
      if (nextStatus === 'collected') {
        // Verificar se precisa de pagamento de coleta
        const collectionConfig = this.calculateCollectionPayment(serviceOrder);
        if (collectionConfig) {
          const hasCollectionPayment = await this.hasPaymentForStage(serviceOrderId, 'collection');
          if (!hasCollectionPayment) {
            missingRequirements.push('Pagamento da coleta não confirmado');
          }
        }

        // Verificar se tem foto (sempre obrigatório para coleta)
        const { data: images } = await supabase
          .from('service_order_images')
          .select('id')
          .eq('service_order_id', serviceOrderId);

        if (!images || images.length === 0) {
          missingRequirements.push('Foto do equipamento não enviada');
        }
      }

      if (nextStatus === 'completed' || nextStatus === 'delivered') {
        // Verificar pagamento de entrega ou completo
        const deliveryConfig = this.calculateDeliveryPayment(serviceOrder);
        const fullConfig = this.calculateFullPayment(serviceOrder);

        if (deliveryConfig) {
          const hasDeliveryPayment = await this.hasPaymentForStage(serviceOrderId, 'delivery');
          if (!hasDeliveryPayment) {
            missingRequirements.push('Pagamento da entrega não confirmado');
          }
        }

        if (fullConfig) {
          const hasFullPayment = await this.hasPaymentForStage(serviceOrderId, 'full');
          if (!hasFullPayment) {
            missingRequirements.push('Pagamento completo não confirmado');
          }
        }
      }

      return {
        canAdvance: missingRequirements.length === 0,
        missingRequirements
      };

    } catch (error) {
      console.error('Erro ao verificar requisitos:', error);
      return {
        canAdvance: false,
        missingRequirements: ['Erro ao verificar requisitos']
      };
    }
  }
}
