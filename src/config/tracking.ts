/**
 * Configurações de tracking e conversões do Google Ads
 * Usa variáveis de ambiente para configuração
 */

export const trackingConfig = {
  googleAds: {
    // Configurações básicas
    customerId: import.meta.env.VITE_GOOGLE_ADS_CUSTOMER_ID || '2906892366',
    trackingEnabled: import.meta.env.VITE_GOOGLE_ADS_TRACKING_ENABLED === 'true',
    
    // Configurações de conversão
    conversionTracking: {
      enabled: true,
      currency: 'BRL',
      
      // IDs das ações de conversão (configurar no Google Ads)
      conversions: {
        lead: import.meta.env.VITE_GOOGLE_ADS_LEAD_CONVERSION_ID || '',
        scheduling: import.meta.env.VITE_GOOGLE_ADS_SCHEDULING_CONVERSION_ID || '',
        completion: import.meta.env.VITE_GOOGLE_ADS_COMPLETION_CONVERSION_ID || '',
        
        // Conversões por tipo de equipamento
        stove4: import.meta.env.VITE_GOOGLE_ADS_STOVE_4_CONVERSION_ID || '',
        stove6: import.meta.env.VITE_GOOGLE_ADS_STOVE_6_CONVERSION_ID || '',
        cooktop: import.meta.env.VITE_GOOGLE_ADS_COOKTOP_CONVERSION_ID || '',
        oven: import.meta.env.VITE_GOOGLE_ADS_OVEN_CONVERSION_ID || ''
      }
    },
    
    // Configurações de valor de conversão
    conversionValues: {
      // Usar valores do campo final_cost da tabela service_orders
      useRealValues: true,
      
      // Valores padrão caso não haja final_cost
      defaultValues: {
        lead: 50,
        scheduling: 100,
        completion: 300,
        stove4: 250,
        stove6: 350,
        cooktop: 400,
        oven: 450
      },
      
      // Valores mínimos por tipo de serviço
      minimumValues: {
        'coleta_diagnostico': 150,
        'em_domicilio': 180,
        'coleta_conserto': 300
      }
    }
  },
  
  // Configurações de debug
  debug: {
    enabled: import.meta.env.DEV,
    logConversions: true,
    logValues: true
  }
};

/**
 * Função para obter valor de conversão baseado no final_cost
 */
export function getConversionValue(
  finalCost: number | string | null,
  serviceType: string,
  conversionType: string
): number {
  const config = trackingConfig.googleAds.conversionValues;
  
  // Tentar usar valor real do final_cost
  if (config.useRealValues && finalCost) {
    const value = typeof finalCost === 'string' ? parseFloat(finalCost) : finalCost;
    if (value > 0) {
      return value;
    }
  }
  
  // Usar valor mínimo por tipo de serviço
  const minimumValue = config.minimumValues[serviceType as keyof typeof config.minimumValues];
  if (minimumValue) {
    return minimumValue;
  }
  
  // Usar valor padrão por tipo de conversão
  const defaultValue = config.defaultValues[conversionType as keyof typeof config.defaultValues];
  if (defaultValue) {
    return defaultValue;
  }
  
  // Valor padrão geral
  return 200;
}

/**
 * Função para log de debug de conversões
 */
export function logConversion(data: {
  type: string;
  value: number;
  orderId?: string;
  serviceType?: string;
  gclid?: string;
}) {
  if (!trackingConfig.debug.enabled || !trackingConfig.debug.logConversions) {
    return;
  }
  
  console.log(`
🎯 [GoogleAds] CONVERSÃO REGISTRADA:
📊 Tipo: ${data.type}
💰 Valor: R$ ${data.value.toFixed(2)}
📋 Ordem: ${data.orderId || 'N/A'}
🔧 Serviço: ${data.serviceType || 'N/A'}
🎯 GCLID: ${data.gclid || 'N/A'}
⏰ Timestamp: ${new Date().toISOString()}
${'─'.repeat(50)}
  `);
}

/**
 * Função para verificar se tracking está habilitado
 */
export function isTrackingEnabled(): boolean {
  return trackingConfig.googleAds.trackingEnabled && 
         trackingConfig.googleAds.conversionTracking.enabled;
}

/**
 * Função para obter ID de conversão por tipo
 */
export function getConversionId(type: string): string {
  const conversions = trackingConfig.googleAds.conversionTracking.conversions;
  return conversions[type as keyof typeof conversions] || '';
}
