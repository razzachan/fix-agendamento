
import { supabase } from '@/integrations/supabase/client';

export const clientMergeService = {
  // Function to merge duplicate clients
  async mergeDuplicateClients(): Promise<{ mergedCount: number } | null> {
    try {
      console.log('Iniciando processo de mesclagem de clientes duplicados...');
      
      // Call the PostgreSQL function we created for merging duplicates
      const { data, error } = await supabase
        .rpc('merge_duplicate_clients');

      if (error) {
        console.error('Erro ao chamar função de mesclagem de clientes:', error);
        throw error;
      }

      console.log('Resultado da mesclagem:', data);
      
      // Return the number of merged clients
      return { 
        mergedCount: data || 0 
      };
    } catch (error) {
      console.error('Erro ao mesclar clientes duplicados:', error);
      return null;
    }
  }
};
