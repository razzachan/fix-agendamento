// System Health Check - Detecção e correção automática de problemas
import { detectCacheIssues, autoFixCacheIssues, diagnoseCacheState } from './cacheUtils';

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  autoFixed: boolean;
  actions: string[];
  needsManualIntervention: boolean;
}

/**
 * Executa verificação completa de saúde do sistema
 */
export const runSystemHealthCheck = async (): Promise<HealthCheckResult> => {
  console.log('🏥 [SystemHealth] Iniciando verificação de saúde do sistema...');
  
  try {
    // 1. Verificar problemas de cache
    const cacheCheck = detectCacheIssues();
    
    let autoFixed = false;
    let actions: string[] = [];
    let needsManualIntervention = false;

    if (cacheCheck.hasIssues) {
      console.log(`⚠️ [SystemHealth] ${cacheCheck.issues.length} problema(s) de cache detectado(s)`);
      
      // Tentar correção automática para problemas não críticos
      const criticalIssues = cacheCheck.issues.filter(issue => 
        issue.includes('corrompido') || 
        issue.includes('erro') ||
        issue.includes('falha')
      );

      if (criticalIssues.length === 0) {
        // Apenas problemas menores - tentar correção automática
        console.log('🔧 [SystemHealth] Tentando correção automática...');
        const fixResult = await autoFixCacheIssues();
        
        if (fixResult.fixed) {
          autoFixed = true;
          actions = fixResult.actions;
          console.log(`✅ [SystemHealth] ${actions.length} problema(s) corrigido(s) automaticamente`);
        }
      } else {
        // Problemas críticos - requer intervenção manual
        needsManualIntervention = true;
        console.warn('🚨 [SystemHealth] Problemas críticos detectados - intervenção manual necessária');
      }
    }

    // 2. Verificar novamente após correções
    const finalCheck = detectCacheIssues();
    
    const result: HealthCheckResult = {
      isHealthy: !finalCheck.hasIssues,
      issues: finalCheck.issues,
      autoFixed,
      actions,
      needsManualIntervention
    };

    if (result.isHealthy) {
      console.log('✅ [SystemHealth] Sistema está saudável');
    } else {
      console.warn(`⚠️ [SystemHealth] ${result.issues.length} problema(s) ainda presente(s)`);
    }

    return result;
    
  } catch (error) {
    console.error('❌ [SystemHealth] Erro na verificação de saúde:', error);
    return {
      isHealthy: false,
      issues: ['Erro na verificação de saúde do sistema'],
      autoFixed: false,
      actions: [],
      needsManualIntervention: true
    };
  }
};

/**
 * Inicialização silenciosa do sistema - executa correções automáticas sem alertas
 */
export const silentSystemInit = async (): Promise<void> => {
  try {
    console.log('🔄 [SystemHealth] Inicialização silenciosa do sistema...');
    
    // Verificar e corrigir problemas menores automaticamente
    const cacheCheck = detectCacheIssues();
    
    if (cacheCheck.hasIssues) {
      const minorIssues = cacheCheck.issues.filter(issue => 
        !issue.includes('corrompido') && 
        !issue.includes('erro') &&
        !issue.includes('falha') &&
        (issue.includes('cache') || issue.includes('versão') || issue.includes('duplicada'))
      );

      if (minorIssues.length > 0) {
        console.log(`🔧 [SystemHealth] Corrigindo ${minorIssues.length} problema(s) menor(es)...`);
        await autoFixCacheIssues();
      }
    }

    // Atualizar timestamp da última verificação
    localStorage.setItem('last_health_check', new Date().toISOString());
    
    console.log('✅ [SystemHealth] Inicialização silenciosa concluída');
    
  } catch (error) {
    console.error('❌ [SystemHealth] Erro na inicialização silenciosa:', error);
  }
};

/**
 * Verifica se é necessário executar verificação de saúde
 */
export const shouldRunHealthCheck = (): boolean => {
  try {
    const lastCheck = localStorage.getItem('last_health_check');
    
    if (!lastCheck) {
      return true; // Nunca executou
    }

    const lastCheckDate = new Date(lastCheck);
    const now = new Date();
    const hoursSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);

    // Executar a cada 6 horas
    return hoursSinceLastCheck >= 6;
    
  } catch (error) {
    console.error('❌ [SystemHealth] Erro ao verificar necessidade de health check:', error);
    return true; // Em caso de erro, executar verificação
  }
};

/**
 * Monitora a saúde do sistema em tempo real
 */
export const startSystemHealthMonitoring = (): (() => void) => {
  console.log('👁️ [SystemHealth] Iniciando monitoramento de saúde do sistema...');
  
  // Verificação inicial
  setTimeout(() => {
    if (shouldRunHealthCheck()) {
      silentSystemInit();
    }
  }, 3000); // Aguardar 3s para o sistema carregar

  // Verificação periódica (a cada 30 minutos)
  const interval = setInterval(() => {
    if (shouldRunHealthCheck()) {
      silentSystemInit();
    }
  }, 30 * 60 * 1000); // 30 minutos

  // Monitorar eventos de erro do sistema
  const errorHandler = (event: ErrorEvent) => {
    console.error('🚨 [SystemHealth] Erro detectado:', event.error);
    
    // Se for erro relacionado a cache/localStorage, executar correção
    if (event.error?.message?.includes('localStorage') || 
        event.error?.message?.includes('cache') ||
        event.error?.message?.includes('storage')) {
      console.log('🔧 [SystemHealth] Erro de cache detectado - executando correção...');
      silentSystemInit();
    }
  };

  window.addEventListener('error', errorHandler);

  // Retornar função de cleanup
  return () => {
    clearInterval(interval);
    window.removeEventListener('error', errorHandler);
    console.log('🛑 [SystemHealth] Monitoramento de saúde interrompido');
  };
};

/**
 * Força verificação completa e exibe relatório detalhado
 */
export const forceHealthCheckWithReport = async (): Promise<void> => {
  console.log('📋 [SystemHealth] === RELATÓRIO COMPLETO DE SAÚDE ===');
  
  try {
    // Diagnóstico detalhado
    diagnoseCacheState();
    
    // Verificação completa
    const result = await runSystemHealthCheck();
    
    console.log('📊 [SystemHealth] === RESULTADO DA VERIFICAÇÃO ===');
    console.log(`Status: ${result.isHealthy ? '✅ SAUDÁVEL' : '⚠️ PROBLEMAS DETECTADOS'}`);
    console.log(`Problemas encontrados: ${result.issues.length}`);
    console.log(`Correção automática: ${result.autoFixed ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Ações executadas: ${result.actions.length}`);
    console.log(`Intervenção manual necessária: ${result.needsManualIntervention ? '⚠️ SIM' : '✅ NÃO'}`);
    
    if (result.issues.length > 0) {
      console.log('📝 [SystemHealth] Problemas detectados:');
      result.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (result.actions.length > 0) {
      console.log('🔧 [SystemHealth] Ações executadas:');
      result.actions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }
    
    console.log('📋 [SystemHealth] === FIM DO RELATÓRIO ===');
    
  } catch (error) {
    console.error('❌ [SystemHealth] Erro no relatório de saúde:', error);
  }
};
