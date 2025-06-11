
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { mapClientData } from '../utils';

export const clientUpdateService = {
  async update(id: string, data: Partial<Client>): Promise<Client | null> {
    console.log(`Iniciando atualização do cliente ${id}:`, data);
    
    try {
      // Validar dados antes de enviar para o banco
      if (!id || typeof id !== 'string') {
        console.error('ID de cliente inválido:', id);
        throw new Error('ID de cliente inválido');
      }
      
      if (!data || typeof data !== 'object') {
        console.error('Dados de cliente inválidos:', data);
        throw new Error('Dados de cliente inválidos');
      }
      
      // Usar a função RPC para atualizar o cliente - isso resolve problemas de permissão
      const { error } = await supabase
        .rpc('update_client', { 
          client_id: id,
          client_name: data.name,
          client_email: data.email,
          client_phone: data.phone,
          client_address: data.address,
          client_city: data.city,
          client_state: data.state,
          client_zip_code: data.zipCode
        });
      
      if (error) {
        console.error(`Erro ao atualizar cliente ${id} via RPC:`, error);
        throw error;
      }
      
      // Buscar o cliente atualizado
      console.log('Cliente atualizado via RPC, buscando dados atualizados...');
      const { data: clientData, error: fetchError } = await supabase
        .rpc('get_client_by_id', { client_id: id })
        .maybeSingle();
      
      if (fetchError) {
        console.error('Erro ao buscar cliente atualizado:', fetchError);
        throw new Error('Erro ao buscar cliente atualizado');
      }
      
      if (clientData) {
        console.log(`Cliente ${id} atualizado e recuperado com sucesso:`, clientData);
        return mapClientData(clientData);
      }
      
      console.error(`Cliente ${id} não encontrado após atualização`);
      throw new Error(`Cliente ${id} não encontrado após atualização`);
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      throw error;
    }
  }
};
