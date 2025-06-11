import { EquipmentDiagnosis } from '@/types';

/**
 * Mapeia os dados de diagnóstico do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
 * @param data Dados de diagnóstico no formato do banco de dados
 * @returns Diagnóstico no formato do frontend
 */
export const mapDiagnosisData = (data: any): EquipmentDiagnosis => {
  return {
    id: data.id,
    createdAt: data.created_at || null, // Mapeia created_at para createdAt
    updatedAt: data.updated_at || null, // Mapeia updated_at para updatedAt
    serviceOrderId: data.service_order_id, // Mapeia service_order_id para serviceOrderId
    workshopUserId: data.workshop_user_id, // Mapeia workshop_user_id para workshopUserId
    diagnosisDetails: data.diagnosis_details, // Mapeia diagnosis_details para diagnosisDetails
    recommendedService: data.recommended_service || null, // Mapeia recommended_service para recommendedService
    estimatedCost: data.estimated_cost || null, // Mapeia estimated_cost para estimatedCost
    estimatedCompletionDate: data.estimated_completion_date || null, // Mapeia estimated_completion_date para estimatedCompletionDate
    partsPurchaseLink: data.parts_purchase_link || null, // Mapeia parts_purchase_link para partsPurchaseLink
  };
};
