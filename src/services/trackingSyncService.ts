/**
 * Serviço para sincronizar tracking entre frontend e middleware
 * Garante que conversões sejam registradas mesmo quando iniciadas via WhatsApp
 */

import { GoogleAdsTrackingService } from './googleAdsTrackingService';

export class TrackingSyncService {
  private static readonly MIDDLEWARE_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://fix-agendamento-production.up.railway.app'
    : 'http://localhost:8000';

  /**
   * Sincroniza parâmetros de tracking com o middleware
   * Envia GCLID e UTM params capturados no frontend para o backend
   */
  static async syncTrackingWithMiddleware(): Promise<boolean> {
    try {
      const trackingParams = GoogleAdsTrackingService.getStoredTrackingParams();
      
      // Só sincronizar se tiver parâmetros de tracking
      if (!trackingParams.gclid && !trackingParams.utmSource) {
        console.log('🎯 SYNC: Nenhum parâmetro de tracking para sincronizar');
        return false;
      }

      // Preparar dados para envio
      const syncData = {
        gclid: trackingParams.gclid,
        utm_source: trackingParams.utmSource,
        utm_medium: trackingParams.utmMedium,
        utm_campaign: trackingParams.utmCampaign,
        utm_term: trackingParams.utmTerm,
        utm_content: trackingParams.utmContent,
        captured_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referer: document.referrer,
        request_url: window.location.href,
        sync_source: 'frontend'
      };

      // Enviar para o middleware
      const response = await fetch(`${this.MIDDLEWARE_BASE_URL}/sync-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SYNC: Tracking sincronizado com middleware:', {
          gclid: trackingParams.gclid?.substring(0, 20) + '...',
          utm_source: trackingParams.utmSource
        });
        return true;
      } else {
        console.error('❌ SYNC: Falha ao sincronizar tracking:', response.status);
        return false;
      }

    } catch (error) {
      console.error('❌ SYNC: Erro ao sincronizar tracking:', error);
      return false;
    }
  }

  /**
   * Verifica se há tracking ativo no middleware
   * Útil para validar se conversões podem ser registradas
   */
  static async checkMiddlewareTracking(): Promise<{
    hasTracking: boolean;
    gclid?: string;
    utm_source?: string;
  }> {
    try {
      const response = await fetch(`${this.MIDDLEWARE_BASE_URL}/check-tracking`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        return {
          hasTracking: result.has_tracking || false,
          gclid: result.gclid,
          utm_source: result.utm_source
        };
      }

      return { hasTracking: false };

    } catch (error) {
      console.error('❌ SYNC: Erro ao verificar tracking no middleware:', error);
      return { hasTracking: false };
    }
  }

  /**
   * Força sincronização de tracking quando usuário interage com o sistema
   * Deve ser chamado em pontos estratégicos (login, criação de OS, etc.)
   */
  static async ensureTrackingSync(): Promise<void> {
    try {
      // 1. Tentar sincronizar tracking do frontend
      await this.syncTrackingWithMiddleware();

      // 2. Verificar se middleware tem tracking
      const middlewareTracking = await this.checkMiddlewareTracking();

      // 3. Se middleware não tem tracking, mas frontend tem, tentar novamente
      const frontendTracking = GoogleAdsTrackingService.getStoredTrackingParams();
      
      if (!middlewareTracking.hasTracking && (frontendTracking.gclid || frontendTracking.utmSource)) {
        console.log('🔄 SYNC: Tentando sincronização novamente...');
        await this.syncTrackingWithMiddleware();
      }

      // 4. Log do status final
      if (middlewareTracking.hasTracking || frontendTracking.gclid) {
        console.log('✅ SYNC: Sistema de tracking ativo', {
          frontend: !!frontendTracking.gclid,
          middleware: middlewareTracking.hasTracking,
          gclid: frontendTracking.gclid?.substring(0, 20) + '...' || middlewareTracking.gclid?.substring(0, 20) + '...'
        });
      } else {
        console.log('ℹ️ SYNC: Nenhum tracking ativo (tráfego direto)');
      }

    } catch (error) {
      console.error('❌ SYNC: Erro na sincronização de tracking:', error);
    }
  }

  /**
   * Registra conversão usando o melhor método disponível
   * Tenta middleware primeiro, depois frontend como fallback
   */
  static async registerConversion(
    serviceOrderId: string,
    conversionType: string,
    conversionValue: number,
    equipmentType?: string,
    additionalData?: any
  ): Promise<boolean> {
    try {
      // 1. Tentar registrar via middleware (preferido)
      const middlewareSuccess = await this.registerConversionViaMiddleware(
        serviceOrderId,
        conversionType,
        conversionValue,
        equipmentType,
        additionalData
      );

      if (middlewareSuccess) {
        console.log('✅ CONVERSÃO: Registrada via middleware');
        return true;
      }

      // 2. Fallback: registrar via frontend
      console.log('🔄 CONVERSÃO: Tentando via frontend como fallback...');
      const frontendSuccess = await GoogleAdsTrackingService.recordConversion(
        serviceOrderId,
        conversionType as any,
        conversionValue,
        equipmentType,
        additionalData
      );

      if (frontendSuccess) {
        console.log('✅ CONVERSÃO: Registrada via frontend');
        return true;
      }

      console.log('ℹ️ CONVERSÃO: Nenhum tracking ativo - conversão não registrada');
      return false;

    } catch (error) {
      console.error('❌ CONVERSÃO: Erro ao registrar:', error);
      return false;
    }
  }

  /**
   * Registra conversão via middleware
   */
  private static async registerConversionViaMiddleware(
    serviceOrderId: string,
    conversionType: string,
    conversionValue: number,
    equipmentType?: string,
    additionalData?: any
  ): Promise<boolean> {
    try {
      const conversionData = {
        service_order_id: serviceOrderId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        equipment_type: equipmentType,
        additional_data: additionalData
      };

      const response = await fetch(`${this.MIDDLEWARE_BASE_URL}/register-conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData)
      });

      return response.ok;

    } catch (error) {
      console.error('❌ Erro ao registrar conversão via middleware:', error);
      return false;
    }
  }
}

// Auto-sincronizar tracking quando o serviço for carregado
if (typeof window !== 'undefined') {
  // Aguardar um pouco para garantir que parâmetros foram capturados
  setTimeout(() => {
    TrackingSyncService.ensureTrackingSync();
  }, 1000);
}
