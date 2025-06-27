// Debug Console - Comandos de depuração disponíveis no console do navegador
import { 
  clearAllCache, 
  clearNotificationCache, 
  diagnoseCacheState, 
  autoFixCacheIssues,
  detectCacheIssues 
} from './cacheUtils';
import {
  runSystemHealthCheck,
  forceHealthCheckWithReport,
  silentSystemInit
} from './systemHealthCheck';
import { recoverSupabaseSession, diagnoseSession } from './sessionRecovery';
import { runAuthAudit } from './runAuthAudit';
import { adminAccountSetup } from './adminAccountSetup';

declare global {
  interface Window {
    fixFogoes: {
      // Cache Management
      clearCache: () => Promise<void>;
      clearNotificationCache: () => void;
      diagnoseCacheState: () => void;
      autoFixCache: () => Promise<any>;
      detectCacheIssues: () => any;
      
      // System Health
      healthCheck: () => Promise<any>;
      healthReport: () => Promise<void>;
      silentInit: () => Promise<void>;

      // Session Recovery
      recoverSession: () => Promise<any>;
      diagnoseSession: () => void;

      // Authentication Audit
      authAudit: () => Promise<void>;
      authQuickCheck: () => Promise<boolean>;
      ensureAdminAccount: () => Promise<boolean>;

      // System Info
      version: string;
      systemInfo: () => void;

      // Utilities
      help: () => void;
    };
  }
}

/**
 * Inicializa comandos de debug no console
 */
export const initDebugConsole = (): void => {
  // Criar namespace global
  window.fixFogoes = {
    // Cache Management
    clearCache: async () => {
      console.log('🧹 [Debug] Limpando cache completo...');
      await clearAllCache();
      console.log('✅ [Debug] Cache limpo! Recarregue a página.');
    },
    
    clearNotificationCache: () => {
      console.log('🔔 [Debug] Limpando cache de notificações...');
      clearNotificationCache();
      console.log('✅ [Debug] Cache de notificações limpo!');
    },
    
    diagnoseCacheState: () => {
      console.log('🔍 [Debug] Executando diagnóstico de cache...');
      diagnoseCacheState();
    },
    
    autoFixCache: async () => {
      console.log('🔧 [Debug] Executando correção automática...');
      const result = await autoFixCacheIssues();
      console.log('✅ [Debug] Correção concluída:', result);
      return result;
    },
    
    detectCacheIssues: () => {
      console.log('🔍 [Debug] Detectando problemas de cache...');
      const result = detectCacheIssues();
      console.log('📊 [Debug] Resultado:', result);
      return result;
    },
    
    // System Health
    healthCheck: async () => {
      console.log('🏥 [Debug] Executando verificação de saúde...');
      const result = await runSystemHealthCheck();
      console.log('📊 [Debug] Resultado da verificação:', result);
      return result;
    },
    
    healthReport: async () => {
      console.log('📋 [Debug] Gerando relatório completo de saúde...');
      await forceHealthCheckWithReport();
    },
    
    silentInit: async () => {
      console.log('🔄 [Debug] Executando inicialização silenciosa...');
      await silentSystemInit();
      console.log('✅ [Debug] Inicialização silenciosa concluída!');
    },

    // Session Recovery
    recoverSession: async () => {
      console.log('🔄 [Debug] Tentando recuperar sessão do Supabase...');
      const result = await recoverSupabaseSession();
      console.log('📊 [Debug] Resultado da recuperação:', result);
      if (result.success) {
        console.log('✅ [Debug] Sessão recuperada com sucesso!');
        console.log('👤 [Debug] Usuário:', result.user);
      } else {
        console.log('❌ [Debug] Falha na recuperação da sessão');
      }
      return result;
    },

    diagnoseSession: () => {
      console.log('🔍 [Debug] Executando diagnóstico de sessão...');
      diagnoseSession();
    },

    // Authentication Audit
    authAudit: async () => {
      console.log('🔍 [Debug] Executando auditoria completa de autenticação...');
      await runAuthAudit.execute();
    },

    authQuickCheck: async () => {
      console.log('⚡ [Debug] Verificação rápida de autenticação...');
      return await runAuthAudit.quickCheck();
    },

    ensureAdminAccount: async () => {
      console.log('🔧 [Debug] Verificando/criando conta admin...');
      return await adminAccountSetup.ensureAdminAccount();
    },

    // System Info
    version: '3.1.0',
    
    systemInfo: () => {
      console.log('📊 [Debug] === INFORMAÇÕES DO SISTEMA ===');
      console.log(`Versão: Fix Fogões v${window.fixFogoes.version}`);
      console.log(`Navegador: ${navigator.userAgent}`);
      console.log(`URL: ${window.location.href}`);
      console.log(`LocalStorage: ${Object.keys(localStorage).length} chaves`);
      console.log(`SessionStorage: ${Object.keys(sessionStorage).length} chaves`);
      
      // Calcular tamanho do localStorage
      let totalSize = 0;
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) totalSize += value.length;
      });
      console.log(`Tamanho do LocalStorage: ${Math.round(totalSize / 1024)}KB`);
      
      // Verificar conexão
      console.log(`Online: ${navigator.onLine ? '✅' : '❌'}`);
      
      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log(`Service Workers: ${registrations.length} registrado(s)`);
        });
      }
      
      console.log('📊 [Debug] === FIM DAS INFORMAÇÕES ===');
    },
    
    // Help
    help: () => {
      console.log('🆘 [Debug] === COMANDOS DISPONÍVEIS ===');
      console.log('');
      console.log('📦 CACHE:');
      console.log('  fixFogoes.clearCache()           - Limpar todo o cache');
      console.log('  fixFogoes.clearNotificationCache() - Limpar cache de notificações');
      console.log('  fixFogoes.diagnoseCacheState()   - Diagnóstico detalhado do cache');
      console.log('  fixFogoes.autoFixCache()         - Correção automática de problemas');
      console.log('  fixFogoes.detectCacheIssues()    - Detectar problemas de cache');
      console.log('');
      console.log('🏥 SAÚDE DO SISTEMA:');
      console.log('  fixFogoes.healthCheck()          - Verificação de saúde');
      console.log('  fixFogoes.healthReport()         - Relatório completo de saúde');
      console.log('  fixFogoes.silentInit()           - Inicialização silenciosa');
      console.log('');
      console.log('🔐 RECUPERAÇÃO DE SESSÃO:');
      console.log('  fixFogoes.recoverSession()       - Recuperar sessão do Supabase');
      console.log('  fixFogoes.diagnoseSession()      - Diagnóstico de sessão');
      console.log('');
      console.log('🔍 AUDITORIA DE AUTENTICAÇÃO:');
      console.log('  fixFogoes.authAudit()            - Auditoria completa de autenticação');
      console.log('  fixFogoes.authQuickCheck()       - Verificação rápida de autenticação');
      console.log('  fixFogoes.ensureAdminAccount()   - Verificar/criar conta admin');
      console.log('');
      console.log('📊 INFORMAÇÕES:');
      console.log('  fixFogoes.systemInfo()           - Informações do sistema');
      console.log('  fixFogoes.version                - Versão atual');
      console.log('');
      console.log('🆘 AJUDA:');
      console.log('  fixFogoes.help()                 - Mostrar esta ajuda');
      console.log('');
      console.log('💡 DICA: Use essas funções para diagnosticar e corrigir problemas!');
      console.log('🆘 [Debug] === FIM DA AJUDA ===');
    }
  };

  // Mensagem de boas-vindas
  console.log('🚀 [Debug] Fix Fogões Debug Console inicializado!');
  console.log('💡 [Debug] Digite fixFogoes.help() para ver comandos disponíveis');
  
  // Verificação inicial silenciosa
  setTimeout(() => {
    const issues = detectCacheIssues();
    if (issues.hasIssues) {
      console.warn(`⚠️ [Debug] ${issues.issues.length} problema(s) de cache detectado(s)`);
      console.log('💡 [Debug] Execute fixFogoes.autoFixCache() para corrigir automaticamente');
    } else {
      console.log('✅ [Debug] Sistema está saudável!');
    }
  }, 2000);
};

/**
 * Adiciona listeners para eventos de erro e debug
 */
export const initErrorHandling = (): void => {
  // Capturar erros não tratados
  window.addEventListener('error', (event) => {
    console.error('🚨 [Debug] Erro não tratado:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Se for erro relacionado a cache, sugerir correção
    if (event.message?.includes('localStorage') || 
        event.message?.includes('cache') ||
        event.message?.includes('storage')) {
      console.log('💡 [Debug] Erro relacionado a cache detectado!');
      console.log('💡 [Debug] Execute fixFogoes.autoFixCache() para tentar corrigir');
    }
  });

  // Capturar promises rejeitadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 [Debug] Promise rejeitada:', event.reason);
    
    // Se for erro relacionado a cache, sugerir correção
    if (event.reason?.message?.includes('localStorage') || 
        event.reason?.message?.includes('cache') ||
        event.reason?.message?.includes('storage')) {
      console.log('💡 [Debug] Erro relacionado a cache detectado!');
      console.log('💡 [Debug] Execute fixFogoes.autoFixCache() para tentar corrigir');
    }
  });

  console.log('🛡️ [Debug] Error handling inicializado');
};

/**
 * Inicializa todo o sistema de debug
 */
export const initDebugSystem = (): void => {
  initDebugConsole();
  initErrorHandling();
  
  console.log('🔧 [Debug] Sistema de debug totalmente inicializado!');
};
