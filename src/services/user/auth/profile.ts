
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

/**
 * Atualiza o perfil do usuário
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    // Atualizar os metadados do usuário no Auth (incluindo senha se fornecida)
    const authUpdates: any = {};

    if (updates.name) {
      authUpdates.data = { name: updates.name };
    }

    // Atualizar senha se fornecida
    if (updates.password) {
      authUpdates.password = updates.password;
      console.log('🔑 [updateProfile] Atualizando senha para usuário:', userId);
    }

    // Só fazer update no auth se houver algo para atualizar
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates);
      if (authError) {
        console.error('❌ [updateProfile] Erro ao atualizar auth:', authError);
        throw authError;
      }
      console.log('✅ [updateProfile] Auth atualizado com sucesso');
    }

    // Atualizar os dados do perfil (exceto senha que já foi atualizada no auth)
    const profileUpdates: any = {};

    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.address !== undefined) profileUpdates.address = updates.address;
    if (updates.city !== undefined) profileUpdates.city = updates.city;
    if (updates.state !== undefined) profileUpdates.state = updates.state;
    if (updates.zip_code !== undefined) profileUpdates.zip_code = updates.zip_code;
    if (updates.avatar !== undefined) profileUpdates.avatar = updates.avatar;

    // Só atualizar se houver dados para atualizar
    if (Object.keys(profileUpdates).length > 0) {
      console.log('🔄 [updateProfile] Atualizando perfil:', profileUpdates);

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ [updateProfile] Erro ao atualizar perfil:', error);
        throw error;
      }

      console.log('✅ [updateProfile] Perfil atualizado com sucesso');
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
    } else {
      // Se não há dados de perfil para atualizar, buscar dados atuais
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ [updateProfile] Erro ao buscar perfil:', error);
        throw error;
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
    }
  } catch (error) {
    console.error('❌ [updateProfile] Erro geral ao atualizar perfil:', error);
    return null;
  }
}
