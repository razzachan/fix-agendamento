import { ConversionExportData } from '@/types';
import {
  googleAdsConfig,
  conversionActionIds,
  trackingConfig,
  validateGoogleAdsConfig,
  getConfigurationStatus,
  serviceTypeToConversionMap
} from '@/config/googleAds';

/**
 * Serviço para integração automática com Google Ads API
 * Permite envio automático de conversões sem upload manual
 */
export class GoogleAdsApiService {
  private static readonly API_VERSION = googleAdsConfig.apiVersion;
  private static readonly BASE_URL = googleAdsConfig.baseUrl;

  /**
   * Obter configurações do Google Ads
   */
  private static getConfig() {
    return googleAdsConfig;
  }

  /**
   * Verificar se a configuração está válida
   */
  static isConfigured(): boolean {
    const status = getConfigurationStatus();
    return status.canTestConnection;
  }

  /**
   * Obter token de acesso usando refresh token
   */
  private static async getAccessToken(): Promise<string> {
    const config = this.getConfig();

    if (!config.clientId || !config.clientSecret || !config.refreshToken) {
      throw new Error('Configurações OAuth incompletas. Verifique CLIENT_ID, CLIENT_SECRET e REFRESH_TOKEN.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro ao obter access token: ${errorData}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('Access token não retornado pela API OAuth');
    }

    return data.access_token;
  }

  /**
   * Enviar conversões automaticamente para Google Ads
   */
  static async uploadConversions(conversions: ConversionExportData[]): Promise<boolean> {
    try {
      // Verificar se está configurado
      if (!this.isConfigured()) {
        console.warn('⚠️ Google Ads API não está configurado ou Developer Token pendente');
        return false;
      }

      // No browser, simular sucesso para demonstração se não estiver em produção
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        console.log('🎯 [DEV] Simulando envio de conversões para Google Ads:', conversions.length);
        return true;
      }

      const config = this.getConfig();

      if (!config.developerToken || config.developerToken === 'PENDING_APPROVAL') {
        console.warn('⚠️ Developer Token ainda não foi aprovado pelo Google');
        return false;
      }

      const accessToken = await this.getAccessToken();

      // Agrupar conversões por tipo
      const conversionsByType = this.groupConversionsByType(conversions);

      let allSuccess = true;
      let totalSent = 0;

      // Enviar cada grupo de conversões
      for (const [conversionName, conversionList] of Object.entries(conversionsByType)) {
        const success = await this.uploadConversionGroup(
          config.customerId,
          accessToken,
          conversionName,
          conversionList
        );

        if (success) {
          totalSent += conversionList.length;
        } else {
          allSuccess = false;
          console.error(`❌ Falha ao enviar conversões do tipo: ${conversionName}`);
        }
      }

      if (allSuccess) {
        console.log(`✅ ${totalSent} conversões enviadas com sucesso para Google Ads`);
      }

      return allSuccess;
    } catch (error) {
      console.error('❌ Erro ao enviar conversões para Google Ads:', error);
      return false;
    }
  }

  /**
   * Agrupar conversões por tipo
   */
  private static groupConversionsByType(conversions: ConversionExportData[]): Record<string, ConversionExportData[]> {
    return conversions.reduce((groups, conversion) => {
      const type = conversion.conversionName;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(conversion);
      return groups;
    }, {} as Record<string, ConversionExportData[]>);
  }

  /**
   * Enviar grupo de conversões para Google Ads API
   */
  private static async uploadConversionGroup(
    customerId: string,
    accessToken: string,
    conversionName: string,
    conversions: ConversionExportData[]
  ): Promise<boolean> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/customers/${customerId}/conversionUploads:uploadClickConversions`;

      const requestBody = {
        conversions: conversions.map(conv => ({
          gclid: conv.googleClickId,
          conversion_action: `customers/${customerId}/conversionActions/${this.getConversionActionId(conversionName)}`,
          conversion_date_time: this.formatDateTimeForApi(conv.conversionTime),
          conversion_value: conv.conversionValue,
          currency_code: conv.conversionCurrency,
          order_id: conv.orderId,
        })),
        partial_failure: true, // Permite sucesso parcial
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': this.getConfig().developerToken!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Erro na API do Google Ads para ${conversionName}:`, errorData);
        return false;
      }

      const result = await response.json();
      console.log(`✅ Conversões ${conversionName} enviadas com sucesso:`, result);
      return true;

    } catch (error) {
      console.error(`Erro ao enviar conversões ${conversionName}:`, error);
      return false;
    }
  }

  /**
   * Mapear nome da conversão para ID da ação de conversão
   * Estes IDs devem ser obtidos do Google Ads após criar as ações
   */
  private static getConversionActionId(conversionName: string): string {
    // Mapear nomes antigos para novos
    const nameMapping: Record<string, keyof typeof conversionActionIds> = {
      'Lead_Gerado': 'leadGenerated',
      'Agendamento': 'scheduling',
      'Servico_Concluido': 'serviceCompleted',
      'Fogao_4_Bocas_Concluido': 'stove4Completed',
      'Fogao_6_Bocas_Concluido': 'stove6Completed',
      'Cooktop_Concluido': 'cooktopCompleted',
      'Forno_Concluido': 'ovenCompleted',
    };

    const mappedName = nameMapping[conversionName];
    if (mappedName) {
      return conversionActionIds[mappedName] || '';
    }

    // Tentar mapear diretamente usando serviceTypeToConversionMap
    const directMapping = serviceTypeToConversionMap[conversionName.toLowerCase()];
    if (directMapping) {
      return conversionActionIds[directMapping] || '';
    }

    console.warn(`⚠️ Ação de conversão não encontrada para: ${conversionName}`);
    return '';
  }

  /**
   * Formatar data/hora para formato da API
   */
  private static formatDateTimeForApi(timestamp: string): string {
    // Google Ads API espera formato: "yyyy-MM-dd HH:mm:ss+|-HH:MM"
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').replace('Z', '+00:00');
  }

  /**
   * Testar conexão com Google Ads API
   */
  static async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Verificar configuração primeiro
      const configStatus = getConfigurationStatus();

      if (!configStatus.canTestConnection) {
        return {
          success: false,
          message: 'Configuração incompleta',
          details: {
            missingFields: configStatus.missingFields,
            warnings: configStatus.warnings
          }
        };
      }

      // No browser em desenvolvimento, simular teste
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        console.log('🔗 [DEV] Simulando teste de conexão com Google Ads API');
        return {
          success: true,
          message: 'Conexão simulada com sucesso (modo desenvolvimento)'
        };
      }

      const config = this.getConfig();
      const accessToken = await this.getAccessToken();

      // Testar com uma consulta simples de informações da conta
      const url = `${this.BASE_URL}/${this.API_VERSION}/customers/${config.customerId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': config.developerToken,
          'login-customer-id': config.loginCustomerId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Conexão estabelecida com sucesso',
          details: {
            customerId: config.customerId,
            accountInfo: data
          }
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          message: `Erro na API: ${response.status} ${response.statusText}`,
          details: { error: errorData }
        };
      }

    } catch (error) {
      console.error('❌ Erro ao testar conexão com Google Ads:', error);
      return {
        success: false,
        message: `Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: { error }
      };
    }
  }

  /**
   * Obter estatísticas de conversões do Google Ads
   */
  static async getConversionStats(dateRange: { startDate: string; endDate: string }) {
    try {
      const config = this.getConfig();
      const accessToken = await this.getAccessToken();

      const query = `
        SELECT 
          conversion_action.name,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion,
          metrics.conversion_rate
        FROM conversion_action 
        WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
      `;

      const url = `${this.BASE_URL}/${this.API_VERSION}/customers/${config.customerId}/googleAds:searchStream`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': config.developerToken!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

/**
 * Configuração automática de envio de conversões
 */
export class AutoConversionUpload {
  private static uploadInterval: NodeJS.Timeout | null = null;

  /**
   * Iniciar envio automático de conversões a cada X minutos
   */
  static startAutoUpload(intervalMinutes: number = 30) {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }

    this.uploadInterval = setInterval(async () => {
      await this.processAndUploadConversions();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Upload automático iniciado: a cada ${intervalMinutes} minutos`);
  }

  /**
   * Parar envio automático
   */
  static stopAutoUpload() {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
      console.log('⏹️ Upload automático parado');
    }
  }

  /**
   * Processar e enviar conversões pendentes
   */
  private static async processAndUploadConversions() {
    try {
      // Importar serviço de tracking (evitar import circular)
      const { GoogleAdsTrackingService } = await import('../googleAdsTrackingService');

      // Buscar conversões não exportadas dos últimos 7 dias
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const conversions = await GoogleAdsTrackingService.getConversionsForExport(
        startDate,
        endDate,
        true // Apenas não exportadas
      );

      if (conversions.length === 0) {
        console.log('📊 Nenhuma conversão pendente para envio automático');
        return;
      }

      // Enviar para Google Ads
      const success = await GoogleAdsApiService.uploadConversions(conversions);

      if (success) {
        // Marcar como exportadas (implementar função para obter IDs)
        console.log(`✅ ${conversions.length} conversões enviadas automaticamente`);
      } else {
        console.error('❌ Falha no envio automático de conversões');
      }

    } catch (error) {
      console.error('Erro no processamento automático:', error);
    }
  }
}
