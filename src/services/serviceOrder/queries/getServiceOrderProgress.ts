import { supabase } from '@/integrations/supabase/client';
import { ServiceOrderProgress, ServiceOrderProgressEntry } from '@/types/serviceOrderProgress';

/**
 * Busca o histórico de progresso de uma ordem de serviço
 * @param serviceOrderId ID da ordem de serviço
 * @returns Histórico de progresso ou null em caso de erro
 */
export async function getServiceOrderProgress(serviceOrderId: string): Promise<ServiceOrderProgress | null> {
  try {
    console.log(`Buscando histórico de progresso para ordem de serviço ${serviceOrderId}`);
    
    // Buscar entradas de progresso ordenadas por created_at
    const { data, error } = await supabase
      .from('service_order_progress')
      .select(`
        id,
        service_order_id,
        status,
        notes,
        created_at,
        created_by
      `)
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar histórico de progresso:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`Nenhum histórico de progresso encontrado para ordem ${serviceOrderId}`);
      return {
        serviceOrderId,
        entries: []
      };
    }
    
    // Mapear os dados para o formato esperado
    const entries: ServiceOrderProgressEntry[] = data.map(entry => ({
      id: entry.id,
      serviceOrderId: entry.service_order_id,
      status: entry.status,
      timestamp: entry.created_at,
      userId: null, // Não temos user_id na tabela atual
      userName: entry.created_by,
      notes: entry.notes,
      systemGenerated: false // Assumir false por padrão já que não temos a coluna
    }));
    
    return {
      serviceOrderId,
      entries
    };
  } catch (error) {
    console.error('Erro ao buscar histórico de progresso:', error);
    return null;
  }
}
