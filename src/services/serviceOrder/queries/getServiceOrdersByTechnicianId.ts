
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, ServiceOrderImage } from '@/types';
import { mapServiceOrder } from './mapServiceOrder';

export async function getServiceOrdersByTechnicianId(technicianId: string, includeArchived: boolean = false): Promise<ServiceOrder[]> {
  try {
    let query = supabase
      .from('service_orders')
      .select('*')
      .eq('technician_id', technicianId);
    
    // Filtrar ordens arquivadas, a menos que seja explicitamente solicitado para incluí-las
    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const orders = data.map(order => mapServiceOrder(order));

    // Fetch images for each service order
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

    return orders;
  } catch (error) {
    console.error(`Erro ao buscar ordens de serviço para o técnico ${technicianId}:`, error);
    return [];
  }
}
