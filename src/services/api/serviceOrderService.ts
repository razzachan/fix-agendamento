/**
 * Serviço para gerenciar ordens de serviço
 */
import apiClient from './apiClient';

// Tipos
export interface ServiceOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCpfCnpj?: string;
  clientAddress?: string;
  clientAddressComplement?: string;
  clientAddressReference?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;
  technicianId?: string;
  technicianName?: string;
  status: string;
  createdAt: string;
  scheduledDate?: string;
  scheduledTime?: string;
  completedDate?: string;
  description: string;
  equipmentType: string;
  equipmentModel?: string;
  equipmentSerial?: string;
  needsPickup: boolean;
  pickupAddress?: string;
  pickupCity?: string;
  pickupState?: string;
  pickupZipCode?: string;
  archived: boolean;
  cancellationReason?: string;
  lastProgressId?: string;
}

export interface ServiceOrderProgress {
  id: string;
  serviceOrderId: string;
  status: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface ServiceOrderFilter {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Serviço de ordens de serviço
class ServiceOrderService {
  // Obter todas as ordens de serviço com filtros
  async getAllServiceOrders(filters: ServiceOrderFilter = {}): Promise<{ data: ServiceOrder[], pagination: any }> {
    const response = await apiClient.get<{ success: boolean, data: ServiceOrder[], pagination: any }>('/service-orders', filters);
    return { data: response.data, pagination: response.pagination };
  }

  // Obter uma ordem de serviço específica
  async getServiceOrderById(id: string): Promise<ServiceOrder> {
    const response = await apiClient.get<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}`);
    return response.data;
  }

  // Criar uma nova ordem de serviço
  async createServiceOrder(data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const response = await apiClient.post<{ success: boolean, data: ServiceOrder }>('/service-orders', data);
    return response.data;
  }

  // Atualizar uma ordem de serviço
  async updateServiceOrder(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const response = await apiClient.put<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}`, data);
    return response.data;
  }

  // Excluir uma ordem de serviço
  async deleteServiceOrder(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean }>(`/service-orders/${id}`);
  }

  // Atualizar o status de uma ordem de serviço
  async updateServiceOrderStatus(id: string, status: string, notes?: string, cancellationReason?: string): Promise<ServiceOrder> {
    const data: any = { status };
    
    if (notes) {
      data.notes = notes;
    }
    
    if (status === 'canceled' && cancellationReason) {
      data.cancellationReason = cancellationReason;
    }
    
    const response = await apiClient.patch<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}/status`, data);
    return response.data;
  }

  // Atribuir um técnico a uma ordem de serviço
  async assignTechnician(id: string, technicianId: string, technicianName: string): Promise<ServiceOrder> {
    const response = await apiClient.patch<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}/technician`, {
      technicianId,
      technicianName
    });
    return response.data;
  }

  // Obter o histórico de progresso de uma ordem de serviço
  async getServiceOrderProgress(id: string): Promise<ServiceOrderProgress[]> {
    const response = await apiClient.get<{ success: boolean, data: ServiceOrderProgress[] }>(`/service-orders/${id}/progress`);
    return response.data;
  }

  // Obter ordens de serviço por cliente
  async getServiceOrdersByClient(clientId: string, filters: ServiceOrderFilter = {}): Promise<{ data: ServiceOrder[], pagination: any }> {
    const response = await apiClient.get<{ success: boolean, data: ServiceOrder[], pagination: any }>(`/service-orders/client/${clientId}`, filters);
    return { data: response.data, pagination: response.pagination };
  }

  // Obter ordens de serviço por técnico
  async getServiceOrdersByTechnician(technicianId: string, filters: ServiceOrderFilter = {}): Promise<{ data: ServiceOrder[], pagination: any }> {
    const response = await apiClient.get<{ success: boolean, data: ServiceOrder[], pagination: any }>(`/service-orders/technician/${technicianId}`, filters);
    return { data: response.data, pagination: response.pagination };
  }

  // Arquivar uma ordem de serviço
  async archiveServiceOrder(id: string): Promise<ServiceOrder> {
    const response = await apiClient.patch<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}/archive`, { archived: true });
    return response.data;
  }

  // Desarquivar uma ordem de serviço
  async unarchiveServiceOrder(id: string): Promise<ServiceOrder> {
    const response = await apiClient.patch<{ success: boolean, data: ServiceOrder }>(`/service-orders/${id}/archive`, { archived: false });
    return response.data;
  }
}

// Exportar uma instância única do serviço
export const serviceOrderService = new ServiceOrderService();

export default serviceOrderService;
