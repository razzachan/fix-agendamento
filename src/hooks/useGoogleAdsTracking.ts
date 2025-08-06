import { useState, useEffect, useCallback } from 'react';
import { GoogleAdsTrackingService } from '@/services/googleAdsTrackingService';
import { GoogleAdsApiService } from '@/services/googleAds/googleAdsApiService';
import { ConversionExportData, ConversionType } from '@/types';
import { toast } from 'sonner';

export const useGoogleAdsTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [conversions, setConversions] = useState<ConversionExportData[]>([]);
  const [trackingParams, setTrackingParams] = useState<{
    gclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }>({});

  // Capturar parâmetros de tracking na inicialização
  useEffect(() => {
    const params = GoogleAdsTrackingService.captureTrackingParams();
    const storedParams = GoogleAdsTrackingService.getStoredTrackingParams();
    
    const finalParams = { ...storedParams, ...params };
    setTrackingParams(finalParams);

    if (finalParams.gclid) {
      console.log('🎯 Google Ads tracking ativo:', finalParams);
    }
  }, []);

  /**
   * Registra uma conversão com dados detalhados
   */
  const recordConversion = useCallback(async (
    serviceOrderId: string,
    conversionType: ConversionType,
    conversionValue: number,
    equipmentType?: string,
    additionalData?: {
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      serviceAttendanceType?: string;
      initialCost?: number;
      finalCost?: number;
      technicianName?: string;
    }
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const success = await GoogleAdsTrackingService.recordConversion(
        serviceOrderId,
        conversionType,
        conversionValue,
        equipmentType,
        additionalData
      );

      if (success) {
        toast.success('Conversão registrada', {
          description: `${conversionType} - R$ ${conversionValue.toFixed(2)}`
        });
      }

      return success;
    } catch (error) {
      console.error('Erro ao registrar conversão:', error);
      toast.error('Erro ao registrar conversão');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Busca conversões para exportação
   */
  const loadConversions = useCallback(async (
    startDate: string,
    endDate: string,
    onlyNotExported: boolean = true
  ) => {
    try {
      setIsLoading(true);
      
      const data = await GoogleAdsTrackingService.getConversionsForExport(
        startDate,
        endDate,
        onlyNotExported
      );
      
      setConversions(data);
      
      toast.success(`${data.length} conversões encontradas`);
    } catch (error) {
      console.error('Erro ao carregar conversões:', error);
      toast.error('Erro ao carregar conversões');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Exporta conversões para CSV
   */
  const exportConversions = useCallback(async (
    startDate: string,
    endDate: string,
    markAsExported: boolean = true
  ) => {
    try {
      setIsLoading(true);
      
      // Buscar conversões
      const conversionsData = await GoogleAdsTrackingService.getConversionsForExport(
        startDate,
        endDate,
        true // Apenas não exportadas
      );

      if (conversionsData.length === 0) {
        toast.warning('Nenhuma conversão encontrada para exportar');
        return;
      }

      // Gerar CSV
      const csvContent = GoogleAdsTrackingService.generateCSV(conversionsData);
      
      // Fazer download
      const filename = `google-ads-conversions-${startDate}-${endDate}.csv`;
      GoogleAdsTrackingService.downloadCSV(csvContent, filename);

      // Marcar como exportadas se solicitado
      if (markAsExported) {
        // Aqui precisaríamos dos IDs das conversões, vamos implementar isso
        toast.success(`${conversionsData.length} conversões exportadas`);
      }

      toast.success(`Arquivo ${filename} baixado com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar conversões:', error);
      toast.error('Erro ao exportar conversões');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registra conversão de agendamento com dados detalhados
   */
  const recordSchedulingConversion = useCallback(async (
    serviceOrderId: string,
    initialCost: number = 0,
    equipmentType?: string,
    additionalData?: {
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      serviceAttendanceType?: string;
      initialCost?: number;
      finalCost?: number;
    }
  ) => {
    return await recordConversion(
      serviceOrderId,
      'agendamento',
      initialCost,
      equipmentType,
      additionalData
    );
  }, [recordConversion]);

  /**
   * Registra conversão de serviço concluído com dados detalhados
   * Para coleta diagnóstico/conserto, verifica se deve atualizar conversão existente
   */
  const recordCompletionConversion = useCallback(async (
    serviceOrderId: string,
    finalCost: number,
    equipmentType: string,
    additionalData?: {
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      serviceAttendanceType?: string;
      initialCost?: number;
      technicianName?: string;
      parentOrderId?: string; // ID da ordem original (diagnóstico)
      isSecondPhase?: boolean; // Se é conserto após diagnóstico
    }
  ) => {
    return await recordConversion(
      serviceOrderId,
      'servico_concluido',
      finalCost,
      equipmentType,
      { ...additionalData, finalCost }
    );
  }, [recordConversion]);

  /**
   * Registra conversão de pagamento recebido
   */
  const recordPaymentConversion = useCallback(async (
    serviceOrderId: string,
    paymentAmount: number
  ) => {
    return await recordConversion(
      serviceOrderId,
      'pagamento_recebido',
      paymentAmount,
      undefined
    );
  }, [recordConversion]);

  /**
   * Registra conversão para segunda fase (conserto após diagnóstico)
   * Atualiza a conversão original em vez de criar nova
   */
  const recordSecondPhaseConversion = useCallback(async (
    currentOrderId: string,
    parentOrderId: string,
    finalCost: number,
    equipmentType: string,
    additionalData?: {
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      serviceAttendanceType?: string;
      initialCost?: number;
      technicianName?: string;
    }
  ) => {
    return await recordConversion(
      currentOrderId,
      'servico_concluido',
      finalCost,
      equipmentType,
      {
        ...additionalData,
        finalCost,
        parentOrderId,
        isSecondPhase: true
      }
    );
  }, [recordConversion]);

  /**
   * Verifica se tem tracking ativo (GCLID presente)
   */
  const hasActiveTracking = useCallback(() => {
    return !!trackingParams.gclid;
  }, [trackingParams.gclid]);

  /**
   * Obtém estatísticas de conversão
   */
  const getConversionStats = useCallback(() => {
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((sum, conv) => sum + conv.conversionValue, 0);
    const avgValue = totalConversions > 0 ? totalValue / totalConversions : 0;

    const conversionsByType = conversions.reduce((acc, conv) => {
      acc[conv.conversionName] = (acc[conv.conversionName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalConversions,
      totalValue,
      avgValue,
      conversionsByType
    };
  }, [conversions]);

  /**
   * Envio automático via Google Ads API
   */
  const uploadToGoogleAdsApi = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      setIsLoading(true);

      // Simular upload no browser (modo demonstração)
      if (typeof window !== 'undefined') {
        // Simular delay de upload
        await new Promise(resolve => setTimeout(resolve, 3000));

        toast.success('🎯 Demonstração: Upload simulado com sucesso! Configure no servidor para envio real.');
        return true;
      }

      // Buscar conversões
      const conversionsData = await GoogleAdsTrackingService.getConversionsForExport(
        startDate,
        endDate,
        true // Apenas não exportadas
      );

      if (conversionsData.length === 0) {
        toast.warning('Nenhuma conversão encontrada para enviar');
        return false;
      }

      // Enviar via API
      const success = await GoogleAdsApiService.uploadConversions(conversionsData);

      if (success) {
        toast.success(`${conversionsData.length} conversões enviadas automaticamente para Google Ads!`);
        return true;
      } else {
        toast.error('Falha no envio automático. Tente o upload manual.');
        return false;
      }

    } catch (error) {
      console.error('Erro no upload automático:', error);
      toast.error('Erro no envio automático');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Testar conexão com Google Ads API
   */
  const testGoogleAdsConnection = useCallback(async () => {
    try {
      setIsLoading(true);

      // Simular teste no browser (modo demonstração)
      if (typeof window !== 'undefined') {
        // Simular delay de teste
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar se há configuração básica (simulada)
        const hasBasicConfig = localStorage.getItem('google_ads_demo_config');

        if (hasBasicConfig) {
          toast.success('✅ Teste de demonstração concluído! Configuração simulada detectada.');
        } else {
          toast.warning('⚠️ Modo demonstração ativo. Para teste real, configure no servidor seguindo docs/GOOGLE_ADS_SETUP.md');
        }
        return true;
      }

      const connected = await GoogleAdsApiService.testConnection();

      if (connected) {
        toast.success('Conexão com Google Ads API estabelecida!');
      } else {
        toast.error('Falha na conexão com Google Ads API');
      }

      return connected;
    } catch (error) {
      toast.error('Erro ao testar conexão');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Estados
    isLoading,
    conversions,
    trackingParams,
    
    // Ações
    recordConversion,
    recordSchedulingConversion,
    recordCompletionConversion,
    recordPaymentConversion,
    loadConversions,
    exportConversions,
    
    // Utilitários
    hasActiveTracking,
    getConversionStats,

    // API Automática
    uploadToGoogleAdsApi,
    testGoogleAdsConnection,

    // Segunda Fase (Conserto após Diagnóstico)
    recordSecondPhaseConversion
  };
};
