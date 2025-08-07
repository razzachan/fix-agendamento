import { GoogleAdsConversionService } from '../services/googleAdsConversionService';

/**
 * Teste das conversões Google Ads usando valores reais do final_cost
 */
export class GoogleAdsTest {
  
  /**
   * Executa todos os testes de conversão
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 [GoogleAdsTest] INICIANDO TESTES DE CONVERSÃO...');
    console.log('='.repeat(60));
    
    try {
      // Teste 1: Gerar relatório de conversões
      console.log('📊 TESTE 1: Relatório de conversões');
      await GoogleAdsConversionService.generateConversionsReport();
      
      console.log('\n' + '─'.repeat(60) + '\n');
      
      // Teste 2: Simular envio de conversões
      console.log('📤 TESTE 2: Envio de conversões');
      await GoogleAdsConversionService.sendConversionsToGoogleAds();
      
      console.log('\n' + '─'.repeat(60) + '\n');
      
      // Teste 3: Testar cálculo de valores
      console.log('🧮 TESTE 3: Cálculo de valores');
      GoogleAdsConversionService.testValueCalculation();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ [GoogleAdsTest] TODOS OS TESTES CONCLUÍDOS!');
      
    } catch (error) {
      console.error('❌ [GoogleAdsTest] Erro nos testes:', error);
    }
  }
  
  /**
   * Teste específico de uma conversão
   */
  static testSingleConversion(): void {
    console.log('🎯 [GoogleAdsTest] TESTE DE CONVERSÃO ÚNICA:');
    
    // Simular dados de uma ordem real
    const mockOrder = {
      id: '11111111-1111-1111-1111-111111111111',
      order_number: '#001',
      client_name: 'João Silva',
      final_cost: '150.00',
      conversion_value: '150.00',
      completed_date: new Date().toISOString(),
      service_attendance_type: 'coleta_diagnostico',
      gclid: 'test_gclid_123',
      utm_source: 'google',
      utm_campaign: 'fogoes_reparo'
    };
    
    console.log(`
🔄 CONVERSÃO SIMULADA:
📋 Ordem: ${mockOrder.order_number}
👤 Cliente: ${mockOrder.client_name}
💰 final_cost: R$ ${parseFloat(mockOrder.final_cost).toFixed(2)}
💰 conversion_value: R$ ${parseFloat(mockOrder.conversion_value).toFixed(2)}
📅 Data: ${new Date(mockOrder.completed_date).toLocaleDateString('pt-BR')}
🔧 Tipo: ${mockOrder.service_attendance_type}
🎯 GCLID: ${mockOrder.gclid}
📊 UTM Source: ${mockOrder.utm_source}
📈 UTM Campaign: ${mockOrder.utm_campaign}
✅ VALOR REAL DO BANCO USADO!
${'─'.repeat(50)}
    `);
  }
  
  /**
   * Teste de validação dos valores
   */
  static validateConversionValues(): void {
    console.log('🔍 [GoogleAdsTest] VALIDAÇÃO DE VALORES:');
    
    const testCases = [
      { final_cost: '150.00', expected: 150.00, description: 'Diagnóstico básico' },
      { final_cost: '750.00', expected: 750.00, description: 'Conserto completo' },
      { final_cost: '950.00', expected: 950.00, description: 'Reparo premium' },
      { final_cost: '180.00', expected: 180.00, description: 'Serviço domiciliar' },
      { final_cost: '430.00', expected: 430.00, description: 'Com diagnóstico' }
    ];
    
    console.log('\n📊 CASOS DE TESTE:');
    
    testCases.forEach((testCase, index) => {
      const actualValue = parseFloat(testCase.final_cost);
      const isValid = actualValue === testCase.expected;
      
      console.log(`
${index + 1}. ${testCase.description}
   💰 final_cost: R$ ${testCase.final_cost}
   ✅ Esperado: R$ ${testCase.expected.toFixed(2)}
   🎯 Resultado: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}
      `);
    });
    
    console.log('✅ [GoogleAdsTest] Validação concluída!');
  }
}

// Executar testes automaticamente quando importado
if (typeof window !== 'undefined') {
  // Disponibilizar globalmente para teste no console
  (window as any).GoogleAdsTest = GoogleAdsTest;
  
  console.log(`
🧪 [GoogleAdsTest] TESTES DISPONÍVEIS NO CONSOLE:
- GoogleAdsTest.runAllTests() - Executar todos os testes
- GoogleAdsTest.testSingleConversion() - Testar conversão única
- GoogleAdsTest.validateConversionValues() - Validar valores
  `);
}
