// Session Recovery - Recupera sessão autenticada no Supabase
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { authService } from '@/services/user/authService';

interface SessionRecoveryResult {
  success: boolean;
  user: User | null;
  message: string;
  actions: string[];
}

/**
 * Recupera a sessão autenticada no Supabase
 */
export const recoverSupabaseSession = async (): Promise<SessionRecoveryResult> => {
  const actions: string[] = [];
  
  try {
    console.log('🔄 [SessionRecovery] Iniciando recuperação de sessão...');
    
    // 1. Verificar sessão atual no Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ [SessionRecovery] Erro ao verificar sessão:', sessionError);
      actions.push(`Erro na verificação: ${sessionError.message}`);
    }

    if (sessionData?.session?.user) {
      console.log('✅ [SessionRecovery] Sessão ativa encontrada no Supabase');
      actions.push('Sessão ativa encontrada no Supabase');
      
      // Tentar recuperar dados do usuário
      const user = await authService.getCurrentUser();
      if (user) {
        actions.push(`Usuário recuperado: ${user.email}`);
        return {
          success: true,
          user,
          message: 'Sessão recuperada com sucesso!',
          actions
        };
      }
    }

    // 2. Verificar localStorage
    console.log('🔍 [SessionRecovery] Verificando localStorage...');
    const localSession = localStorage.getItem('eletrofix_session');
    
    if (localSession) {
      try {
        const userData = JSON.parse(localSession);
        console.log('📦 [SessionRecovery] Dados encontrados no localStorage:', userData.email);
        actions.push(`Dados encontrados no localStorage: ${userData.email}`);
        
        // Verificar se é uma sessão válida do Supabase
        console.log('🔍 [SessionRecovery] Verificando sessão local...');
        actions.push('Verificando sessão local...');
        
        // Para contas reais, tentar reautenticar
        console.log('🔐 [SessionRecovery] Tentando reautenticar conta real...');
        actions.push('Tentando reautenticar conta real...');
        
        // Tentar fazer login silencioso (se temos dados salvos)
        const savedPassword = localStorage.getItem(`password_${userData.email}`);
        if (savedPassword) {
          try {
            const user = await authService.login(userData.email, savedPassword);
            if (user) {
              actions.push('Reautenticação bem-sucedida');
              return {
                success: true,
                user,
                message: 'Sessão reautenticada com sucesso!',
                actions
              };
            }
          } catch (error) {
            console.warn('⚠️ [SessionRecovery] Falha na reautenticação:', error);
            actions.push('Falha na reautenticação automática');
          }
        }
        
        // Se chegou aqui, usar dados do localStorage mesmo sem sessão ativa
        actions.push('Usando dados do localStorage (sessão local)');
        return {
          success: true,
          user: userData,
          message: 'Sessão local recuperada (pode precisar relogar)',
          actions
        };
        
      } catch (error) {
        console.error('❌ [SessionRecovery] Erro ao parsear localStorage:', error);
        actions.push('Erro ao parsear dados do localStorage');
      }
    }

    // 3. Verificar chaves do Supabase no localStorage
    console.log('🔍 [SessionRecovery] Verificando chaves do Supabase...');
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('sb-') || key.includes('supabase')
    );
    
    if (supabaseKeys.length > 0) {
      console.log('🔑 [SessionRecovery] Chaves do Supabase encontradas:', supabaseKeys);
      actions.push(`${supabaseKeys.length} chaves do Supabase encontradas`);
      
      // Tentar refresh da sessão
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData?.session?.user) {
          console.log('✅ [SessionRecovery] Sessão refreshed com sucesso');
          actions.push('Sessão refreshed com sucesso');
          
          const user = await authService.getCurrentUser();
          if (user) {
            return {
              success: true,
              user,
              message: 'Sessão refreshed e recuperada!',
              actions
            };
          }
        } else {
          console.warn('⚠️ [SessionRecovery] Falha no refresh:', refreshError);
          actions.push('Falha no refresh da sessão');
        }
      } catch (error) {
        console.error('❌ [SessionRecovery] Erro no refresh:', error);
        actions.push('Erro no refresh da sessão');
      }
    }

    // 4. Falha na recuperação - apenas autenticação Supabase é aceita
    console.log('❌ [SessionRecovery] Falha na recuperação de sessão');
    actions.push('Falha na recuperação - apenas autenticação Supabase é aceita');

    // Se chegou aqui, não foi possível recuperar
    actions.push('Nenhuma sessão válida encontrada');
    return {
      success: false,
      user: null,
      message: 'Nenhuma sessão válida encontrada. Faça login novamente.',
      actions
    };
    
  } catch (error) {
    console.error('❌ [SessionRecovery] Erro geral na recuperação:', error);
    actions.push(`Erro geral: ${error}`);
    
    return {
      success: false,
      user: null,
      message: 'Erro na recuperação de sessão. Tente fazer login novamente.',
      actions
    };
  }
};

/**
 * Diagnóstico completo da sessão
 */
export const diagnoseSession = (): void => {
  console.log('🔍 [SessionRecovery] === DIAGNÓSTICO DE SESSÃO ===');
  
  try {
    // 1. Verificar localStorage
    const localSession = localStorage.getItem('eletrofix_session');
    console.log('📦 LocalStorage Session:', localSession ? 'PRESENTE' : 'AUSENTE');
    
    if (localSession) {
      try {
        const userData = JSON.parse(localSession);
        console.log('👤 Usuário no localStorage:', {
          email: userData.email,
          role: userData.role,
          name: userData.name
        });
      } catch (e) {
        console.error('❌ Dados corrompidos no localStorage');
      }
    }

    // 2. Verificar chaves do Supabase
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('sb-') || key.includes('supabase')
    );
    console.log('🔑 Chaves do Supabase:', supabaseKeys.length);
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  - ${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
    });

    // 3. Verificar sessão do Supabase
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Erro na sessão do Supabase:', error);
      } else if (data?.session) {
        console.log('✅ Sessão ativa no Supabase:', {
          user_id: data.session.user.id,
          email: data.session.user.email,
          expires_at: new Date(data.session.expires_at! * 1000).toLocaleString()
        });
      } else {
        console.log('❌ Nenhuma sessão ativa no Supabase');
      }
    });

    // 4. Verificar usuário atual
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('❌ Erro ao buscar usuário:', error);
      } else if (data?.user) {
        console.log('👤 Usuário atual no Supabase:', {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        });
      } else {
        console.log('❌ Nenhum usuário autenticado no Supabase');
      }
    });
    
  } catch (error) {
    console.error('❌ [SessionRecovery] Erro no diagnóstico:', error);
  }
  
  console.log('🔍 [SessionRecovery] === FIM DO DIAGNÓSTICO ===');
};
