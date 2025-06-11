
import { ScheduledService } from '@/types';

/**
 * Mapeia os dados do serviço agendado do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
 * @param rawData Dados do serviço agendado no formato do banco de dados
 * @returns Serviço agendado no formato do frontend
 */
export const mapScheduledService = (rawData: any): ScheduledService => {
  return {
    id: rawData.id,
    createdAt: rawData.created_at || new Date().toISOString(), // Mapeia created_at para createdAt
    serviceOrderId: rawData.service_order_id, // Mapeia service_order_id para serviceOrderId
    technicianId: rawData.technician_id, // Mapeia technician_id para technicianId
    technicianName: rawData.technician_name, // Mapeia technician_name para technicianName
    clientId: rawData.client_id, // Mapeia client_id para clientId
    clientName: rawData.client_name, // Mapeia client_name para clientName
    scheduledStartTime: rawData.scheduled_start_time, // Mapeia scheduled_start_time para scheduledStartTime
    scheduledEndTime: rawData.scheduled_end_time, // Mapeia scheduled_end_time para scheduledEndTime
    address: rawData.address,
    description: rawData.description,
    status: rawData.status,
  };
};
