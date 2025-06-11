
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { toast } from 'sonner';
import { mapClientData } from '../utils';

export const clientCreateService = {
  async create(clientData: Partial<Client>): Promise<Client | null> {
    try {
      console.log('Criando novo cliente:', clientData);
      
      // Create client directly in the clients table with improved error handling
      console.log('Tentando inserir cliente diretamente na tabela...');
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientData.name || 'Cliente sem nome',
          email: clientData.email || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zip_code: clientData.zipCode || null
        })
        .select('*')
        .single();
      
      // If direct insert fails, try using the RPC function
      if (error) {
        console.log('Inserção direta falhou. Erro:', error);
        console.log('Tentando via função RPC create_client...');
        
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_client', {
            client_name: clientData.name || 'Cliente sem nome',
            client_email: clientData.email || null,
            client_phone: clientData.phone || null,
            client_address: clientData.address || null,
            client_city: clientData.city || null,
            client_state: clientData.state || null,
            client_zip_code: clientData.zipCode || null
          })
          .select('*')
          .single();
          
        if (rpcError) {
          console.error('Erro ao criar cliente via RPC:', rpcError);
          throw rpcError;
        }
        
        console.log('Cliente criado com sucesso via RPC:', rpcData);
        
        // Verify the client was created
        await this.verifyClientCreation(rpcData?.id);
        
        return rpcData ? mapClientData(rpcData) : null;
      }
      
      console.log('Cliente criado com sucesso via inserção direta:', data);
      
      // Verify the client was created
      await this.verifyClientCreation(data?.id);
      
      return data ? mapClientData(data) : null;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao criar cliente');
      return null;
    }
  },

  // Helper function to verify client creation
  async verifyClientCreation(clientId: string | undefined): Promise<void> {
    if (!clientId) return;
    
    try {
      console.log(`Verificando se o cliente ${clientId} foi realmente criado...`);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
        
      if (error) {
        console.error('Erro ao verificar cliente após criação:', error);
      } else if (data) {
        console.log('Cliente verificado e encontrado após criação:', data);
      } else {
        console.log('Cliente não encontrado após criação');
      }
    } catch (err) {
      console.error('Erro ao verificar cliente:', err);
    }
  }
};
