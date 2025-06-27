import { useState, useEffect, useCallback } from 'react';
import { 
  detectCacheIssues, 
  autoFixCacheIssues, 
  clearAllCache, 
  diagnoseCacheState 
} from '@/utils/cacheUtils';

interface CacheIssue {
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: () => void;
}

interface CacheManagerState {
  hasIssues: boolean;
  issues: string[];
  isChecking: boolean;
  isFixing: boolean;
  lastCheck: Date | null;
  autoFixAvailable: boolean;
}

export const useCacheManager = () => {
  const [state, setState] = useState<CacheManagerState>({
    hasIssues: false,
    issues: [],
    isChecking: false,
    isFixing: false,
    lastCheck: null,
    autoFixAvailable: false
  });

  // Verificar problemas de cache
  const checkCacheIssues = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }));
    
    try {
      console.log('🔍 [CacheManager] Verificando problemas de cache...');
      
      const result = detectCacheIssues();
      
      setState(prev => ({
        ...prev,
        hasIssues: result.hasIssues,
        issues: result.issues,
        lastCheck: new Date(),
        autoFixAvailable: result.hasIssues,
        isChecking: false
      }));

      if (result.hasIssues) {
        console.warn(`⚠️ [CacheManager] ${result.issues.length} problema(s) encontrado(s)`);
      } else {
        console.log('✅ [CacheManager] Cache está saudável');
      }

      return result;
    } catch (error) {
      console.error('❌ [CacheManager] Erro ao verificar cache:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        hasIssues: true,
        issues: ['Erro na verificação de cache']
      }));
      return { hasIssues: true, issues: ['Erro na verificação'] };
    }
  }, []);

  // Correção automática de problemas
  const autoFix = useCallback(async () => {
    setState(prev => ({ ...prev, isFixing: true }));
    
    try {
      console.log('🔧 [CacheManager] Iniciando correção automática...');
      
      const result = await autoFixCacheIssues();
      
      if (result.fixed) {
        console.log(`✅ [CacheManager] Correção concluída: ${result.actions.length} ações`);
        
        // Verificar novamente após correção
        setTimeout(() => {
          checkCacheIssues();
        }, 1000);
      }

      setState(prev => ({ ...prev, isFixing: false }));
      return result;
    } catch (error) {
      console.error('❌ [CacheManager] Erro na correção automática:', error);
      setState(prev => ({ ...prev, isFixing: false }));
      return { fixed: false, actions: ['Erro na correção'] };
    }
  }, [checkCacheIssues]);

  // Limpeza completa de cache
  const clearCache = useCallback(async () => {
    try {
      console.log('🧹 [CacheManager] Iniciando limpeza completa...');
      await clearAllCache();
      
      // Resetar estado
      setState({
        hasIssues: false,
        issues: [],
        isChecking: false,
        isFixing: false,
        lastCheck: new Date(),
        autoFixAvailable: false
      });

      return true;
    } catch (error) {
      console.error('❌ [CacheManager] Erro na limpeza:', error);
      return false;
    }
  }, []);

  // Diagnóstico detalhado
  const runDiagnostic = useCallback(() => {
    console.log('🔍 [CacheManager] Executando diagnóstico detalhado...');
    diagnoseCacheState();
  }, []);

  // Verificação automática na inicialização
  useEffect(() => {
    // Verificar cache ao carregar o hook
    const timer = setTimeout(() => {
      checkCacheIssues();
    }, 2000); // Aguardar 2s para o sistema carregar

    return () => clearTimeout(timer);
  }, [checkCacheIssues]);

  // Verificação periódica (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isChecking && !state.isFixing) {
        checkCacheIssues();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [checkCacheIssues, state.isChecking, state.isFixing]);

  // Gerar alertas baseados nos problemas encontrados
  const getAlerts = useCallback((): CacheIssue[] => {
    if (!state.hasIssues) return [];

    const alerts: CacheIssue[] = [];

    state.issues.forEach(issue => {
      if (issue.includes('corrompido')) {
        alerts.push({
          type: 'error',
          message: `Dados corrompidos detectados: ${issue}`,
          action: autoFix
        });
      } else if (issue.includes('grande') || issue.includes('muitas')) {
        alerts.push({
          type: 'warning',
          message: `Cache excessivo: ${issue}`,
          action: autoFix
        });
      } else if (issue.includes('versão')) {
        alerts.push({
          type: 'info',
          message: `Sistema desatualizado: ${issue}`,
          action: autoFix
        });
      } else {
        alerts.push({
          type: 'warning',
          message: issue,
          action: autoFix
        });
      }
    });

    return alerts;
  }, [state.hasIssues, state.issues, autoFix]);

  return {
    // Estado
    ...state,
    
    // Ações
    checkCacheIssues,
    autoFix,
    clearCache,
    runDiagnostic,
    
    // Utilitários
    getAlerts,
    
    // Status helpers
    isHealthy: !state.hasIssues,
    needsAttention: state.hasIssues && state.issues.some(i => i.includes('corrompido')),
    canAutoFix: state.autoFixAvailable && !state.isFixing
  };
};
