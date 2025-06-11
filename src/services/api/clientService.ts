/**
 * Serviço para gerenciar clientes
 */
import apiClient from './apiClient';

// Tipos
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  address?: string;
  addressComplement?: string;
  addressReference?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilter {
  page?: number;
  limit?: number;
  search?: string;
}

// Serviço de clientes
class ClientService {
  // Obter todos os clientes com filtros
  async getAllClients(filters: ClientFilter = {}): Promise<{ data: Client[], pagination: any }> {
    const response = await apiClient.get<{ success: boolean, data: Client[], pagination: any }>('/clients', filters);
    return { data: response.data, pagination: response.pagination };
  }

  // Obter um cliente específico
  async getClientById(id: string): Promise<Client> {
    const response = await apiClient.get<{ success: boolean, data: Client }>(`/clients/${id}`);
    return response.data;
  }

  // Criar um novo cliente
  async createClient(data: Partial<Client>): Promise<Client> {
    const response = await apiClient.post<{ success: boolean, data: Client }>('/clients', data);
    return response.data;
  }

  // Atualizar um cliente
  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const response = await apiClient.put<{ success: boolean, data: Client }>(`/clients/${id}`, data);
    return response.data;
  }

  // Excluir um cliente
  async deleteClient(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean }>(`/clients/${id}`);
  }

  // Buscar clientes por nome
  async searchClientsByName(name: string): Promise<Client[]> {
    const response = await apiClient.get<{ success: boolean, data: Client[] }>('/clients/search/name', { name });
    return response.data;
  }
}

// Exportar uma instância única do serviço
export const clientService = new ClientService();

export default clientService;
