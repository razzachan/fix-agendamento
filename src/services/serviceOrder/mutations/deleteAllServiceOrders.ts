
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { serviceEventService } from '@/services/serviceEvent';

/**
 * Deletes all service orders and their related records
 */
export async function deleteAllServiceOrders(): Promise<boolean> {
  try {
    console.log("Encontrando todas as ordens de serviço...");
    const { data: serviceOrders, error: fetchError } = await supabase
      .from('service_orders')
      .select('id');

    if (fetchError) {
      console.error("Erro ao buscar ordens de serviço:", fetchError);
      return false;
    }

    console.log(`Encontradas ${serviceOrders?.length || 0} ordens de serviço para excluir`);

    // First delete all scheduled services
    console.log("Excluindo todos os serviços agendados...");
    await supabase
      .from('scheduled_services')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Delete all service events first (this was the missing part)
    console.log("Excluindo todos os eventos de serviço...");
    await supabase
      .from('service_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Delete all financial transactions
    console.log("Excluindo todas as transações financeiras...");
    await supabase
      .from('financial_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Delete all service order images
    console.log("Excluindo todas as imagens de ordens de serviço...");
    await supabase
      .from('service_order_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    // Finally delete all service orders
    console.log("Excluindo todas as ordens de serviço...");
    const { error: deleteError } = await supabase
      .from('service_orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error("Erro ao excluir todas as ordens de serviço:", deleteError);
      return false;
    }

    console.log("Todas as ordens de serviço foram excluídas com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao excluir todas as ordens de serviço:", error);
    toast.error("Erro ao excluir ordens de serviço");
    return false;
  }
}
