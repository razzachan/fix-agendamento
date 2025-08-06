import { 
  googleAdsConfig, 
  getConfigurationStatus, 
  validateGoogleAdsConfig,
  configurationUrls 
} from '@/config/googleAds';
import { GoogleAdsApiService } from './googleAdsApiService';

/**
 * Serviço para gerenciar configuração e diagnóstico do Google Ads API
 */
export class GoogleAdsConfigService {
  
  /**
   * Obter status completo da configuração
   */
  static getFullStatus() {
    const validation = validateGoogleAdsConfig();
    const status = getConfigurationStatus();
    
    return {
      ...status,
      config: {
        customerId: googleAdsConfig.customerId,
        loginCustomerId: googleAdsConfig.loginCustomerId,
        apiVersion: googleAdsConfig.apiVersion,
        hasClientId: !!googleAdsConfig.clientId,
        hasClientSecret: !!googleAdsConfig.clientSecret,
        hasRefreshToken: !!googleAdsConfig.refreshToken,
        hasDeveloperToken: !!googleAdsConfig.developerToken && googleAdsConfig.developerToken !== 'PENDING_APPROVAL',
        developerTokenStatus: googleAdsConfig.developerToken === 'PENDING_APPROVAL' ? 'pending' : 
                             googleAdsConfig.developerToken ? 'configured' : 'missing',
      },
      urls: configurationUrls,
      validation,
    };
  }

  /**
   * Executar diagnóstico completo
   */
  static async runDiagnostics() {
    console.log('🔍 Iniciando diagnóstico do Google Ads API...');
    
    const status = this.getFullStatus();
    const results = {
      timestamp: new Date().toISOString(),
      status,
      tests: {
        configuration: this.testConfiguration(),
        connection: null as any,
        oauth: null as any,
      }
    };

    // Teste de configuração
    console.log('📋 Testando configuração...');
    results.tests.configuration = this.testConfiguration();

    // Teste de conexão (se configurado)
    if (status.canTestConnection) {
      console.log('🔗 Testando conexão...');
      results.tests.connection = await GoogleAdsApiService.testConnection();
    } else {
      results.tests.connection = {
        success: false,
        message: 'Não é possível testar conexão - configuração incompleta',
        skipped: true
      };
    }

    // Teste OAuth (se possível)
    if (status.config.hasClientId && status.config.hasClientSecret && status.config.hasRefreshToken) {
      console.log('🔐 Testando OAuth...');
      results.tests.oauth = await this.testOAuth();
    } else {
      results.tests.oauth = {
        success: false,
        message: 'Não é possível testar OAuth - credenciais incompletas',
        skipped: true
      };
    }

    this.printDiagnosticResults(results);
    return results;
  }

  /**
   * Testar configuração básica
   */
  private static testConfiguration() {
    const validation = validateGoogleAdsConfig();
    
    return {
      success: validation.isValid,
      message: validation.isValid ? 'Configuração válida' : 'Configuração incompleta',
      details: {
        missingFields: validation.missingFields,
        warnings: validation.warnings,
        hasAllRequiredFields: validation.missingFields.length === 0,
      }
    };
  }

  /**
   * Testar OAuth independentemente
   */
  private static async testOAuth() {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleAdsConfig.clientId,
          client_secret: googleAdsConfig.clientSecret,
          refresh_token: googleAdsConfig.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'OAuth funcionando corretamente',
          details: {
            hasAccessToken: !!data.access_token,
            tokenType: data.token_type,
            expiresIn: data.expires_in,
          }
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          message: 'Erro no OAuth',
          details: { error: errorData, status: response.status }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao testar OAuth',
        details: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      };
    }
  }

  /**
   * Imprimir resultados do diagnóstico
   */
  private static printDiagnosticResults(results: any) {
    console.log('\n📊 RESULTADOS DO DIAGNÓSTICO GOOGLE ADS API');
    console.log('='.repeat(50));
    
    // Status geral
    console.log(`\n🎯 Status Geral:`);
    console.log(`   Configurado: ${results.status.isValid ? '✅' : '❌'}`);
    console.log(`   Pode testar conexão: ${results.status.canTestConnection ? '✅' : '❌'}`);
    console.log(`   Pode enviar conversões: ${results.status.canUploadConversions ? '✅' : '❌'}`);
    console.log(`   Tracking habilitado: ${results.status.trackingEnabled ? '✅' : '❌'}`);

    // Configuração
    console.log(`\n📋 Configuração:`);
    console.log(`   Customer ID: ${results.status.config.customerId}`);
    console.log(`   Client ID: ${results.status.config.hasClientId ? '✅' : '❌'}`);
    console.log(`   Client Secret: ${results.status.config.hasClientSecret ? '✅' : '❌'}`);
    console.log(`   Refresh Token: ${results.status.config.hasRefreshToken ? '✅' : '❌'}`);
    console.log(`   Developer Token: ${results.status.config.developerTokenStatus}`);

    // Testes
    console.log(`\n🧪 Testes:`);
    console.log(`   Configuração: ${results.tests.configuration.success ? '✅' : '❌'} ${results.tests.configuration.message}`);
    console.log(`   OAuth: ${results.tests.oauth.skipped ? '⏭️' : results.tests.oauth.success ? '✅' : '❌'} ${results.tests.oauth.message}`);
    console.log(`   Conexão: ${results.tests.connection.skipped ? '⏭️' : results.tests.connection.success ? '✅' : '❌'} ${results.tests.connection.message}`);

    // Avisos
    if (results.status.warnings.length > 0) {
      console.log(`\n⚠️ Avisos:`);
      results.status.warnings.forEach((warning: string) => {
        console.log(`   - ${warning}`);
      });
    }

    // Próximos passos
    console.log(`\n🚀 Próximos Passos:`);
    if (results.status.missingFields.length > 0) {
      console.log(`   1. Configure as variáveis: ${results.status.missingFields.join(', ')}`);
    }
    if (results.status.config.developerTokenStatus === 'pending') {
      console.log(`   2. Aguarde aprovação do Developer Token`);
    }
    if (!results.status.canUploadConversions) {
      console.log(`   3. Configure IDs das ações de conversão no Google Ads`);
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Obter instruções de configuração
   */
  static getSetupInstructions() {
    const status = this.getFullStatus();
    const instructions = [];

    if (!status.config.hasClientId || !status.config.hasClientSecret) {
      instructions.push({
        step: 1,
        title: 'Configurar OAuth no Google Cloud Console',
        description: 'Crie credenciais OAuth 2.0 e obtenha Client ID e Client Secret',
        url: configurationUrls.googleCloudConsole,
        variables: ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET']
      });
    }

    if (!status.config.hasRefreshToken) {
      instructions.push({
        step: 2,
        title: 'Obter Refresh Token',
        description: 'Use o OAuth Playground para gerar um Refresh Token',
        url: configurationUrls.oauthPlayground,
        variables: ['GOOGLE_ADS_REFRESH_TOKEN']
      });
    }

    if (status.config.developerTokenStatus !== 'configured') {
      instructions.push({
        step: 3,
        title: 'Solicitar Developer Token',
        description: 'Acesse a Central de API e solicite aprovação do Developer Token',
        url: configurationUrls.googleAdsApiCenter,
        variables: ['GOOGLE_ADS_DEVELOPER_TOKEN']
      });
    }

    if (!status.canUploadConversions) {
      instructions.push({
        step: 4,
        title: 'Configurar Ações de Conversão',
        description: 'Crie ações de conversão no Google Ads e configure os IDs',
        url: configurationUrls.googleAdsConversions,
        variables: ['GOOGLE_ADS_*_CONVERSION_ID']
      });
    }

    return {
      status,
      instructions,
      isComplete: instructions.length === 0,
    };
  }
}
