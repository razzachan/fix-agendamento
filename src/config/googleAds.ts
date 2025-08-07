/**
 * Configurações do Google Ads API
 * Centraliza todas as configurações necessárias para integração
 */

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId: string;
  apiVersion: string;
  baseUrl: string;
}

export interface ConversionActionIds {
  leadGenerated: string;
  scheduling: string;
  serviceCompleted: string;
  stove4Completed: string;
  stove6Completed: string;
  cooktopCompleted: string;
  ovenCompleted: string;
}

/**
 * Configuração principal do Google Ads API
 */
export const googleAdsConfig: GoogleAdsConfig = {
  clientId: import.meta.env.GOOGLE_ADS_CLIENT_ID || '',
  clientSecret: import.meta.env.GOOGLE_ADS_CLIENT_SECRET || '',
  refreshToken: import.meta.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  developerToken: import.meta.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'PENDING_APPROVAL',
  customerId: import.meta.env.GOOGLE_ADS_CUSTOMER_ID || '2906892366',
  loginCustomerId: import.meta.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '2906892366',
  apiVersion: 'v16',
  baseUrl: 'https://googleads.googleapis.com',
};

/**
 * IDs das ações de conversão no Google Ads
 * Estes serão preenchidos após criar as ações no Google Ads
 */
export const conversionActionIds: ConversionActionIds = {
  leadGenerated: import.meta.env.GOOGLE_ADS_LEAD_CONVERSION_ID || '',
  scheduling: import.meta.env.GOOGLE_ADS_SCHEDULING_CONVERSION_ID || '',
  serviceCompleted: import.meta.env.GOOGLE_ADS_COMPLETION_CONVERSION_ID || '',
  stove4Completed: import.meta.env.GOOGLE_ADS_STOVE_4_CONVERSION_ID || '',
  stove6Completed: import.meta.env.GOOGLE_ADS_STOVE_6_CONVERSION_ID || '',
  cooktopCompleted: import.meta.env.GOOGLE_ADS_COOKTOP_CONVERSION_ID || '',
  ovenCompleted: import.meta.env.GOOGLE_ADS_OVEN_CONVERSION_ID || '',
};

/**
 * Configurações de tracking
 */
export const trackingConfig = {
  enabled: import.meta.env.VITE_GOOGLE_ADS_TRACKING_ENABLED === 'true',
  customerId: import.meta.env.VITE_GOOGLE_ADS_CUSTOMER_ID || '2906892366',
  autoUploadInterval: 30, // minutos
  maxRetries: 3,
  retryDelay: 5000, // ms
};

/**
 * Mapeamento de tipos de serviço para ações de conversão
 */
export const serviceTypeToConversionMap: Record<string, keyof ConversionActionIds> = {
  'lead_generated': 'leadGenerated',
  'agendamento': 'scheduling',
  'servico_concluido': 'serviceCompleted',
  'fogao_4_bocas': 'stove4Completed',
  'fogao_6_bocas': 'stove6Completed',
  'cooktop': 'cooktopCompleted',
  'forno': 'ovenCompleted',
};

/**
 * Validar se as configurações estão completas
 */
export function validateGoogleAdsConfig(): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Campos obrigatórios
  if (!googleAdsConfig.clientId) missingFields.push('GOOGLE_ADS_CLIENT_ID');
  if (!googleAdsConfig.clientSecret) missingFields.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!googleAdsConfig.refreshToken) missingFields.push('GOOGLE_ADS_REFRESH_TOKEN');
  if (!googleAdsConfig.customerId) missingFields.push('GOOGLE_ADS_CUSTOMER_ID');

  // Campos que podem estar pendentes
  if (!googleAdsConfig.developerToken || googleAdsConfig.developerToken === 'PENDING_APPROVAL') {
    warnings.push('Developer Token ainda não foi aprovado pelo Google');
  }

  // Verificar IDs de conversão
  const emptyConversionIds = Object.entries(conversionActionIds)
    .filter(([_, id]) => !id)
    .map(([key, _]) => key);

  if (emptyConversionIds.length > 0) {
    warnings.push(`IDs de conversão não configurados: ${emptyConversionIds.join(', ')}`);
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Status da configuração
 */
export function getConfigurationStatus() {
  const validation = validateGoogleAdsConfig();
  
  return {
    ...validation,
    canTestConnection: validation.isValid && googleAdsConfig.developerToken !== 'PENDING_APPROVAL',
    canUploadConversions: validation.isValid && 
                         googleAdsConfig.developerToken !== 'PENDING_APPROVAL' &&
                         Object.values(conversionActionIds).some(id => id !== ''),
    trackingEnabled: trackingConfig.enabled,
  };
}

/**
 * URLs úteis para configuração
 */
export const configurationUrls = {
  googleCloudConsole: 'https://console.cloud.google.com/apis/credentials',
  oauthPlayground: 'https://developers.google.com/oauthplayground/',
  googleAdsApiCenter: `https://ads.google.com/aw/apicenter?ocid=${googleAdsConfig.customerId}`,
  googleAdsConversions: `https://ads.google.com/aw/conversions?ocid=${googleAdsConfig.customerId}`,
  documentation: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
};
