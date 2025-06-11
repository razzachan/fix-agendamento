
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { getUserSession, saveUserSession } from './persistentSession';

/**
 * Busca o usuário atual baseado na sessão
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Primeiro, tenta recuperar a sessão do localStorage
    const localUser = getUserSession();
    if (localUser) {
      console.log('Usuário recuperado do localStorage:', localUser.email);
      return localUser;
    }

    // Se não encontrar no localStorage, tenta recuperar da sessão do Supabase
    console.log('Tentando recuperar sessão do Supabase');
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.user) {
      console.log('Nenhuma sessão ativa no Supabase');
      return null;
    }

    // Buscar dados do usuário na tabela users (não profiles)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
    }

    const user = {
      id: data.session.user.id,
      name: profileData?.name || data.session.user.user_metadata.name || 'Usuário',
      email: data.session.user.email || '',
      role: profileData?.role || 'client',
      avatar: profileData?.avatar || undefined,
      phone: profileData?.phone || undefined,
      address: profileData?.address || undefined,
      city: profileData?.city || undefined,
      state: profileData?.state || undefined,
      zip_code: profileData?.zip_code || undefined,
    };

    console.log('✅ [Session] Usuário carregado com avatar:', user.avatar);

    // Salva o usuário no localStorage para persistência
    saveUserSession(user);

    return user;
  } catch (error) {
    console.error('Erro ao recuperar sessão:', error);
    return null;
  }
}

/**
 * Faz o logout do usuário
 */
export async function logout(): Promise<boolean> {
  try {
    // Limpar a sessão do localStorage
    import('./persistentSession').then(({ clearUserSession }) => {
      clearUserSession();
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout do Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
}
