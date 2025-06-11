/**
 * Serviço para gerenciar diagnósticos de equipamentos
 */
import apiClient from './apiClient';
import { EquipmentDiagnosis } from '@/types';
import { mapDiagnosisData } from '../diagnosis/diagnosisDataMapper';

// Interface para os dados de criação/atualização de diagnóstico
export interface DiagnosisData {
  serviceOrderId: string;
  diagnosisDetails: string;
  recommendedService: string;
  estimatedCost: number;
  estimatedCompletionDate: string;
  partsPurchaseLink?: string | null;
}

// Serviço de diagnósticos
class DiagnosisService {
  // Obter diagnóstico por ID da ordem de serviço
  async getDiagnosisByServiceOrderId(serviceOrderId: string): Promise<EquipmentDiagnosis | null> {
    try {
      const response = await apiClient.get<{ success: boolean, data: any }>(`/diagnoses/service-order/${serviceOrderId}`);
      if (response.data) {
        // Mapeia os dados do formato do banco de dados para o formato do frontend
        return mapDiagnosisData(response.data);
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar diagnóstico para ordem de serviço ${serviceOrderId}:`, error);
      return null;
    }
  }

  // Criar um novo diagnóstico
  async createDiagnosis(data: DiagnosisData): Promise<EquipmentDiagnosis> {
    const response = await apiClient.post<{ success: boolean, data: any }>('/diagnoses', data);
    // Mapeia os dados do formato do banco de dados para o formato do frontend
    return mapDiagnosisData(response.data);
  }

  // Atualizar um diagnóstico existente
  async updateDiagnosis(id: string, data: Partial<DiagnosisData>): Promise<EquipmentDiagnosis> {
    const response = await apiClient.put<{ success: boolean, data: any }>(`/diagnoses/${id}`, data);
    // Mapeia os dados do formato do banco de dados para o formato do frontend
    return mapDiagnosisData(response.data);
  }

  // Criar ou atualizar diagnóstico (upsert)
  async upsertDiagnosis(data: DiagnosisData): Promise<EquipmentDiagnosis> {
    try {
      // Verificar se já existe um diagnóstico para esta ordem de serviço
      const existingDiagnosis = await this.getDiagnosisByServiceOrderId(data.serviceOrderId);

      if (existingDiagnosis) {
        // Atualizar o diagnóstico existente
        return await this.updateDiagnosis(existingDiagnosis.id, data);
      } else {
        // Criar um novo diagnóstico
        return await this.createDiagnosis(data);
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar diagnóstico:', error);
      throw error;
    }
  }

  // Aprovar um diagnóstico (cliente aceita o orçamento)
  async approveDiagnosis(diagnosisId: string, notes?: string): Promise<boolean> {
    try {
      const response = await apiClient.patch<{ success: boolean }>(`/diagnoses/${diagnosisId}/approve`, { notes });
      return response.success;
    } catch (error) {
      console.error(`Erro ao aprovar diagnóstico ${diagnosisId}:`, error);
      return false;
    }
  }

  // Rejeitar um diagnóstico (cliente não aceita o orçamento)
  async rejectDiagnosis(diagnosisId: string, reason: string): Promise<boolean> {
    try {
      const response = await apiClient.patch<{ success: boolean }>(`/diagnoses/${diagnosisId}/reject`, { reason });
      return response.success;
    } catch (error) {
      console.error(`Erro ao rejeitar diagnóstico ${diagnosisId}:`, error);
      return false;
    }
  }
}

// Exportar uma instância única do serviço
export const diagnosisService = new DiagnosisService();

export default diagnosisService;
