
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Arquiva uma ordem de serviço ao invés de excluí-la definitivamente
 */
export async function deleteServiceOrder(id: string): Promise<boolean> {
  try {
    console.log(`Iniciando processo de arquivamento para ordem de serviço ${id}...`);
    
    // First verify if the service order exists
    const { data: orderExists, error: checkError } = await supabase
      .from('service_orders')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error(`Erro ao verificar ordem de serviço ${id}:`, checkError);
      if (checkError.code === 'PGRST116') {
        // Order doesn't exist
        console.log(`Ordem de serviço ${id} não encontrada.`);
        toast.error('Ordem de serviço não encontrada.');
        return false;
      }
      throw checkError;
    }
    
    // Usar a função de arquivamento criada no banco de dados
    const { data, error } = await supabase
      .rpc('archive_service_order', { order_id: id });
    
    if (error) {
      console.error(`Erro ao arquivar a ordem de serviço ${id}:`, error);
      throw error;
    }
    
    console.log(`Ordem de serviço ${id} arquivada com sucesso`);
    return true;
  } catch (error) {
    console.error(`Erro ao arquivar ordem de serviço ${id}:`, error);
    toast.error('Erro ao arquivar ordem de serviço.');
    return false;
  }
}
