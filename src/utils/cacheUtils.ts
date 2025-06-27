// Cache utilities for Fix Fogões system

/**
 * Limpa todos os dados de cache e localStorage que podem estar causando conflitos
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    console.log('🧹 [CacheUtils] Iniciando limpeza completa de cache...');

    // 1. Limpar localStorage (exceto dados essenciais)
    const allKeys = Object.keys(localStorage);

    // Definir chaves essenciais que NUNCA devem ser removidas
    const essentialKeys = [
      'mapboxToken',
      // Preservar TODOS os tokens de auth do Supabase
      ...allKeys.filter(key => key.startsWith('sb-') && key.includes('-auth-token'))
    ];

    allKeys.forEach(key => {
      // Verificar se é uma chave essencial
      const isEssential = essentialKeys.includes(key) ||
                         (key.startsWith('sb-') && key.includes('-auth-token'));

      if (!isEssential) {
        localStorage.removeItem(key);
        console.log(`🗑️ [CacheUtils] Removido localStorage: ${key}`);
      } else {
        console.log(`🔒 [CacheUtils] Preservando chave essencial: ${key}`);
      }
    });

    // 2. Limpar sessionStorage
    sessionStorage.clear();
    console.log('🗑️ [CacheUtils] SessionStorage limpo');

    // 3. Limpar cache do navegador (Service Worker)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`🗑️ [CacheUtils] Removendo cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }

    // 4. Limpar dados temporários (PRESERVAR AUTH TOKENS)
    const tempKeys = allKeys.filter(key =>
      (key.includes('temp') ||
       key.includes('cache') ||
       key.includes('old')) &&
      !key.includes('-auth-token') // NUNCA remover tokens de auth válidos
    );

    tempKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ [CacheUtils] Removido dados temporários: ${key}`);
    });

    // Preservar explicitamente tokens de auth do Supabase
    const authTokens = allKeys.filter(key =>
      key.startsWith('sb-') && key.includes('-auth-token')
    );
    authTokens.forEach(key => {
      console.log(`🔒 [CacheUtils] Preservando token de auth: ${key}`);
    });

    console.log('✅ [CacheUtils] Limpeza completa de cache finalizada');
  } catch (error) {
    console.error('❌ [CacheUtils] Erro ao limpar cache:', error);
  }
};

/**
 * Limpa apenas dados relacionados às notificações
 */
export const clearNotificationCache = (): void => {
  try {
    console.log('🔔 [CacheUtils] Limpando cache de notificações...');
    
    const notificationKeys = Object.keys(localStorage).filter(key =>
      key.includes('notification') ||
      key.includes('realtime') ||
      key.includes('pwa-notification')
    );

    notificationKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ [CacheUtils] Removido notification key: ${key}`);
    });

    console.log('✅ [CacheUtils] Cache de notificações limpo');
  } catch (error) {
    console.error('❌ [CacheUtils] Erro ao limpar cache de notificações:', error);
  }
};

/**
 * Força refresh completo da página sem cache
 */
export const forceRefresh = (): void => {
  console.log('🔄 [CacheUtils] Forçando refresh sem cache...');
  window.location.reload();
};

/**
 * Detecta se há problemas de cache baseado em sintomas comuns
 */
export const detectCacheIssues = (): { hasIssues: boolean; issues: string[] } => {
  const issues: string[] = [];

  try {
    console.log('🔍 [CacheUtils] Iniciando detecção de problemas de cache...');

    // 1. Verificar inconsistências de autenticação
    const sessionData = localStorage.getItem('eletrofix_session');
    const supabaseAuth = Object.keys(localStorage).find(key => key.includes('sb-'));

    if (sessionData && !supabaseAuth) {
      // Toda sessão local deve ter autenticação Supabase correspondente
      issues.push('Sessão local sem autenticação Supabase');
      console.warn('⚠️ [CacheUtils] Detectado: Sessão local sem auth Supabase');
    }

    // 2. Verificar dados corrompidos ou malformados
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && (key.includes('session') || key.includes('auth') || key.includes('user'))) {
          JSON.parse(value); // Tentar parsear dados importantes
        }
      } catch (e) {
        issues.push(`Dados corrompidos na chave: ${key}`);
        console.warn(`⚠️ [CacheUtils] Dados corrompidos em: ${key}`);
      }
    });

    // 3. Verificar cache excessivo
    const cacheKeys = allKeys.filter(key =>
      key.includes('cache') ||
      key.includes('temp') ||
      key.includes('old') ||
      key.includes('backup')
    );

    if (cacheKeys.length > 15) {
      issues.push(`Muitas chaves de cache antigas (${cacheKeys.length})`);
      console.warn(`⚠️ [CacheUtils] Detectado: ${cacheKeys.length} chaves de cache antigas`);
    }

    // 4. Verificar tamanho excessivo do localStorage
    let totalSize = 0;
    allKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) totalSize += value.length;
    });

    if (totalSize > 5 * 1024 * 1024) { // 5MB
      issues.push(`LocalStorage muito grande (${Math.round(totalSize / 1024 / 1024)}MB)`);
      console.warn(`⚠️ [CacheUtils] LocalStorage muito grande: ${Math.round(totalSize / 1024 / 1024)}MB`);
    }

    // 5. Verificar chaves duplicadas ou conflitantes
    const duplicatePatterns = ['notification', 'realtime', 'socket', 'connection'];
    duplicatePatterns.forEach(pattern => {
      const matchingKeys = allKeys.filter(key => key.toLowerCase().includes(pattern));
      if (matchingKeys.length > 3) {
        issues.push(`Muitas chaves relacionadas a ${pattern} (${matchingKeys.length})`);
        console.warn(`⚠️ [CacheUtils] Muitas chaves ${pattern}: ${matchingKeys.length}`);
      }
    });

    // 6. Verificar versão do sistema
    const systemVersion = localStorage.getItem('system_version');
    const currentVersion = '3.1.0'; // Versão atual do Fix Fogões

    if (systemVersion && systemVersion !== currentVersion) {
      issues.push(`Versão do sistema desatualizada (${systemVersion} vs ${currentVersion})`);
      console.warn(`⚠️ [CacheUtils] Versão desatualizada: ${systemVersion}`);
    }

    const hasIssues = issues.length > 0;

    if (hasIssues) {
      console.warn(`⚠️ [CacheUtils] ${issues.length} problema(s) detectado(s):`, issues);
    } else {
      console.log('✅ [CacheUtils] Nenhum problema de cache detectado');
    }

    return { hasIssues, issues };

  } catch (error) {
    console.error('❌ [CacheUtils] Erro ao detectar problemas de cache:', error);
    return { hasIssues: true, issues: ['Erro na detecção de problemas'] };
  }
};

/**
 * Limpa dados específicos de autenticação corrompidos (PRESERVA TOKENS VÁLIDOS)
 */
export const clearAuthCache = (): void => {
  try {
    console.log('🔐 [CacheUtils] Limpando cache de autenticação...');

    // Remover apenas sessão local (não tokens do Supabase)
    localStorage.removeItem('eletrofix_session');

    // NUNCA remover tokens de auth válidos do Supabase
    const allKeys = Object.keys(localStorage);
    const validAuthTokens = allKeys.filter(key =>
      key.startsWith('sb-') && key.includes('-auth-token')
    );

    validAuthTokens.forEach(key => {
      console.log(`🔒 [CacheUtils] Preservando token válido: ${key}`);
    });

    console.log('✅ [CacheUtils] Cache de autenticação limpo (tokens preservados)');
  } catch (error) {
    console.error('❌ [CacheUtils] Erro ao limpar cache de autenticação:', error);
  }
};

/**
 * Diagnóstico completo do estado do cache
 */
export const diagnoseCacheState = (): void => {
  console.log('🔍 [CacheUtils] === DIAGNÓSTICO COMPLETO DO SISTEMA ===');

  try {
    // 1. LocalStorage
    const localStorageKeys = Object.keys(localStorage);
    console.log(`📦 LocalStorage: ${localStorageKeys.length} chaves`);

    // Agrupar chaves por categoria
    const categories = {
      auth: localStorageKeys.filter(k => k.includes('auth') || k.includes('sb-') || k.includes('session')),
      notifications: localStorageKeys.filter(k => k.includes('notification') || k.includes('realtime')),
      cache: localStorageKeys.filter(k => k.includes('cache') || k.includes('temp')),
      system: localStorageKeys.filter(k => k.includes('system') || k.includes('version') || k.includes('config')),
      other: localStorageKeys.filter(k =>
        !k.includes('auth') && !k.includes('sb-') && !k.includes('session') &&
        !k.includes('notification') && !k.includes('realtime') &&
        !k.includes('cache') && !k.includes('temp') &&
        !k.includes('system') && !k.includes('version') && !k.includes('config')
      )
    };

    Object.entries(categories).forEach(([category, keys]) => {
      if (keys.length > 0) {
        console.log(`  📂 ${category.toUpperCase()}: ${keys.length} chaves`);
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          const size = value ? Math.round(value.length / 1024) : 0;
          console.log(`    - ${key}: ${size}KB`);
        });
      }
    });

    // 2. SessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    console.log(`📦 SessionStorage: ${sessionStorageKeys.length} chaves`);

    // 3. Dados específicos importantes
    const session = localStorage.getItem('eletrofix_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        console.log('👤 Sessão atual:', {
          id: parsed.id,
          email: parsed.email,
          role: parsed.role,
          timestamp: new Date(parsed.timestamp || Date.now()).toLocaleString()
        });
      } catch (e) {
        console.error('❌ Sessão corrompida:', session.substring(0, 100) + '...');
      }
    } else {
      console.log('👤 Nenhuma sessão encontrada');
    }

    // 4. Verificar problemas detalhados
    const { hasIssues, issues } = detectCacheIssues();
    console.log(`🚨 Problemas detectados: ${hasIssues ? 'SIM' : 'NÃO'}`);
    if (hasIssues) {
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    // 5. Estatísticas gerais
    let totalSize = 0;
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) totalSize += value.length;
    });

    console.log(`📊 Estatísticas:`);
    console.log(`  - Total de chaves: ${localStorageKeys.length}`);
    console.log(`  - Tamanho total: ${Math.round(totalSize / 1024)}KB`);
    console.log(`  - Versão do sistema: ${localStorage.getItem('system_version') || 'não definida'}`);
    console.log(`  - Última limpeza: ${localStorage.getItem('last_cache_cleanup') || 'nunca'}`);

  } catch (error) {
    console.error('❌ [CacheUtils] Erro no diagnóstico:', error);
  }

  console.log('🔍 [CacheUtils] === FIM DO DIAGNÓSTICO ===');
};

/**
 * Detecção automática e correção de problemas de cache
 */
export const autoFixCacheIssues = async (): Promise<{ fixed: boolean; actions: string[] }> => {
  const actions: string[] = [];

  try {
    console.log('🔧 [CacheUtils] Iniciando correção automática...');

    const { hasIssues, issues } = detectCacheIssues();

    if (!hasIssues) {
      console.log('✅ [CacheUtils] Nenhum problema encontrado');
      return { fixed: true, actions: ['Nenhuma correção necessária'] };
    }

    // Correção 1: Problema específico de sessão Supabase
    if (issues.some(issue => issue.includes('Sessão local sem autenticação Supabase'))) {
      console.log('🔧 [CacheUtils] Corrigindo problema de sessão Supabase...');

      try {
        // Importar dinamicamente para evitar dependências circulares
        const { recoverSupabaseSession } = await import('@/utils/sessionRecovery');
        const result = await recoverSupabaseSession();

        if (result.success) {
          actions.push('Sessão do Supabase recuperada com sucesso');
          console.log('✅ [CacheUtils] Sessão do Supabase recuperada');
        } else {
          // Se não conseguir recuperar, limpar dados locais inconsistentes
          localStorage.removeItem('eletrofix_session');
          actions.push('Dados de sessão local inconsistentes removidos');
          console.log('🗑️ [CacheUtils] Dados de sessão local removidos');
        }
      } catch (error) {
        console.error('❌ [CacheUtils] Erro ao recuperar sessão:', error);
        // Fallback: limpar dados locais
        localStorage.removeItem('eletrofix_session');
        actions.push('Dados de sessão local removidos (fallback)');
      }
    }

    // Correção 2: Limpar dados corrompidos
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && (key.includes('session') || key.includes('auth') || key.includes('user'))) {
          JSON.parse(value); // Tentar parsear
        }
      } catch (e) {
        localStorage.removeItem(key);
        actions.push(`Removido dado corrompido: ${key}`);
        console.log(`🗑️ [CacheUtils] Removido dado corrompido: ${key}`);
      }
    });

    // Correção 3: Limpar cache excessivo
    const cacheKeys = allKeys.filter(key =>
      key.includes('cache') ||
      key.includes('temp') ||
      key.includes('old') ||
      key.includes('backup')
    );

    if (cacheKeys.length > 10) {
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        actions.push(`Removido cache antigo: ${key}`);
      });
      console.log(`🗑️ [CacheUtils] Removidos ${cacheKeys.length} caches antigos`);
    }

    // Correção 4: Atualizar versão do sistema
    localStorage.setItem('system_version', '3.1.0');
    localStorage.setItem('last_cache_cleanup', new Date().toISOString());
    actions.push('Versão do sistema atualizada');

    // Correção 5: Limpar notificações duplicadas
    const notificationKeys = allKeys.filter(key => key.includes('notification'));
    if (notificationKeys.length > 5) {
      notificationKeys.slice(5).forEach(key => {
        localStorage.removeItem(key);
        actions.push(`Removida notificação duplicada: ${key}`);
      });
    }

    console.log(`✅ [CacheUtils] Correção automática concluída: ${actions.length} ações`);
    return { fixed: true, actions };

  } catch (error) {
    console.error('❌ [CacheUtils] Erro na correção automática:', error);
    return { fixed: false, actions: ['Erro na correção automática'] };
  }
};
