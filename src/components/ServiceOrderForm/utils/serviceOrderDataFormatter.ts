import { ServiceOrder } from '@/types';
import { FormValues } from '../types';

/**
 * Formats form values into service order data structure
 */
export const formatServiceOrderData = (values: FormValues): Partial<ServiceOrder> => {
  // Log incoming form values
  console.log('formatServiceOrderData: Processing form values:', values);
  console.log('Service items attendance types:', values.serviceItems.map(item => item.serviceAttendanceType));
  
  // Determine if pickup is needed based on service attendance type
  const needsPickup = values.serviceItems.some(item => 
    item.serviceAttendanceType === 'coleta_conserto' || 
    item.serviceAttendanceType === 'coleta_diagnostico'
  );
  
  // Generate description from service items
  const itemsDescription = values.serviceItems.map((item, index) => {
    const attendanceType = item.serviceAttendanceType === 'em_domicilio' 
      ? 'Em domicílio' 
      : item.serviceAttendanceType === 'coleta_conserto' 
        ? 'Coleta para conserto' 
        : 'Coleta para diagnóstico';
        
    return `Item ${index + 1}: ${item.equipmentType} (${item.equipmentModel || 'Sem modelo'}) - ${attendanceType}\n${item.clientDescription || 'Sem descrição'}\n`;
  }).join('\n---\n\n');
  
  // Get first item as main equipment data
  const mainItem = values.serviceItems[0];
  
  // Ensure we have a valid serviceAttendanceType
  if (!mainItem) {
    console.error("Erro: Item de serviço não definido");
    return {}; // Return empty object to prevent further errors
  }
  
  if (!mainItem.serviceAttendanceType) {
    console.error("Erro: Tipo de atendimento não definido no item de serviço");
    return {}; // Return empty object to prevent further errors
  }
  
  // Format scheduled date if both date and time are provided
  let scheduledDate = null;
  if (values.scheduledDate && values.scheduledTime) {
    const [hours, minutes] = values.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(values.scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    scheduledDate = scheduledDateTime.toISOString();
  }

  // Format full address with complement and reference if available
  let fullAddress = values.clientFullAddress || '';
  if (values.clientAddressComplement) {
    fullAddress += ` - Complemento: ${values.clientAddressComplement}`;
  }
  if (values.clientAddressReference) {
    fullAddress += ` - Referência: ${values.clientAddressReference}`;
  }
  
  // Extract technician name from DOM if technician is selected
  const technicianName = values.technicianId ? 
    document.querySelector(`[data-value="${values.technicianId}"]`)?.textContent || null : 
    null;
  
  // Explicitly validate the attendance type from the first item
  let serviceAttendanceType;
  if (mainItem.serviceAttendanceType) {
    if (["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(mainItem.serviceAttendanceType)) {
      serviceAttendanceType = mainItem.serviceAttendanceType;
      console.log(`Usando tipo de atendimento do formulário: ${serviceAttendanceType}`);
    } else {
      console.warn(`Tipo de atendimento inválido: ${mainItem.serviceAttendanceType}, usando padrão 'em_domicilio'`);
      serviceAttendanceType = 'em_domicilio';
    }
  } else {
    console.warn("Tipo de atendimento não encontrado, usando padrão 'em_domicilio'");
    serviceAttendanceType = 'em_domicilio';
  }
  
  // Implement stronger logging for debugging
  console.log(`------- FORMATANDO DADOS DA ORDEM DE SERVIÇO -------`);
  console.log(`Dados do Item: ${JSON.stringify({
    id: mainItem.id,
    tipo: mainItem.serviceAttendanceType,
    equipamento: mainItem.equipmentType
  }, null, 2)}`);
  console.log(`Tipo de atendimento a ser usado: ${serviceAttendanceType}`);
  console.log(`Necessita coleta: ${needsPickup}`);
  console.log(`Cliente: ${values.clientName}`);
  console.log(`Equipamento: ${mainItem.equipmentType}`);
  console.log(`-------------------------------------------------`);
  
  // Return the formatted service order data
  return {
    clientName: values.clientName,
    clientEmail: values.clientEmail || null,
    clientPhone: values.clientPhone || null,
    equipmentType: mainItem ? mainItem.equipmentType : 'N/A',
    equipmentModel: mainItem ? mainItem.equipmentModel : null,
    equipmentSerial: mainItem ? mainItem.equipmentSerial : null,
    description: itemsDescription,
    status: (values.status as any) || 'pending_collection',
    needsPickup: needsPickup,
    currentLocation: 'client', // ✅ SEMPRE INICIA NO CLIENTE (igual ao middleware)
    technicianId: values.technicianId,
    technicianName: technicianName,
    pickupAddress: fullAddress,
    scheduledDate: scheduledDate,
    serviceAttendanceType: serviceAttendanceType, // This ensures the type is explicitly passed to the database
    // Use the form fields directly instead of extraction
    pickupCity: values.clientCity || null,
    pickupState: values.clientState || null,
    pickupZipCode: values.clientZipCode || null,

  // ✅ Calcular valor final da OS a partir dos serviceItems
  finalCost: values.serviceItems.reduce((total, item) => {
    const itemValue = parseFloat(item.serviceValue || '0') / 100; // Converter de centavos para reais
    return total + itemValue;
  }, 0),
  };
};
