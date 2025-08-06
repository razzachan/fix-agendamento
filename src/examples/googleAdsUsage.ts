/**
 * Exemplos de uso da integração Google Ads API
 * Este arquivo mostra como usar os serviços em diferentes cenários
 */

import { GoogleAdsApiService } from '@/services/googleAds/googleAdsApiService';
import { GoogleAdsConfigService } from '@/services/googleAds/googleAdsConfigService';
import { ConversionExportData } from '@/types';

/**
 * Exemplo 1: Verificar status da configuração
 */
export async function checkGoogleAdsStatus() {
  console.log('🔍 Verificando status do Google Ads API...');
  
  const status = GoogleAdsConfigService.getFullStatus();
  
  console.log('Status:', {
    configured: status.isValid,
    canTest: status.canTestConnection,
    canUpload: status.canUploadConversions,
    warnings: status.warnings
  });
  
  return status;
}

/**
 * Exemplo 2: Executar diagnósticos completos
 */
export async function runFullDiagnostics() {
  console.log('🧪 Executando diagnósticos completos...');
  
  try {
    const results = await GoogleAdsConfigService.runDiagnostics();
    
    console.log('Resultados:', {
      timestamp: results.timestamp,
      configValid: results.tests.configuration.success,
      oauthWorking: results.tests.oauth.success,
      connectionOk: results.tests.connection.success
    });
    
    return results;
  } catch (error) {
    console.error('Erro nos diagnósticos:', error);
    return null;
  }
}

/**
 * Exemplo 3: Testar conexão com Google Ads
 */
export async function testGoogleAdsConnection() {
  console.log('🔗 Testando conexão com Google Ads...');
  
  try {
    const result = await GoogleAdsApiService.testConnection();
    
    if (result.success) {
      console.log('✅ Conexão estabelecida com sucesso!');
      console.log('Detalhes:', result.details);
    } else {
      console.log('❌ Falha na conexão:', result.message);
      console.log('Detalhes:', result.details);
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return { success: false, message: 'Erro inesperado', details: { error } };
  }
}

/**
 * Exemplo 4: Enviar conversões para Google Ads
 */
export async function uploadSampleConversions() {
  console.log('🎯 Enviando conversões de exemplo...');
  
  // Dados de exemplo de conversões
  const sampleConversions: ConversionExportData[] = [
    {
      orderId: 'OS-2025-001',
      conversionName: 'Lead_Gerado',
      conversionTime: new Date().toISOString(),
      conversionValue: 50,
      conversionCurrency: 'BRL',
      googleClickId: 'exemplo_gclid_123',
      customerInfo: {
        name: 'João Silva',
        phone: '11999999999',
        email: 'joao@email.com'
      }
    },
    {
      orderId: 'OS-2025-002',
      conversionName: 'Agendamento',
      conversionTime: new Date().toISOString(),
      conversionValue: 100,
      conversionCurrency: 'BRL',
      googleClickId: 'exemplo_gclid_456',
      customerInfo: {
        name: 'Maria Santos',
        phone: '11888888888',
        email: 'maria@email.com'
      }
    }
  ];
  
  try {
    const success = await GoogleAdsApiService.uploadConversions(sampleConversions);
    
    if (success) {
      console.log('✅ Conversões enviadas com sucesso!');
    } else {
      console.log('❌ Falha no envio de conversões');
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao enviar conversões:', error);
    return false;
  }
}

/**
 * Exemplo 5: Monitorar conversões em tempo real
 */
export function startConversionMonitoring() {
  console.log('📊 Iniciando monitoramento de conversões...');
  
  // Simular monitoramento a cada 5 minutos
  const interval = setInterval(async () => {
    try {
      // Aqui você buscaria conversões pendentes do seu banco de dados
      console.log('🔄 Verificando conversões pendentes...');
      
      // Exemplo: buscar do Supabase
      // const pendingConversions = await supabase
      //   .from('google_ads_conversions')
      //   .select('*')
      //   .eq('exported', false);
      
      // Se houver conversões pendentes, enviar
      // if (pendingConversions.data?.length > 0) {
      //   await GoogleAdsApiService.uploadConversions(pendingConversions.data);
      // }
      
    } catch (error) {
      console.error('Erro no monitoramento:', error);
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  // Retornar função para parar o monitoramento
  return () => {
    clearInterval(interval);
    console.log('⏹️ Monitoramento parado');
  };
}

/**
 * Exemplo 6: Integração com eventos do sistema
 */
export class GoogleAdsIntegration {
  
  /**
   * Registrar lead gerado
   */
  static async trackLeadGenerated(customerData: any, gclid?: string) {
    if (!gclid) {
      console.log('⚠️ GCLID não disponível - conversão não será rastreada');
      return false;
    }
    
    const conversion: ConversionExportData = {
      orderId: `LEAD-${Date.now()}`,
      conversionName: 'Lead_Gerado',
      conversionTime: new Date().toISOString(),
      conversionValue: 50, // Valor estimado do lead
      conversionCurrency: 'BRL',
      googleClickId: gclid,
      customerInfo: customerData
    };
    
    return await GoogleAdsApiService.uploadConversions([conversion]);
  }
  
  /**
   * Registrar agendamento realizado
   */
  static async trackSchedulingCompleted(orderData: any, gclid?: string) {
    if (!gclid) return false;
    
    const conversion: ConversionExportData = {
      orderId: orderData.id,
      conversionName: 'Agendamento',
      conversionTime: new Date().toISOString(),
      conversionValue: 100,
      conversionCurrency: 'BRL',
      googleClickId: gclid,
      customerInfo: orderData.customer
    };
    
    return await GoogleAdsApiService.uploadConversions([conversion]);
  }
  
  /**
   * Registrar serviço concluído
   */
  static async trackServiceCompleted(orderData: any, gclid?: string) {
    if (!gclid) return false;
    
    // Determinar tipo de conversão baseado no equipamento
    let conversionName = 'Servico_Concluido';
    if (orderData.equipment?.includes('fogão 4')) {
      conversionName = 'Fogao_4_Bocas_Concluido';
    } else if (orderData.equipment?.includes('fogão 6')) {
      conversionName = 'Fogao_6_Bocas_Concluido';
    } else if (orderData.equipment?.includes('cooktop')) {
      conversionName = 'Cooktop_Concluido';
    } else if (orderData.equipment?.includes('forno')) {
      conversionName = 'Forno_Concluido';
    }
    
    const conversion: ConversionExportData = {
      orderId: orderData.id,
      conversionName,
      conversionTime: new Date().toISOString(),
      conversionValue: orderData.totalValue || 200,
      conversionCurrency: 'BRL',
      googleClickId: gclid,
      customerInfo: orderData.customer
    };
    
    return await GoogleAdsApiService.uploadConversions([conversion]);
  }
}

/**
 * Exemplo 7: Hook React para usar no frontend
 */
export function useGoogleAdsStatus() {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function loadStatus() {
      try {
        const currentStatus = GoogleAdsConfigService.getFullStatus();
        setStatus(currentStatus);
      } catch (error) {
        console.error('Erro ao carregar status:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStatus();
  }, []);
  
  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await GoogleAdsConfigService.runDiagnostics();
      return results;
    } finally {
      setLoading(false);
    }
  };
  
  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await GoogleAdsApiService.testConnection();
      return result;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    status,
    loading,
    runDiagnostics,
    testConnection
  };
}

/**
 * Exemplo de uso completo
 */
export async function demonstrateGoogleAdsIntegration() {
  console.log('🚀 DEMONSTRAÇÃO COMPLETA DA INTEGRAÇÃO GOOGLE ADS');
  console.log('='.repeat(60));
  
  // 1. Verificar status
  await checkGoogleAdsStatus();
  
  // 2. Executar diagnósticos
  await runFullDiagnostics();
  
  // 3. Testar conexão
  await testGoogleAdsConnection();
  
  // 4. Enviar conversões de exemplo
  await uploadSampleConversions();
  
  // 5. Iniciar monitoramento
  const stopMonitoring = startConversionMonitoring();
  
  // Parar monitoramento após 1 minuto (para demonstração)
  setTimeout(() => {
    stopMonitoring();
  }, 60000);
  
  console.log('✅ Demonstração concluída!');
}
