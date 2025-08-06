
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { getUserSession, saveUserSession } from './persistentSession';

/**
 * Busca o usuário atual baseado na sessão
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('🔍 [getCurrentUser] ===== INICIANDO VERIFICAÇÃO DE USUÁRIO =====');

    // Primeiro, tenta recuperar a sessão do localStorage
    const localUser = getUserSession();
    console.log('🔍 [getCurrentUser] LocalUser encontrado:', !!localUser);
    if (localUser) {
      console.log('🔍 [getCurrentUser] Usuário recuperado do localStorage:', {
        email: localUser.email,
        role: localUser.role,
        id: localUser.id
      });

      // Validar se a role está correta para oficinas
      if (localUser.email === 'joaooficina@fixfogoes.com.br' && localUser.role !== 'workshop') {
        console.log('🚨 [Session] Role incorreto detectado na sessão local, limpando...');

        // Executar logout direto sem import circular
        await supabase.auth.signOut();

        // Limpar TUDO - incluindo chaves específicas do Supabase
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Limpar sessionStorage também
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) sessionKeysToRemove.push(key);
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

        console.log('🧹 [Session] Limpeza completa realizada');

        // Redirecionar para login
        window.location.href = '/login';
        return null;
      }

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

    // Verificar se é o usuário da oficina (fallback especial)
    const userEmail = data.session.user.email || '';
    let userRole = profileData?.role || 'client';

    if (userEmail === 'joaooficina@fixfogoes.com.br') {
      console.log('🔧 [Session] Detectado usuário da oficina, forçando role workshop');
      userRole = 'workshop';
    }

    const user = {
      id: data.session.user.id,
      name: profileData?.name || data.session.user.user_metadata.name || 'Usuário',
      email: userEmail,
      role: userRole,
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
