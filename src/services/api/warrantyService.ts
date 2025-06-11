/**
 * Serviço para gerenciar garantias de ordens de serviço
 * Implementa o padrão SOLID com responsabilidade única para gerenciamento de garantias
 */
import apiClient from './apiClient';
import { ServiceOrder } from '@/types';
import { format } from 'date-fns';

// Interface para os dados de garantia
export interface WarrantyData {
  serviceOrderId: string;
  warrantyPeriod: number;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyTerms?: string | null;
}

// Interface para ordens de serviço em garantia
export interface WarrantyServiceOrder {
  id: string;
  originalOrderId: string;
  warrantyOrderId: string;
  createdAt: string;
  notes?: string | null;
}

// Interface para notificações de garantia
export interface WarrantyNotification {
  serviceOrderId: string;
  clientId: string;
  clientName: string;
  daysRemaining: number;
  warrantyEndDate: string;
  equipmentType: string;
  equipmentModel: string;
}

/**
 * Serviço de garantias - Responsável por todas as operações relacionadas a garantias
 * Segue o princípio de Responsabilidade Única (SRP) do SOLID
 */
class WarrantyService {
  // Obter configuração de garantia por ID da ordem de serviço
  async getWarrantyByServiceOrderId(serviceOrderId: string): Promise<WarrantyData | null> {
    try {
      const response = await apiClient.get<{ success: boolean, data: WarrantyData }>(`/warranty/service-order/${serviceOrderId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar garantia para ordem de serviço ${serviceOrderId}:`, error);
      return null;
    }
  }

  // Configurar garantia para uma ordem de serviço
  async configureWarranty(data: WarrantyData): Promise<WarrantyData> {
    try {
      const response = await apiClient.post<{ success: boolean, data: WarrantyData }>('/warranty', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao configurar garantia:', error);
      throw error;
    }
  }

  // Atualizar configuração de garantia
  async updateWarranty(serviceOrderId: string, data: Partial<WarrantyData>): Promise<WarrantyData> {
    try {
      const response = await apiClient.put<{ success: boolean, data: WarrantyData }>(`/warranty/service-order/${serviceOrderId}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar garantia para ordem de serviço ${serviceOrderId}:`, error);
      throw error;
    }
  }

  // Ativar garantia automaticamente quando a ordem de serviço for concluída
  async activateWarranty(serviceOrderId: string): Promise<boolean> {
    try {
      // Obter a ordem de serviço
      const response = await apiClient.get<{ success: boolean, data: ServiceOrder }>(`/service-orders/${serviceOrderId}`);
      const serviceOrder = response.data;

      // Verificar se a ordem tem garantia configurada
      if (!serviceOrder.warrantyPeriod) {
        console.log(`Ordem ${serviceOrderId} não tem garantia configurada.`);
        return false;
      }

      // Definir a data de início como a data atual
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');

      // Calcular a data de término
      const endDate = this.calculateWarrantyEndDate(today, serviceOrder.warrantyPeriod);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Atualizar a garantia
      await this.updateWarranty(serviceOrderId, {
        warrantyStartDate: startDate,
        warrantyEndDate: endDateStr
      });

      console.log(`Garantia ativada para ordem ${serviceOrderId}. Início: ${startDate}, Término: ${endDateStr}`);
      return true;
    } catch (error) {
      console.error(`Erro ao ativar garantia para ordem ${serviceOrderId}:`, error);
      return false;
    }
  }

  // Criar uma nova ordem de serviço em garantia
  async createWarrantyServiceOrder(originalOrderId: string, notes?: string): Promise<ServiceOrder> {
    try {
      // Verificar se a ordem original está em garantia
      const warrantyStatus = await this.checkWarrantyStatus(originalOrderId);
      if (!warrantyStatus.inWarranty) {
        throw new Error('A ordem de serviço original não está mais em garantia.');
      }

      const response = await apiClient.post<{ success: boolean, data: ServiceOrder }>('/warranty/service-orders', {
        originalOrderId,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar ordem de serviço em garantia:', error);
      throw error;
    }
  }

  // Obter ordens de serviço em garantia relacionadas a uma ordem original
  async getRelatedWarrantyOrders(originalOrderId: string): Promise<ServiceOrder[]> {
    try {
      const response = await apiClient.get<{ success: boolean, data: ServiceOrder[] }>(`/warranty/related/${originalOrderId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar ordens em garantia relacionadas a ${originalOrderId}:`, error);
      return [];
    }
  }

  // Verificar se uma ordem de serviço está em garantia
  async checkWarrantyStatus(serviceOrderId: string): Promise<{ inWarranty: boolean, daysRemaining: number | null }> {
    try {
      // Primeiro, tentar obter do backend
      try {
        const response = await apiClient.get<{
          success: boolean,
          data: { inWarranty: boolean, daysRemaining: number | null }
        }>(`/warranty/status/${serviceOrderId}`);
        return response.data;
      } catch (apiError) {
        // Se falhar, calcular localmente
        console.warn(`Erro ao obter status de garantia da API, calculando localmente:`, apiError);

        // Obter a ordem de serviço
        const orderResponse = await apiClient.get<{ success: boolean, data: ServiceOrder }>(`/service-orders/${serviceOrderId}`);
        const serviceOrder = orderResponse.data;

        // Verificar se tem garantia configurada
        if (!serviceOrder.warrantyPeriod || !serviceOrder.warrantyStartDate || !serviceOrder.warrantyEndDate) {
          return { inWarranty: false, daysRemaining: null };
        }

        // Calcular status
        const today = new Date();
        const endDate = new Date(serviceOrder.warrantyEndDate);
        const inWarranty = endDate >= today;
        const daysRemaining = inWarranty ? this.calculateRemainingDays(today, endDate) : 0;

        return { inWarranty, daysRemaining };
      }
    } catch (error) {
      console.error(`Erro ao verificar status de garantia para ordem ${serviceOrderId}:`, error);
      return { inWarranty: false, daysRemaining: null };
    }
  }

  // Obter ordens de serviço com garantia próxima do vencimento
  async getWarrantiesNearingExpiration(thresholdDays: number = 15): Promise<WarrantyNotification[]> {
    try {
      const response = await apiClient.get<{
        success: boolean,
        data: WarrantyNotification[]
      }>(`/warranty/expiring-soon/${thresholdDays}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar garantias próximas do vencimento:`, error);
      return [];
    }
  }

  // Obter termos de garantia padrão com base no tipo de atendimento
  getDefaultWarrantyTerms(attendanceType: string): string {
    switch (attendanceType) {
      case 'em_domicilio':
        return 'Garantia de 3 meses para peças e serviços realizados em domicílio. Cobre defeitos de fabricação e instalação.';
      case 'coleta_conserto':
        return 'Garantia de 3 meses para peças e serviços realizados em oficina. Cobre defeitos de fabricação e mão de obra.';
      case 'coleta_diagnostico':
        return 'Garantia de 3 meses para peças e serviços após aprovação do diagnóstico. Cobre defeitos de fabricação e mão de obra.';
      default:
        return 'Garantia padrão de 3 meses para peças e serviços.';
    }
  }

  // Utilitário para calcular a data de término da garantia
  calculateWarrantyEndDate(startDate: Date, periodInMonths: number): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + periodInMonths);
    return endDate;
  }

  // Utilitário para verificar se uma data está dentro do período de garantia
  isDateInWarrantyPeriod(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  // Utilitário para calcular dias restantes de garantia
  calculateRemainingDays(currentDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}

// Exportar uma instância única do serviço
export const warrantyService = new WarrantyService();

export default warrantyService;
