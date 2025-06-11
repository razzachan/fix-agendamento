import { apiClient } from '../api';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface ProgressEntry {
  id: string;
  serviceOrderId: string;
  status: string;
  notes: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateProgressEntryParams {
  serviceOrderId: string;
  status: string;
  notes?: string;
  createdBy?: string;
}

const serviceOrderProgressService = {
  /**
   * Obtém o histórico de progresso de uma ordem de serviço
   *
   * @param serviceOrderId ID da ordem de serviço
   * @returns Lista de entradas de progresso
   */
  async getServiceOrderProgress(serviceOrderId: string): Promise<ProgressEntry[]> {
    try {
      // Verificar se a API externa está configurada
      const apiUrl = import.meta.env.VITE_API_URL;

      if (apiUrl) {
        // Tentar usar a API REST primeiro (silenciosamente)
        try {
          const response = await apiClient.get(`/service-order-progress/${serviceOrderId}`);
          if (response.data && response.data.success) {
            return response.data.data;
          }
        } catch (error) {
          // API externa não disponível, usando Supabase diretamente (comportamento normal)
        }
      }

      // Fallback para Supabase direto
      const { data, error } = await supabase
        .from('service_order_progress')
        .select('id, service_order_id, status, notes, created_at, created_by')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar histórico de progresso:', error);
        return [];
      }

      // Mapear os dados do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
      return data.map(item => ({
        id: item.id,
        serviceOrderId: item.service_order_id,
        status: item.status,
        notes: item.notes,
        createdAt: item.created_at,
        createdBy: item.created_by
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico de progresso:', error);
      return [];
    }
  },

  /**
   * Adiciona uma nova entrada de progresso
   *
   * @param params Parâmetros para criar a entrada
   * @returns A entrada criada ou null em caso de erro
   */
  async addProgressEntry(params: CreateProgressEntryParams): Promise<ProgressEntry | null> {
    try {
      // Verificar se a API externa está configurada
      const apiUrl = import.meta.env.VITE_API_URL;

      if (apiUrl) {
        // Tentar usar a API REST primeiro (silenciosamente)
        try {
          const response = await apiClient.post('/service-order-progress', params);
          if (response.data && response.data.success) {
            return response.data.data;
          }
        } catch (error) {
          // API externa não disponível, usando Supabase diretamente (comportamento normal)
        }
      }

      // Fallback para Supabase direto
      const entry = {
        id: uuidv4(),
        service_order_id: params.serviceOrderId,
        status: params.status,
        notes: params.notes || '',
        created_at: new Date().toISOString(),
        created_by: params.createdBy || 'Sistema'
      };

      const { data, error } = await supabase
        .from('service_order_progress')
        .insert(entry)
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar entrada de progresso:', error);
        return null;
      }

      return {
        id: data.id,
        serviceOrderId: data.service_order_id,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        createdBy: data.created_by
      };
    } catch (error) {
      console.error('Erro ao adicionar entrada de progresso:', error);
      return null;
    }
  },

  /**
   * Atualiza o status de uma ordem de serviço e adiciona uma entrada no histórico
   *
   * @param serviceOrderId ID da ordem de serviço
   * @param newStatus Novo status
   * @param notes Observações sobre a mudança de status
   * @param createdBy Quem criou a entrada
   * @returns Verdadeiro se a atualização foi bem-sucedida
   */
  async updateServiceOrderStatus(
    serviceOrderId: string,
    newStatus: string,
    notes?: string,
    createdBy?: string
  ): Promise<boolean> {
    try {
      // Atualizar usando o sistema centralizado (com notificações automáticas)
      const { updateServiceOrder } = await import('@/services/serviceOrder/mutations/updateServiceOrder');

      const success = await updateServiceOrder(serviceOrderId, {
        status: newStatus as any,
        updatedByName: createdBy || 'Sistema',
        updatedById: null
      });

      if (!success) {
        console.error('Erro ao atualizar status da ordem de serviço');
        return false;
      }

      // Adicionar entrada no histórico
      const result = await this.addProgressEntry({
        serviceOrderId,
        status: newStatus,
        notes: notes || `Status alterado para ${newStatus}`,
        createdBy
      });

      return result !== null;
    } catch (error) {
      console.error('Erro ao atualizar status da ordem de serviço:', error);
      return false;
    }
  }
};

export default serviceOrderProgressService;
