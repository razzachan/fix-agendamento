import { supabase } from '@/integrations/supabase/client';
import { ServiceOrderStatus } from '@/types';
import { ServiceOrderProgressEntry } from '@/types/serviceOrderProgress';
import { v4 as uuidv4 } from 'uuid';

interface AddProgressEntryParams {
  serviceOrderId: string;
  status: ServiceOrderStatus;
  userId?: string;
  userName?: string;
  notes?: string;
  systemGenerated?: boolean;
}

/**
 * Adiciona uma nova entrada ao histórico de progresso de uma ordem de serviço
 * @param params Parâmetros para a nova entrada de progresso
 * @returns A entrada de progresso criada ou null em caso de erro
 */
export async function addProgressEntry(params: AddProgressEntryParams): Promise<ServiceOrderProgressEntry | null> {
  try {
    const {
      serviceOrderId,
      status,
      userId,
      userName,
      notes,
      systemGenerated = false
    } = params;
    
    console.log(`Adicionando entrada de progresso para ordem ${serviceOrderId} com status ${status}`);
    
    // Criar a entrada de progresso
    const entryData = {
      id: uuidv4(),
      service_order_id: serviceOrderId,
      status,
      timestamp: new Date().toISOString(),
      user_id: userId || null,
      user_name: userName || null,
      notes: notes || null,
      system_generated: systemGenerated
    };
    
    // Inserir a entrada no banco de dados
    const { data, error } = await supabase
      .from('service_order_progress')
      .insert(entryData)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao adicionar entrada de progresso:', error);
      return null;
    }
    
    if (!data) {
      console.error('Nenhum dado retornado após inserção de entrada de progresso');
      return null;
    }
    
    // Mapear os dados para o formato esperado
    return {
      id: data.id,
      serviceOrderId: data.service_order_id,
      status: data.status,
      timestamp: data.timestamp,
      userId: data.user_id,
      userName: data.user_name,
      notes: data.notes,
      systemGenerated: data.system_generated
    };
  } catch (error) {
    console.error('Erro ao adicionar entrada de progresso:', error);
    return null;
  }
}
