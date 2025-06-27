/**
 * Utilitários para limpeza de dados em produção
 */

/**
 * Limpa todos os dados de desenvolvimento/cache do navegador
 */
export function clearDevelopmentData(): void {
  console.log('🧹 [ProductionCleanup] Iniciando limpeza de dados de desenvolvimento...');
  
  try {
    // Lista de chaves para remover
    const keysToRemove = [
      'eletrofix_session',
      'auth_token',
      'user_session'
    ];

    // Remover chaves específicas
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ [ProductionCleanup] Removido: ${key}`);
      }
    });

    // Remover apenas chaves específicas do Supabase (não tokens de auth válidos)
    Object.keys(localStorage).forEach(key => {
      // Preservar tokens de auth válidos do Supabase
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        console.log(`🔒 [ProductionCleanup] Preservando token de auth: ${key}`);
        return;
      }

      // Remover outras chaves de desenvolvimento do Supabase
      if (key.includes('supabase-demo') || key.includes('supabase-dev')) {
        localStorage.removeItem(key);
        console.log(`🗑️ [ProductionCleanup] Removido Supabase dev: ${key}`);
      }
    });

    // Limpar sessionStorage também
    sessionStorage.clear();
    console.log('🗑️ [ProductionCleanup] SessionStorage limpo');

    console.log('✅ [ProductionCleanup] Limpeza concluída com sucesso');
    
    return true;
  } catch (error) {
    console.error('❌ [ProductionCleanup] Erro na limpeza:', error);
    return false;
  }
}

/**
 * Verifica se estamos em produção
 */
export function isProduction(): boolean {
  return window.location.hostname === 'app.fixfogoes.com.br';
}

/**
 * Força logout e limpeza completa
 */
export async function forceLogoutAndClean(): Promise<void> {
  console.log('🔄 [ProductionCleanup] Forçando logout e limpeza...');

  // Evitar execução múltipla
  if ((window as any).__cleanupInProgress) {
    console.log('⚠️ [ProductionCleanup] Limpeza já em andamento, ignorando...');
    return;
  }

  (window as any).__cleanupInProgress = true;

  try {
    // Importar dinamicamente para evitar dependências circulares
    const { supabase } = await import('@/integrations/supabase/client');

    // Fazer logout do Supabase
    await supabase.auth.signOut();
    console.log('✅ [ProductionCleanup] Logout do Supabase realizado');

    // Limpar dados locais
    clearDevelopmentData();

    console.log('✅ [ProductionCleanup] Limpeza concluída, redirecionando...');

    // Redirecionar para login em vez de reload
    window.location.href = '/login';
  } catch (error) {
    console.error('❌ [ProductionCleanup] Erro no logout forçado:', error);
    // Mesmo com erro, limpar dados e redirecionar
    clearDevelopmentData();
    window.location.href = '/login';
  } finally {
    (window as any).__cleanupInProgress = false;
  }
}

/**
 * Inicialização automática em produção
 */
export function initProductionCleanup(): void {
  if (isProduction()) {
    console.log('🏭 [ProductionCleanup] Ambiente de produção detectado');
    
    // Verificar se há dados de desenvolvimento (excluindo tokens válidos)
    const hasDevData = localStorage.getItem('eletrofix_session') ||
                      localStorage.getItem('demo_session') ||
                      localStorage.getItem('admin_session') ||
                      Object.keys(localStorage).some(key =>
                        (key.includes('supabase-demo') || key.includes('supabase-dev')) &&
                        !key.includes('-auth-token')
                      );
    
    if (hasDevData) {
      console.log('⚠️ [ProductionCleanup] Dados de desenvolvimento detectados, limpando...');
      clearDevelopmentData();
    }
  }
}
