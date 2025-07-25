
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, Client } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { createOrUpdateClient } from './clientOperations';
import { generateNextOrderNumber } from '@/utils/orderNumberUtils';

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

    // Calcular valores usando o novo serviço de preços
    const serviceItems = serviceOrder.serviceItems || [];
    const serviceAttendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';

    // Para coleta diagnóstico, o valor inicial é o sinal
    let initialCost = 0;
    let finalCost = 0;

    if (serviceAttendanceType === 'coleta_diagnostico') {
      // Para coleta diagnóstico, o valor dos items é o sinal
      initialCost = serviceItems.reduce((total, item) => {
        const itemValue = parseFloat(item.serviceValue || '0') / 100;
        return total + itemValue;
      }, 0) || 350; // Fallback R$ 350,00

      finalCost = initialCost; // Inicialmente igual ao sinal, será atualizado após diagnóstico
    } else {
      // Para outros tipos, valor total direto
      finalCost = serviceItems.reduce((total, item) => {
        const itemValue = parseFloat(item.serviceValue || '0') / 100;
        return total + itemValue;
      }, 0);
    }

    console.log(`💰 Valores calculados:`, {
      serviceAttendanceType,
      initialCost,
      finalCost
    });

    // ✅ Gerar número sequencial da OS (igual ao middleware)
    const orderNumber = await generateNextOrderNumber();
    console.log(`🔢 Número da OS gerado: ${orderNumber}`);

    const orderData = {
      // id: removido - deixar o banco gerar o ID fixo automaticamente
      order_number: orderNumber, // ✅ Adicionar número sequencial da OS
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
      initial_cost: initialCost, // ✅ Valor inicial (sinal para coleta diagnóstico)
      final_cost: finalCost // ✅ Valor final total
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
