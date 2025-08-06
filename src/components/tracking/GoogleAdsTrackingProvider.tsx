import React, { useEffect } from 'react';
import { GoogleAdsTrackingService } from '@/services/googleAdsTrackingService';

interface GoogleAdsTrackingProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que inicializa o tracking do Google Ads na aplicação
 * Deve ser colocado no nível mais alto da aplicação (App.tsx)
 */
export const GoogleAdsTrackingProvider: React.FC<GoogleAdsTrackingProviderProps> = ({ 
  children 
}) => {
  useEffect(() => {
    // Capturar parâmetros de tracking na inicialização da aplicação
    const trackingParams = GoogleAdsTrackingService.captureTrackingParams();
    
    if (trackingParams.gclid) {
      console.log('🎯 Google Ads tracking inicializado:', {
        gclid: trackingParams.gclid.substring(0, 20) + '...',
        source: trackingParams.utmSource,
        campaign: trackingParams.utmCampaign
      });
    } else if (trackingParams.utmSource) {
      console.log('📊 UTM tracking detectado:', {
        source: trackingParams.utmSource,
        medium: trackingParams.utmMedium,
        campaign: trackingParams.utmCampaign
      });
    }
  }, []);

  return <>{children}</>;
};

export default GoogleAdsTrackingProvider;
