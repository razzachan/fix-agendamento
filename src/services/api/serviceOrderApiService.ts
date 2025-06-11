/**
 * Serviço para comunicação com os endpoints de ordens de serviço da API
 */

import apiClient from './apiClient';
import { ServiceOrder } from '@/types';

// Interfaces para as respostas da API
interface ServiceOrderResponse {
  success: boolean;
  message?: string;
  data: ServiceOrder;
}

interface ServiceOrdersListResponse {
  success: boolean;
  data: ServiceOrder[];
}

interface ServiceOrderStatusUpdateData {
  status: string;
}

interface TechnicianAssignmentData {
  technicianId: string;
}

// Serviço de ordens de serviço
export const serviceOrderApiService = {
  // Obter todas as ordens de serviço
  async getAllServiceOrders(includeArchived: boolean = false): Promise<ServiceOrder[]> {
    const response = await apiClient.get<ServiceOrdersListResponse>('/service-orders', {
      includeArchived: includeArchived ? 'true' : 'false'
    });
    
    return response.data;
  },
  
  // Obter uma ordem de serviço específica
  async getServiceOrderById(id: string): Promise<ServiceOrder> {
    const response = await apiClient.get<ServiceOrderResponse>(`/service-orders/${id}`);
    
    return response.data;
  },
  
  // Obter ordens de serviço por cliente
  async getServiceOrdersByClientId(clientId: string, includeArchived: boolean = false): Promise<ServiceOrder[]> {
    const response = await apiClient.get<ServiceOrdersListResponse>(`/service-orders/client/${clientId}`, {
      includeArchived: includeArchived ? 'true' : 'false'
    });
    
    return response.data;
  },
  
  // Obter ordens de serviço por técnico
  async getServiceOrdersByTechnicianId(technicianId: string, includeArchived: boolean = false): Promise<ServiceOrder[]> {
    const response = await apiClient.get<ServiceOrdersListResponse>(`/service-orders/technician/${technicianId}`, {
      includeArchived: includeArchived ? 'true' : 'false'
    });
    
    return response.data;
  },
  
  // Criar uma nova ordem de serviço
  async createServiceOrder(serviceOrder: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrderResponse>('/service-orders', serviceOrder);
    
    return response.data;
  },
  
  // Atualizar uma ordem de serviço
  async updateServiceOrder(id: string, serviceOrder: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const response = await apiClient.put<ServiceOrderResponse>(`/service-orders/${id}`, serviceOrder);
    
    return response.data;
  },
  
  // Excluir uma ordem de serviço
  async deleteServiceOrder(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/service-orders/${id}`);
  },
  
  // Atribuir técnico a uma ordem de serviço
  async assignTechnician(id: string, data: TechnicianAssignmentData): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrderResponse>(`/service-orders/${id}/assign-technician`, data);
    
    return response.data;
  },
  
  // Atualizar status de uma ordem de serviço
  async updateServiceOrderStatus(id: string, data: ServiceOrderStatusUpdateData): Promise<ServiceOrder> {
    const response = await apiClient.patch<ServiceOrderResponse>(`/service-orders/${id}/status`, data);
    
    return response.data;
  }
};

export default serviceOrderApiService;
