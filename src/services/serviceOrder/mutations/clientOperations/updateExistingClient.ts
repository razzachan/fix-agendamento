
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';

/**
 * Updates an existing client with new data
 */
export async function updateExistingClient(clientId: string, clientData: Partial<Client>): Promise<string | null> {
  console.log(`Updating existing client ${clientId} with:`, clientData);
  
  if (!clientId || !clientData) {
    console.error('ID de cliente ou dados inválidos:', { clientId, clientData });
    return null;
  }
  
  try {
    // Preparar os dados para atualização
    const updateData: any = {};
    
    // Incluir apenas campos definidos para evitar sobrescrever com valores nulos
    if (clientData.name !== undefined) updateData.name = clientData.name;
    if (clientData.email !== undefined) updateData.email = clientData.email || null;
    if (clientData.phone !== undefined) updateData.phone = clientData.phone || null;
    if (clientData.address !== undefined) updateData.address = clientData.address || null;
    if (clientData.city !== undefined) updateData.city = clientData.city || null;
    if (clientData.state !== undefined) updateData.state = clientData.state || null;
    if (clientData.zipCode !== undefined) updateData.zip_code = clientData.zipCode || null;
    
    // Verificar se há campos para atualizar
    if (Object.keys(updateData).length === 0) {
      console.warn(`Nenhum dado fornecido para atualizar cliente ${clientId}`);
      return clientId; // Retorna o ID sem fazer alterações
    }
    
    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select('id')
      .single();
      
    if (error) {
      console.error('Error updating client:', error);
      return null;
    }
    
    console.log(`Cliente ${clientId} atualizado com sucesso`);
    return data?.id || clientId;
  } catch (updateError) {
    console.error('Error in updateExistingClient:', updateError);
    return null;
  }
}
