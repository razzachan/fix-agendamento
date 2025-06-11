/**
 * Exportação centralizada de todos os serviços da API
 */

// Cliente API base
export { default as apiClient } from './apiClient';

// Serviços específicos
export { default as serviceOrderService } from './serviceOrderService';
export { default as clientService } from './clientService';
export { default as technicianService } from './technicianService';
export { default as diagnosisService } from './diagnosisService';
export { default as warrantyService } from './warrantyService';

// Tipos
export type { ServiceOrder, ServiceOrderProgress, ServiceOrderFilter } from './serviceOrderService';
export type { Client, ClientFilter } from './clientService';
export type { Technician, TechnicianFilter, TechnicianSchedule, TechnicianWithAvailability } from './technicianService';
export type { DiagnosisData } from './diagnosisService';
export type { WarrantyData, WarrantyServiceOrder } from './warrantyService';

/**
 * Serviço de integração para ativação de garantia em ordens de serviço
 */
export const serviceOrderWarrantyIntegration = {
  /**
   * Verifica se uma ordem de serviço deve ter garantia ativada automaticamente
   * @param serviceOrder Ordem de serviço
   * @param newStatus Novo status da ordem de serviço
   * @returns Verdadeiro se a garantia deve ser ativada
   */
  shouldActivateWarranty: (serviceOrder: any, newStatus: string): boolean => {
    // Verificar se o status é de conclusão
    const isCompletionStatus = newStatus === 'completed' || newStatus === 'warranty_completed';

    // Verificar se a ordem tem configuração de garantia
    const hasWarrantyConfig = serviceOrder.warrantyPeriod && serviceOrder.warrantyPeriod > 0;

    // Não ativar garantia para ordens que já são de garantia
    const isWarrantyOrder = serviceOrder.serviceAttendanceType === 'warranty' ||
                           (serviceOrder.relatedWarrantyOrderId && serviceOrder.relatedWarrantyOrderId.length > 0);

    return isCompletionStatus && hasWarrantyConfig && !isWarrantyOrder;
  },

  /**
   * Ativa a garantia para uma ordem de serviço concluída
   * @param serviceOrder Ordem de serviço concluída
   * @returns Promessa que resolve para verdadeiro se a garantia foi ativada com sucesso
   */
  activateWarrantyOnCompletion: async (serviceOrder: any): Promise<boolean> => {
    try {
      console.log('Ativando garantia para ordem de serviço:', serviceOrder.id);

      // Aqui seria feita a chamada real para o serviço de garantia
      // Por enquanto, apenas simulamos o sucesso

      // Em uma implementação real, usaríamos:
      // const result = await warrantyService.activateWarranty({
      //   serviceOrderId: serviceOrder.id,
      //   warrantyPeriod: serviceOrder.warrantyPeriod || 3, // Padrão de 3 meses
      //   warrantyTerms: serviceOrder.warrantyTerms || 'Garantia padrão'
      // });

      // Simulação de sucesso
      return true;
    } catch (error) {
      console.error('Erro ao ativar garantia:', error);
      return false;
    }
  }
};
