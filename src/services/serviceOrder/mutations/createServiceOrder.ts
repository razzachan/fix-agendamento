
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, Client } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { createOrUpdateClient } from './clientOperations';

/**
 * Creates a new service order in the database
 */
export async function createServiceOrder(serviceOrder: ServiceOrder): Promise<string | null> {
  try {
    console.log("Creating service order with data:", JSON.stringify({
      cliente: serviceOrder.clientName,
      tipo: serviceOrder.serviceAttendanceType,
      equipamento: serviceOrder.equipmentType
    }, null, 2));

    // Validate explicitly the attendance type
    let validAttendanceType;

    if (serviceOrder.serviceAttendanceType) {
      if (["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(serviceOrder.serviceAttendanceType)) {
        validAttendanceType = serviceOrder.serviceAttendanceType;
        console.log(`Tipo de atendimento válido: ${validAttendanceType}`);
      } else {
        console.warn(`Tipo de atendimento inválido: ${serviceOrder.serviceAttendanceType}, usando padrão 'em_domicilio'`);
        validAttendanceType = 'em_domicilio';
      }
    } else {
      console.warn("Tipo de atendimento não fornecido, usando padrão 'em_domicilio'");
      validAttendanceType = 'em_domicilio';
    }

    // Create or update client if we have client information
    let clientId = serviceOrder.clientId?.trim() || null;

    try {
      if (serviceOrder.clientName) {
        const clientData: Partial<Client> = {
          name: serviceOrder.clientName,
          email: serviceOrder.clientEmail || null,
          phone: serviceOrder.clientPhone || null,
          address: serviceOrder.pickupAddress || null,
          city: serviceOrder.pickupCity || null,
          state: serviceOrder.pickupState || null,
          zipCode: serviceOrder.pickupZipCode || null
        };

        const savedClientId = await createOrUpdateClient(clientData);
        if (savedClientId) {
          clientId = savedClientId;
          console.log("Client created/updated with ID:", clientId);
        } else {
          console.warn("Failed to create/update client");
        }
      }
    } catch (clientError) {
      console.error("Error processing client data:", clientError);
      // Continue with service order creation even if client creation fails
    }

    // Calcular o valor final a partir dos serviceItems
    let finalCost = 0;
    if (serviceOrder.serviceItems && serviceOrder.serviceItems.length > 0) {
      finalCost = serviceOrder.serviceItems.reduce((total, item) => {
        const itemValue = parseFloat(item.serviceValue || '0') / 100; // Converter de centavos para reais
        return total + itemValue;
      }, 0);
    }

    console.log(`💰 Valor final calculado: R$ ${finalCost.toFixed(2)}`);

    const orderData = {
      // id: removido - deixar o banco gerar o ID fixo automaticamente
      client_id: clientId,
      client_name: serviceOrder.clientName,
      technician_id: serviceOrder.technicianId || null,
      technician_name: serviceOrder.technicianName || null,
      status: serviceOrder.status,
      created_at: serviceOrder.createdAt,
      scheduled_date: serviceOrder.scheduledDate || null,
      completed_date: serviceOrder.completedDate || null,
      description: serviceOrder.description,
      equipment_type: serviceOrder.equipmentType,
      equipment_model: serviceOrder.equipmentModel || null,
      equipment_serial: serviceOrder.equipmentSerial || null,
      needs_pickup: serviceOrder.needsPickup,
      pickup_address: serviceOrder.pickupAddress || null,
      pickup_city: serviceOrder.pickupCity || null,
      pickup_state: serviceOrder.pickupState || null,
      pickup_zip_code: serviceOrder.pickupZipCode || null,
      current_location: serviceOrder.currentLocation || 'client',
      service_attendance_type: validAttendanceType,  // Make sure this is correctly set
      client_email: serviceOrder.clientEmail || null,
      client_phone: serviceOrder.clientPhone || null,
      client_cpf_cnpj: serviceOrder.clientCpfCnpj || null,
      final_cost: finalCost // ✅ Adicionar o valor final
    };

    console.log("Inserting service order with:", JSON.stringify({
      cliente: orderData.client_name,
      tipo: orderData.service_attendance_type
    }, null, 2));

    // Add debugging to check the actual data being sent to the database
    console.log("Final service_attendance_type being sent to DB:", orderData.service_attendance_type);

    const { data, error } = await supabase
      .from('service_orders')
      .insert(orderData)
      .select('id')
      .single();

    if (error) {
      console.error("Error inserting service order:", error);
      throw error;
    }

    console.log("Service order created successfully with ID:", data?.id);
    return data?.id || null;
  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    toast.error('Erro ao criar ordem de serviço.');
    return null;
  }
}
