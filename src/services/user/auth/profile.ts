
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

/**
 * Atualiza o perfil do usuário
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    // Atualizar os metadados do usuário no Auth
    if (updates.name) {
      await supabase.auth.updateUser({
        data: { name: updates.name }
      });
    }
    
    // Atualizar os dados do perfil
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zip_code: updates.zip_code,
        avatar: updates.avatar
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zip_code: data.zip_code || undefined,
    };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return null;
  }
}
