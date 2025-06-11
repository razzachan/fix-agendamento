/**
 * Integração entre ordens de serviço e garantias
 * Implementa o padrão SOLID com Interface Segregation Principle (ISP)
 */
import { ServiceOrder } from '@/types';
import { warrantyService } from './warrantyService';
import { format } from 'date-fns';

// Interface para o serviço de integração de garantia
export interface WarrantyIntegrationService {
  activateWarrantyOnCompletion(serviceOrder: ServiceOrder): Promise<boolean>;
  createWarrantyServiceOrder(originalOrderId: string, notes: string): Promise<ServiceOrder | null>;
  shouldActivateWarranty(serviceOrder: ServiceOrder, newStatus: string): boolean;
  isWarrantyOrderRelatedToAttendanceType(serviceOrder: ServiceOrder, attendanceType: string): Promise<boolean>;
}

/**
 * Serviço de integração entre ordens de serviço e garantias
 * Responsável por ativar garantias automaticamente e criar ordens em garantia
 */
class ServiceOrderWarrantyIntegration implements WarrantyIntegrationService {
  // Período padrão de garantia em meses por tipo de atendimento
  private DEFAULT_WARRANTY_PERIODS = {
    em_domicilio: 3,      // 3 meses para atendimento em domicílio
    coleta_conserto: 3,   // 3 meses para coleta para conserto
    coleta_diagnostico: 3 // 3 meses para coleta para diagnóstico
  };

  /**
   * Ativa a garantia automaticamente quando a ordem de serviço é concluída
   * @param serviceOrder Ordem de serviço concluída
   * @returns Verdadeiro se a garantia foi ativada com sucesso
   */
  async activateWarrantyOnCompletion(serviceOrder: ServiceOrder): Promise<boolean> {
    try {
      // Verificar se a ordem já tem garantia configurada
      if (serviceOrder.warrantyPeriod && serviceOrder.warrantyStartDate && serviceOrder.warrantyEndDate) {
        console.log(`Ordem ${serviceOrder.id} já tem garantia configurada.`);
        return true;
      }

      // Definir o período de garantia com base no tipo de atendimento
      const attendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';
      const warrantyPeriod = serviceOrder.warrantyPeriod ||
        this.DEFAULT_WARRANTY_PERIODS[attendanceType as keyof typeof this.DEFAULT_WARRANTY_PERIODS] || 3;

      // Definir a data de início como a data atual
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');

      // Calcular a data de término
      const endDate = warrantyService.calculateWarrantyEndDate(today, warrantyPeriod);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Obter os termos padrão com base no tipo de atendimento
      const warrantyTerms = warrantyService.getDefaultWarrantyTerms(
        serviceOrder.serviceAttendanceType || 'em_domicilio'
      );

      // Configurar a garantia
      const warrantyData = {
        serviceOrderId: serviceOrder.id,
        warrantyPeriod,
        warrantyStartDate: startDate,
        warrantyEndDate: endDateStr,
        warrantyTerms
      };

      // Salvar a garantia
      await warrantyService.configureWarranty(warrantyData);

      console.log(`Garantia ativada automaticamente para ordem ${serviceOrder.id}. Período: ${warrantyPeriod} meses.`);
      return true;
    } catch (error) {
      console.error(`Erro ao ativar garantia para ordem ${serviceOrder.id}:`, error);
      return false;
    }
  }

  /**
   * Cria uma nova ordem de serviço em garantia
   * @param originalOrderId ID da ordem de serviço original
   * @param notes Notas sobre o atendimento em garantia
   * @returns Nova ordem de serviço em garantia
   */
  async createWarrantyServiceOrder(originalOrderId: string, notes: string): Promise<ServiceOrder | null> {
    try {
      // Verificar se a ordem original está em garantia
      const warrantyStatus = await warrantyService.checkWarrantyStatus(originalOrderId);
      if (!warrantyStatus.inWarranty) {
        console.error(`A ordem ${originalOrderId} não está mais em garantia.`);
        return null;
      }

      // Criar a ordem em garantia
      const newOrder = await warrantyService.createWarrantyServiceOrder(originalOrderId, notes);

      console.log(`Nova ordem em garantia criada: ${newOrder.id}, relacionada à ordem ${originalOrderId}`);
      return newOrder;
    } catch (error) {
      console.error(`Erro ao criar ordem em garantia para ${originalOrderId}:`, error);
      return null;
    }
  }

  /**
   * Verifica se uma ordem de serviço em garantia está relacionada a um tipo específico de atendimento
   * @param serviceOrder Ordem de serviço em garantia
   * @param attendanceType Tipo de atendimento a verificar
   * @returns Verdadeiro se a ordem estiver relacionada ao tipo especificado
   */
  async isWarrantyOrderRelatedToAttendanceType(
    serviceOrder: ServiceOrder,
    attendanceType: string
  ): Promise<boolean> {
    try {
      // Verificar se é uma ordem em garantia
      if (!serviceOrder.relatedWarrantyOrderId) {
        return false;
      }

      // Obter a ordem original
      const originalOrderId = serviceOrder.relatedWarrantyOrderId;

      // Verificar o tipo de atendimento da ordem original
      // Aqui seria necessário buscar a ordem original na API
      // Por enquanto, vamos assumir que a ordem atual tem a informação
      return serviceOrder.serviceAttendanceType === attendanceType;
    } catch (error) {
      console.error(`Erro ao verificar relação de garantia para ordem ${serviceOrder.id}:`, error);
      return false;
    }
  }

  /**
   * Verifica se uma ordem de serviço deve ter garantia ativada automaticamente
   * @param serviceOrder Ordem de serviço
   * @param newStatus Novo status da ordem
   * @returns Verdadeiro se a garantia deve ser ativada
   */
  shouldActivateWarranty(serviceOrder: ServiceOrder, newStatus: string): boolean {
    // Não ativar garantia para ordens que já são em garantia
    if (serviceOrder.relatedWarrantyOrderId) {
      return false;
    }

    // Verificar se a garantia está configurada
    if (!serviceOrder.warrantyPeriod) {
      return false;
    }

    // Verificar o tipo de atendimento
    const attendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';

    // Status de conclusão por tipo de atendimento
    const completionStatusesByType: Record<string, string[]> = {
      em_domicilio: ['completed', 'concluido'],
      coleta_conserto: ['completed', 'delivered', 'entregue'],
      coleta_diagnostico: ['completed', 'delivered', 'entregue']
    };

    // Obter os status de conclusão para o tipo de atendimento
    const completionStatuses = completionStatusesByType[attendanceType] || ['completed'];

    // Verificar se o novo status é um status de conclusão
    return completionStatuses.includes(newStatus.toLowerCase());
  }
}

// Exportar uma instância única do serviço
export const serviceOrderWarrantyIntegration = new ServiceOrderWarrantyIntegration();

export default serviceOrderWarrantyIntegration;
