/**
 * 🧪 SCRIPT DE TESTE PARA DRAG AND DROP
 * 
 * Testa diferentes cenários do sistema de drag and drop do calendário
 */

import { scheduledServiceService } from '@/services/scheduledService';
import { debugCalendarState, checkCalendarConsistency, fixCalendarInconsistencies } from './calendarSyncUtils';

/**
 * Testa o drag and drop com diferentes tipos de ID
 */
export async function testDragDropScenarios(): Promise<void> {
  console.group('🧪 [TEST] Testando Drag and Drop');

  try {
    // Cenário 1: ID com prefixo order-
    console.log('\n📋 Cenário 1: ID com prefixo order-');
    const orderIdWithPrefix = 'order-8b783242-6afd-4a99-9e81-6f28c4cd061a';
    const testDate1 = new Date('2025-07-26T16:00:00Z');
    
    console.log(`Testando ID: ${orderIdWithPrefix}`);
    console.log(`Nova data: ${testDate1.toISOString()}`);
    
    try {
      const result1 = await scheduledServiceService.updateServiceDateTime(orderIdWithPrefix, testDate1);
      console.log('✅ Cenário 1 passou:', result1?.id);
    } catch (error) {
      console.error('❌ Cenário 1 falhou:', error.message);
    }

    // Cenário 2: ID sem prefixo (scheduled_service direto)
    console.log('\n📋 Cenário 2: ID sem prefixo');
    const serviceId = '8415c6c4-b2fe-4225-b15d-ca191859fd27';
    const testDate2 = new Date('2025-07-26T17:00:00Z');
    
    console.log(`Testando ID: ${serviceId}`);
    console.log(`Nova data: ${testDate2.toISOString()}`);
    
    try {
      const result2 = await scheduledServiceService.updateServiceDateTime(serviceId, testDate2);
      console.log('✅ Cenário 2 passou:', result2?.id);
    } catch (error) {
      console.error('❌ Cenário 2 falhou:', error.message);
    }

    // Cenário 3: Verificar consistência após os testes
    console.log('\n📋 Cenário 3: Verificação de consistência');
    const consistency = await checkCalendarConsistency();
    console.log(`Consistência: ${consistency.consistent ? '✅ OK' : '❌ PROBLEMAS'}`);
    if (!consistency.consistent) {
      console.log('Problemas encontrados:', consistency.issues);
    }

  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Testa a função de debug
 */
export async function testDebugFunctions(): Promise<void> {
  console.group('🔍 [TEST] Testando Funções de Debug');

  try {
    // Debug da ordem específica do Giovani
    await debugCalendarState('8b783242-6afd-4a99-9e81-6f28c4cd061a');

    // Debug geral
    await debugCalendarState();

  } catch (error) {
    console.error('❌ Erro nos testes de debug:', error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Testa a correção automática de inconsistências
 */
export async function testAutoFix(): Promise<void> {
  console.group('🔧 [TEST] Testando Correção Automática');

  try {
    const result = await fixCalendarInconsistencies();
    console.log('Resultado da correção:', result);

    if (result.success) {
      console.log(`✅ Correção bem-sucedida: ${result.fixed} itens corrigidos`);
    } else {
      console.log(`❌ Correção com problemas: ${result.errors.length} erros`);
      result.errors.forEach(error => console.error('  -', error));
    }

  } catch (error) {
    console.error('❌ Erro no teste de correção:', error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Executa todos os testes
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 [TEST] Iniciando bateria completa de testes...');

  await testDebugFunctions();
  await testDragDropScenarios();
  await testAutoFix();

  console.log('🏁 [TEST] Todos os testes concluídos!');
}

// Função para ser chamada no console do navegador
(window as any).testDragDrop = {
  runAll: runAllTests,
  scenarios: testDragDropScenarios,
  debug: testDebugFunctions,
  autoFix: testAutoFix
};

console.log('🧪 Testes de Drag and Drop carregados!');
console.log('Execute no console: testDragDrop.runAll()');
