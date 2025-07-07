
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { userService } from '@/services';

/**
 * Links a client with a user account if needed
 */
export async function linkClientWithUserAccount(
  clientId: string, 
  userId: string | null, 
  clientData: Partial<Client>
): Promise<void> {
  // If client exists but doesn't have a user account yet, create one
  if (!userId && clientData.email) {
    try {
      console.log("Creating user account for existing client with email:", clientData.email);
      
      // Primeiro, verificar se já existe um usuário com este email
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', clientData.email)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing user:', checkError);
        return;
      }
      
      let newUserId: string | null = null;
      
      if (existingUsers) {
        console.log("User with this email already exists, using existing ID:", existingUsers.id);
        newUserId = existingUsers.id;
      } else {
        // Criar novo usuário
        try {
          const user = await userService.createUser({
            name: clientData.name || 'Cliente',
            email: clientData.email,
            password: 'FixFogoes@2024', // Senha padrão segura que atende requisitos do Supabase
            role: 'client'
          });
          
          if (user) {
            console.log("User account created successfully:", user.id);
            newUserId = user.id;
          }
        } catch (userError) {
          console.error('Error creating user:', userError);
          return;
        }
      }
      
      if (newUserId) {
        // Update client with user_id
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: newUserId })
          .eq('id', clientId);
          
        if (updateError) {
          console.error('Error updating client with user_id:', updateError);
        } else {
          console.log('User account linked to existing client');
        }
      }
    } catch (error) {
      console.error('Error creating user account for existing client:', error);
    }
  }
}
