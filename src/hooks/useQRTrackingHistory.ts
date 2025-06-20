/**
 * Hook para histórico de rastreamento de QR Codes
 */

import { useState, useCallback, useEffect } from 'react';
import { QRTrackingService } from '@/services/qrcode/qrTrackingService';
import { 
  TrackingHistory, 
  QRTrackingEvent,
  UseQRTrackingHistoryReturn 
} from '@/types/qrcode';

export function useQRTrackingHistory(serviceOrderId?: string): UseQRTrackingHistoryReturn & {
  recentEvents: QRTrackingEvent[];
  isLoadingRecent: boolean;
  refreshRecentEvents: () => Promise<void>;
} {
  const [trackingHistory, setTrackingHistory] = useState<TrackingHistory | null>(null);
  const [recentEvents, setRecentEvents] = useState<QRTrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega histórico de rastreamento para uma OS específica
   */
  const refreshHistory = useCallback(async (): Promise<void> => {
    if (!serviceOrderId) {
      setTrackingHistory(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📋 [useQRTrackingHistory] Carregando histórico para OS:', serviceOrderId);
      
      const history = await QRTrackingService.getTrackingHistory(serviceOrderId);
      setTrackingHistory(history);
      
      if (history) {
        console.log(`✅ [useQRTrackingHistory] Histórico carregado: ${history.events.length} eventos`);
      } else {
        console.log('ℹ️ [useQRTrackingHistory] Nenhum histórico encontrado');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setError(errorMessage);
      console.error('❌ [useQRTrackingHistory] Erro ao carregar histórico:', err);

    } finally {
      setIsLoading(false);
    }
  }, [serviceOrderId]);

  /**
   * Carrega eventos recentes de rastreamento
   */
  const refreshRecentEvents = useCallback(async (): Promise<void> => {
    setIsLoadingRecent(true);
    setError(null);

    try {
      console.log('📋 [useQRTrackingHistory] Carregando eventos recentes');
      
      const events = await QRTrackingService.getRecentTrackingEvents(50);
      setRecentEvents(events);
      
      console.log(`✅ [useQRTrackingHistory] ${events.length} eventos recentes carregados`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar eventos recentes';
      setError(errorMessage);
      console.error('❌ [useQRTrackingHistory] Erro ao carregar eventos recentes:', err);

    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  /**
   * Carrega histórico automaticamente quando serviceOrderId muda
   */
  useEffect(() => {
    if (serviceOrderId) {
      refreshHistory();
    }
  }, [serviceOrderId, refreshHistory]);

  /**
   * Carrega eventos recentes na inicialização
   */
  useEffect(() => {
    refreshRecentEvents();
  }, [refreshRecentEvents]);

  return {
    trackingHistory,
    recentEvents,
    isLoading,
    isLoadingRecent,
    error,
    refreshHistory,
    refreshRecentEvents
  };
}

export default useQRTrackingHistory;
