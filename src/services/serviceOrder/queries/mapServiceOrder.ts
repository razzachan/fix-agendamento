
import { ServiceOrder } from '@/types';
import { generateUUID } from '@/utils/uuid';

export function mapServiceOrder(order: any): ServiceOrder {
  // Enhanced logging for debugging
  console.log(`Order ${order.id} (${order.client_name}) - Raw service_attendance_type: "${order.service_attendance_type}"`);

  // Validate explicitly the attendance type
  let validAttendanceType;
  if (order.service_attendance_type) {
    if (["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(order.service_attendance_type)) {
      validAttendanceType = order.service_attendance_type;
      console.log(`Tipo de atendimento válido: ${validAttendanceType}`);
    } else {
      console.warn(`Tipo de atendimento inválido para ordem ${order.id}: ${order.service_attendance_type}. Usando 'em_domicilio'`);
      validAttendanceType = "em_domicilio";
    }
  } else {
    console.warn(`Ordem ${order.id} sem tipo de atendimento definido. Usando 'em_domicilio'`);
    validAttendanceType = "em_domicilio";
  }

  console.log(`Order ${order.id} - using attendance type: ${validAttendanceType}`);

  const mappedOrder = {
    id: order.id,
    orderNumber: order.order_number, // ✅ Mapear order_number do banco
    clientId: order.client_id || '',
    clientName: order.client_name,
    clientEmail: order.client_email || order.client?.email || '',
    clientPhone: order.client_phone || order.client?.phone || '',
    clientCpfCnpj: order.client_cpf_cnpj || order.client?.cpf_cnpj || '',
    clientAddressComplement: order.client?.address_complement || '',
    clientAddressReference: order.client?.address_reference || '',
    clientCity: order.client_city || order.client?.city || '',
    clientState: order.client_state || order.client?.state || '',
    clientZipCode: order.client_zip_code || order.client?.zip_code || '',
    clientFullAddress: order.pickup_address || '',
    technicianId: order.technician_id,
    technicianName: order.technician_name,
    status: order.status as any,
    createdAt: order.created_at || '',
    scheduledDate: order.scheduled_date,
    scheduledTime: order.scheduled_time || (order.scheduled_date ? new Date(order.scheduled_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : ''),
    completedDate: order.completed_date,
    description: order.description,
    equipmentType: order.equipment_type,
    equipmentModel: order.equipment_model,
    equipmentSerial: order.equipment_serial,
    needsPickup: order.needs_pickup || false,
    pickupAddress: order.pickup_address,
    pickupAddressComplement: order.pickup_address_complement,
    pickupCity: order.pickup_city,
    pickupState: order.pickup_state,
    pickupZipCode: order.pickup_zip_code,
    currentLocation: order.current_location as any,
    serviceAttendanceType: validAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
    initialCost: order.initial_cost ? parseFloat(order.initial_cost.toString()) : 0, // ✅ Valor inicial (sinal)
    finalCost: order.final_cost ? parseFloat(order.final_cost.toString()) : 0, // ✅ Valor final total
    clientDescription: order.description,
    archived: order.archived || false,

    // Campos para identificar a oficina responsável
    workshopId: order.workshop_id || null,
    workshopName: order.workshop_name || null,

    // Campos para controle de atualizações
    updatedById: order.updated_by_id || null,
    updatedByName: order.updated_by_name || null,
    updatedAt: order.updated_at || null,
    notes: order.notes || null,

    // Campos de garantia - Mapeamento dos campos do banco de dados (snake_case) para o formato do frontend (camelCase)
    // Estes campos são usados pelo componente WarrantyInfo para exibir informações de garantia
    warrantyPeriod: order.warranty_period,         // Período de garantia em meses
    warrantyStartDate: order.warranty_start_date,  // Data de início da garantia
    warrantyEndDate: order.warranty_end_date,      // Data de término da garantia
    warrantyTerms: order.warranty_terms,           // Termos e condições da garantia
    relatedWarrantyOrderId: order.related_warranty_order_id, // ID da ordem original (para atendimentos em garantia)
    images: order.service_order_images ? order.service_order_images.map(img => ({
      id: img.id,
      url: img.url,
      name: img.name
    })) : [],
    serviceItems: order.service_items && order.service_items.length > 0
      ? order.service_items.map(item => ({
          id: item.id,
          serviceOrderId: order.id,
          serviceType: item.service_type || '',
          serviceAttendanceType: item.service_attendance_type as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
          equipmentType: item.equipment_type || '',
          equipmentModel: item.equipment_model || '',
          equipmentSerial: item.equipment_serial || '',
          clientDescription: item.client_description || '',
          serviceValue: item.service_value || ''
        }))
      : [{
          id: generateUUID(),
          serviceOrderId: order.id,
          serviceType: '',
          serviceAttendanceType: validAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
          equipmentType: order.equipment_type,
          equipmentModel: order.equipment_model,
          equipmentSerial: order.equipment_serial,
          clientDescription: order.description,
          serviceValue: ''
        }],

    // Diagnóstico do equipamento (se disponível)
    // Mapeia os dados do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
    diagnosis: (() => {
      // Se diagnosis é um array, pegar o primeiro (mais recente)
      const diagnosisData = Array.isArray(order.diagnosis) ? order.diagnosis[0] : order.diagnosis;

      return diagnosisData ? {
        id: diagnosisData.id,
        createdAt: diagnosisData.created_at, // Mapeia created_at para createdAt
        updatedAt: diagnosisData.updated_at, // Mapeia updated_at para updatedAt
        serviceOrderId: diagnosisData.service_order_id, // Mapeia service_order_id para serviceOrderId
        workshopUserId: diagnosisData.workshop_user_id, // Mapeia workshop_user_id para workshopUserId
        diagnosisDetails: diagnosisData.diagnosis_details, // Mapeia diagnosis_details para diagnosisDetails
        recommendedService: diagnosisData.recommended_service || null, // Mapeia recommended_service para recommendedService
        estimatedCost: diagnosisData.estimated_cost || null, // Mapeia estimated_cost para estimatedCost
        estimatedCompletionDate: diagnosisData.estimated_completion_date || null, // Mapeia estimated_completion_date para estimatedCompletionDate
        partsPurchaseLink: diagnosisData.parts_purchase_link || null // Mapeia parts_purchase_link para partsPurchaseLink
      } : undefined;
    })()
  };

  console.log(`Order ID: ${mappedOrder.id}, Final Mapped Service Attendance Type: ${mappedOrder.serviceAttendanceType}`);

  return mappedOrder;
}
