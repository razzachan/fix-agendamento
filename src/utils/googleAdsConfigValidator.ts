/**
 * Validador de configuração do Google Ads API
 * Verifica se todas as variáveis necessárias estão configuradas
 */

export interface GoogleAdsConfig {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  conversionIds: {
    lead: string;
    scheduling: string;
    completion: string;
    stove4: string;
    stove6: string;
    cooktop: string;
    oven: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: GoogleAdsConfig;
}

export class GoogleAdsConfigValidator {
  /**
   * Obtém variáveis de ambiente de forma segura (browser-compatible)
   */
  private static getEnvVar(key: string): string | undefined {
    // No browser, as variáveis de ambiente não estão disponíveis
    // Retorna undefined para simular variáveis não configuradas
    if (typeof window !== 'undefined') {
      // Estamos no browser - variáveis não disponíveis por segurança
      return undefined;
    }

    // No servidor (se houver), usar process.env
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  }

  /**
   * Valida configuração completa do Google Ads
   */
  static validateConfig(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar variáveis básicas
    const customerId = this.getEnvVar('GOOGLE_ADS_CUSTOMER_ID');
    const developerToken = this.getEnvVar('GOOGLE_ADS_DEVELOPER_TOKEN');
    const clientId = this.getEnvVar('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.getEnvVar('GOOGLE_ADS_CLIENT_SECRET');
    const refreshToken = this.getEnvVar('GOOGLE_ADS_REFRESH_TOKEN');

    // Verificar IDs de conversão
    const leadId = this.getEnvVar('GOOGLE_ADS_LEAD_CONVERSION_ID');
    const schedulingId = this.getEnvVar('GOOGLE_ADS_SCHEDULING_CONVERSION_ID');
    const completionId = this.getEnvVar('GOOGLE_ADS_COMPLETION_CONVERSION_ID');
    const stove4Id = this.getEnvVar('GOOGLE_ADS_STOVE_4_CONVERSION_ID');
    const stove6Id = this.getEnvVar('GOOGLE_ADS_STOVE_6_CONVERSION_ID');
    const cooktopId = this.getEnvVar('GOOGLE_ADS_COOKTOP_CONVERSION_ID');
    const ovenId = this.getEnvVar('GOOGLE_ADS_OVEN_CONVERSION_ID');

    // No browser, mostrar aviso sobre configuração
    if (typeof window !== 'undefined') {
      warnings.push('Configuração do Google Ads API deve ser feita no servidor');
      warnings.push('Variáveis de ambiente não são acessíveis no browser por segurança');

      // Simular validação básica
      const isValid = false; // Sempre inválido no browser

      return {
        isValid,
        errors: ['Configuração deve ser feita no servidor'],
        warnings: [
          'Para configurar o Google Ads API:',
          '1. Configure as variáveis de ambiente no servidor',
          '2. Consulte docs/GOOGLE_ADS_SETUP.md',
          '3. Reinicie o servidor após configurar'
        ]
      };
    }

    // Validações obrigatórias (apenas no servidor)
    if (!customerId) {
      errors.push('GOOGLE_ADS_CUSTOMER_ID não configurado');
    } else if (!this.validateCustomerId(customerId)) {
      errors.push('GOOGLE_ADS_CUSTOMER_ID formato inválido (deve ser: 123-456-7890)');
    }

    if (!developerToken) {
      errors.push('GOOGLE_ADS_DEVELOPER_TOKEN não configurado');
    } else if (!this.validateDeveloperToken(developerToken)) {
      warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN pode estar em formato incorreto');
    }

    if (!clientId) {
      errors.push('GOOGLE_ADS_CLIENT_ID não configurado');
    } else if (!this.validateClientId(clientId)) {
      errors.push('GOOGLE_ADS_CLIENT_ID formato inválido (deve terminar com .apps.googleusercontent.com)');
    }

    if (!clientSecret) {
      errors.push('GOOGLE_ADS_CLIENT_SECRET não configurado');
    }

    if (!refreshToken) {
      errors.push('GOOGLE_ADS_REFRESH_TOKEN não configurado');
    } else if (!this.validateRefreshToken(refreshToken)) {
      warnings.push('GOOGLE_ADS_REFRESH_TOKEN pode estar em formato incorreto');
    }

    // Validações de IDs de conversão
    const conversionIds = {
      lead: leadId || '',
      scheduling: schedulingId || '',
      completion: completionId || '',
      stove4: stove4Id || '',
      stove6: stove6Id || '',
      cooktop: cooktopId || '',
      oven: ovenId || ''
    };

    Object.entries(conversionIds).forEach(([key, id]) => {
      if (!id) {
        warnings.push(`ID de conversão ${key} não configurado`);
      } else if (!this.validateConversionId(id)) {
        errors.push(`ID de conversão ${key} formato inválido (deve ser numérico)`);
      }
    });

    const isValid = errors.length === 0;

    const result: ValidationResult = {
      isValid,
      errors,
      warnings
    };

    if (isValid) {
      result.config = {
        customerId: customerId!,
        developerToken: developerToken!,
        clientId: clientId!,
        clientSecret: clientSecret!,
        refreshToken: refreshToken!,
        conversionIds
      };
    }

    return result;
  }

  /**
   * Valida formato do Customer ID
   */
  private static validateCustomerId(customerId: string): boolean {
    return /^\d{3}-\d{3}-\d{4}$/.test(customerId);
  }

  /**
   * Valida formato do Developer Token
   */
  private static validateDeveloperToken(token: string): boolean {
    // Developer tokens geralmente têm 22 caracteres
    return token.length >= 20 && /^[A-Za-z0-9_-]+$/.test(token);
  }

  /**
   * Valida formato do Client ID
   */
  private static validateClientId(clientId: string): boolean {
    return clientId.endsWith('.apps.googleusercontent.com');
  }

  /**
   * Valida formato do Refresh Token
   */
  private static validateRefreshToken(token: string): boolean {
    // Refresh tokens geralmente começam com "1//"
    return token.startsWith('1//') && token.length > 50;
  }

  /**
   * Valida formato do Conversion ID
   */
  private static validateConversionId(id: string): boolean {
    return /^\d+$/.test(id) && id.length >= 8;
  }

  /**
   * Gera relatório de configuração
   */
  static generateConfigReport(): string {
    const validation = this.validateConfig();
    
    let report = '🎯 RELATÓRIO DE CONFIGURAÇÃO GOOGLE ADS API\n\n';
    
    if (validation.isValid) {
      report += '✅ CONFIGURAÇÃO VÁLIDA\n\n';
      report += 'Todas as variáveis necessárias estão configuradas corretamente.\n';
      report += 'O sistema está pronto para enviar conversões automaticamente.\n\n';
    } else {
      report += '❌ CONFIGURAÇÃO INVÁLIDA\n\n';
      report += 'ERROS ENCONTRADOS:\n';
      validation.errors.forEach(error => {
        report += `• ${error}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += 'AVISOS:\n';
      validation.warnings.forEach(warning => {
        report += `• ${warning}\n`;
      });
      report += '\n';
    }

    report += 'PRÓXIMOS PASSOS:\n';
    if (!validation.isValid) {
      report += '1. Corrija os erros listados acima\n';
      report += '2. Consulte o guia: docs/GOOGLE_ADS_SETUP.md\n';
      report += '3. Execute o teste de conexão novamente\n';
    } else {
      report += '1. Execute o teste de conexão\n';
      report += '2. Crie um agendamento de teste\n';
      report += '3. Verifique se as conversões aparecem no Google Ads\n';
    }

    return report;
  }

  /**
   * Verifica se a configuração mínima está presente
   */
  static hasMinimalConfig(): boolean {
    // No browser, sempre retorna false
    if (typeof window !== 'undefined') {
      return false;
    }

    return !!(
      this.getEnvVar('GOOGLE_ADS_CUSTOMER_ID') &&
      this.getEnvVar('GOOGLE_ADS_DEVELOPER_TOKEN') &&
      this.getEnvVar('GOOGLE_ADS_CLIENT_ID') &&
      this.getEnvVar('GOOGLE_ADS_CLIENT_SECRET') &&
      this.getEnvVar('GOOGLE_ADS_REFRESH_TOKEN')
    );
  }

  /**
   * Lista variáveis faltantes
   */
  static getMissingVariables(): string[] {
    const required = [
      'GOOGLE_ADS_CUSTOMER_ID',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_REFRESH_TOKEN'
    ];

    return required.filter(variable => !this.getEnvVar(variable));
  }
}
