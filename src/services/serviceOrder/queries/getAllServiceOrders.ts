
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import { mapServiceOrder } from './mapServiceOrder';

export async function getAllServiceOrders(includeArchived: boolean = false): Promise<ServiceOrder[]> {
  try {
    console.log('Iniciando busca de todas as ordens de serviço');

    let query = supabase.from('service_orders').select(`
      *,
      client:client_id (
        email,
        phone,
        cpf_cnpj,
        address_complement,
        address_reference
      ),
      service_order_images (*),
      service_items (*),
      workshop:workshop_id (
        name
      )
    `);

    // Filtrar ordens arquivadas, a menos que seja explicitamente solicitado para incluí-las
    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro na consulta Supabase:', error);
      throw error;
    }

    console.log('Total de ordens encontradas:', data.length);

    // Log detalhado para depuração do tipo de atendimento
    data.forEach(order => {
      console.log(`Ordem ${order.id} (${order.client_name}): tipo=${order.service_attendance_type}, status=${order.status}`);


    });

    const orders = data.map(order => mapServiceOrder(order));

    console.log('Ordens mapeadas:',
      orders.map(o => ({
        id: o.id.substring(0, 8),
        cliente: o.clientName,
        tipo: o.serviceAttendanceType
      }))
    );

    // If images weren't fetched in the join, fetch them separately
    if (data.length > 0 && !data[0]?.service_order_images) {
      await fetchServiceOrderImages(orders);
    }

    return orders;
  } catch (error) {
    console.error('Erro ao buscar ordens de serviço:', error);
    toast.error('Erro ao carregar ordens de serviço.');
    return [];
  }
}

async function fetchServiceOrderImages(orders: ServiceOrder[]) {
  for (const order of orders) {
    const { data: imageData } = await supabase
      .from('service_order_images')
      .select('*')
      .eq('service_order_id', order.id);

    if (imageData && imageData.length > 0) {
      order.images = imageData.map(img => ({
        id: img.id,
        url: img.url,
        name: img.name
      }));
    }
  }
}
