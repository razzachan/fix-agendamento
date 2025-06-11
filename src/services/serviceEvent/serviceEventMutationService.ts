
import { supabase } from '@/integrations/supabase/client';

/**
 * Deletes all events related to a specific service order
 */
const deleteByServiceOrderId = async (serviceOrderId: string): Promise<boolean> => {
  try {
    console.log(`Excluindo eventos da ordem de serviço ${serviceOrderId}...`);
    
    const { error } = await supabase
      .from('service_events')
      .delete()
      .eq('service_order_id', serviceOrderId);
    
    if (error) {
      console.error(`Erro ao excluir eventos da OS ${serviceOrderId}:`, error);
      return false;
    }
    
    console.log(`Eventos da ordem de serviço ${serviceOrderId} excluídos com sucesso`);
    return true;
  } catch (error) {
    console.error(`Erro ao excluir eventos da ordem de serviço ${serviceOrderId}:`, error);
    return false;
  }
};

/**
 * Creates a diagnosis event for a service order
 */
const createDiagnosisEvent = async (
  serviceOrderId: string, 
  userId: string, 
  diagnosisData: any
): Promise<boolean> => {
  try {
    console.log(`Criando evento de diagnóstico para OS ${serviceOrderId} pelo usuário ${userId}`);
    console.log('Dados do diagnóstico:', diagnosisData);
    
    // Verificar se os parâmetros são válidos
    if (!serviceOrderId || !userId) {
      console.error('ID da ordem de serviço ou ID do usuário inválidos');
      return false;
    }
    
    // Usar a função RPC insert_service_event em vez de inserção direta na tabela
    // Isso vai contornar as políticas de RLS já que é uma função SECURITY DEFINER
    const { data, error } = await supabase
      .rpc('insert_service_event', {
        p_service_order_id: serviceOrderId,
        p_type: 'diagnosis',
        p_created_by: userId,
        p_description: JSON.stringify(diagnosisData)
      });
    
    if (error) {
      console.error(`Falha ao salvar diagnóstico via RPC: ${error.message}`);
      return false;
    }
    
    console.log(`Evento de diagnóstico criado com sucesso via RPC: ID=${data}`);
    return true;
  } catch (error) {
    console.error(`Erro ao criar evento de diagnóstico:`, error);
    return false;
  }
};

export const serviceEventMutationService = {
  deleteByServiceOrderId,
  createDiagnosisEvent
};
