/**
 * Serviço para gerenciar técnicos
 */
import apiClient from './apiClient';

// Tipos
export interface Technician {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialties?: string[];
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastLocationUpdated?: string;
}

export interface TechnicianFilter {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface TechnicianSchedule {
  date: string;
  time: string;
  durationMinutes: number;
}

export interface TechnicianWithAvailability extends Technician {
  schedules: TechnicianSchedule[];
}

// Serviço de técnicos
class TechnicianService {
  // Obter todos os técnicos com filtros
  async getAllTechnicians(filters: TechnicianFilter = {}): Promise<{ data: Technician[], pagination: any }> {
    const response = await apiClient.get<{ success: boolean, data: Technician[], pagination: any }>('/technicians', filters);
    return { data: response.data, pagination: response.pagination };
  }

  // Obter um técnico específico
  async getTechnicianById(id: string): Promise<Technician> {
    const response = await apiClient.get<{ success: boolean, data: Technician }>(`/technicians/${id}`);
    return response.data;
  }

  // Criar um novo técnico
  async createTechnician(data: Partial<Technician>): Promise<Technician> {
    const response = await apiClient.post<{ success: boolean, data: Technician }>('/technicians', data);
    return response.data;
  }

  // Atualizar um técnico
  async updateTechnician(id: string, data: Partial<Technician>): Promise<Technician> {
    const response = await apiClient.put<{ success: boolean, data: Technician }>(`/technicians/${id}`, data);
    return response.data;
  }

  // Excluir um técnico
  async deleteTechnician(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean }>(`/technicians/${id}`);
  }

  // Atualizar localização do técnico
  async updateTechnicianLocation(id: string, latitude: number, longitude: number): Promise<{ id: string, latitude: number, longitude: number, updatedAt: string }> {
    const response = await apiClient.patch<{ success: boolean, data: { id: string, latitude: number, longitude: number, updatedAt: string } }>(`/technicians/${id}/location`, { latitude, longitude });
    return response.data;
  }

  // Obter técnicos disponíveis
  async getAvailableTechnicians(date?: string): Promise<TechnicianWithAvailability[]> {
    const params: any = {};
    if (date) {
      params.date = date;
    }
    
    const response = await apiClient.get<{ success: boolean, data: TechnicianWithAvailability[] }>('/technicians/available', params);
    return response.data;
  }
}

// Exportar uma instância única do serviço
export const technicianService = new TechnicianService();

export default technicianService;
