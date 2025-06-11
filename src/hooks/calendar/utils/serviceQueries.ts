
import { supabase } from '@/integrations/supabase/client';
import { ScheduledService, ServiceOrder } from '@/types';
import { format } from 'date-fns';

export const fetchScheduledServices = async (technicianId: string) => {
  console.log(`Buscando serviços para o técnico ${technicianId}...`);
  
  try {
    const { data, error } = await supabase
      .from('scheduled_services')
      .select('*')
      .eq('technician_id', technicianId);

    if (error) {
      console.error("Erro na consulta de serviços:", error);
      throw error;
    }

    console.log(`Encontrados ${data?.length || 0} serviços agendados no banco de dados:`);
    if (data && data.length > 0) {
      data.forEach(service => {
        const date = new Date(service.scheduled_start_time);
        console.log(`- ID: ${service.id}, Data: ${format(date, 'yyyy-MM-dd HH:mm')}, Descrição: ${service.description}`);
      });
    }

    return data || [];
  } catch (error) {
    console.error("Erro na consulta de serviços:", error);
    // Return empty array instead of throwing, to make the app more resilient
    return [];
  }
};

export const fetchServiceOrders = async (technicianId: string) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('technician_id', technicianId);
      
    if (error) {
      console.error("Erro na consulta de ordens:", error);
      throw error;
    }
    
    console.log(`Encontradas ${data?.length || 0} ordens de serviço no banco de dados`);
    
    // Map the database field names (snake_case) to the ServiceOrder type properties (camelCase)
    const mappedOrders: ServiceOrder[] = data?.map(order => ({
      id: order.id,
      orderNumber: order.order_number, // ✅ Mapear order_number do banco
      clientId: order.client_id || '',
      clientName: order.client_name,
      clientEmail: order.client_email || '',
      clientPhone: order.client_phone || '',
      clientCpfCnpj: order.cpf_cnpj || '',
      clientAddressComplement: order.address_complement || '',
      clientAddressReference: order.address_reference || '',
      technicianId: order.technician_id,
      technicianName: order.technician_name,
      status: order.status as any,
      createdAt: order.created_at || '',
      scheduledDate: order.scheduled_date,
      scheduledTime: order.scheduled_time || '',
      completedDate: order.completed_date,
      description: order.description,
      equipmentType: order.equipment_type,
      equipmentModel: order.equipment_model,
      equipmentSerial: order.equipment_serial,
      needsPickup: order.needs_pickup || false,
      pickupAddress: order.pickup_address,
      pickupCity: order.pickup_city,
      pickupState: order.pickup_state,
      pickupZipCode: order.pickup_zip_code,
      currentLocation: order.current_location as any,
      serviceAttendanceType: order.service_attendance_type as any,
      clientDescription: order.description || '',
      clientFullAddress: `${order.address || ''}, ${order.city || ''}, ${order.state || ''}`,
      images: [],
      serviceItems: []
    })) || [];
    
    return mappedOrders;
  } catch (error) {
    console.error("Erro na consulta de ordens:", error);
    // Return empty array instead of throwing, to make the app more resilient
    return [];
  }
};
