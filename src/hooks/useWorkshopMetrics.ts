import { useState, useEffect, useCallback } from 'react';
import { workshopMetricsService, WorkshopMetrics, WorkshopTimeMetrics } from '@/services/workshop/workshopMetricsService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseWorkshopMetricsReturn {
  metrics: WorkshopMetrics | null;
  timeMetrics: WorkshopTimeMetrics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshMetrics: () => Promise<void>;
  refreshTimeMetrics: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Hook personalizado para gerenciar métricas da oficina
 */
export function useWorkshopMetrics(): UseWorkshopMetricsReturn {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WorkshopMetrics | null>(null);
  const [timeMetrics, setTimeMetrics] = useState<WorkshopTimeMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Carrega métricas gerais da oficina
   */
  const refreshMetrics = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 [useWorkshopMetrics] Carregando métricas gerais...');
      setError(null);
      
      const workshopMetrics = await workshopMetricsService.getWorkshopMetrics(user.id);
      setMetrics(workshopMetrics);
      setLastUpdated(new Date());
      
      console.log('✅ [useWorkshopMetrics] Métricas gerais carregadas');
    } catch (err) {
      console.error('❌ [useWorkshopMetrics] Erro ao carregar métricas:', err);
      setError('Erro ao carregar métricas da oficina');
      toast.error('Erro ao carregar métricas da oficina');
    }
  }, [user?.id]);

  /**
   * Carrega métricas detalhadas de tempo
   */
  const refreshTimeMetrics = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 [useWorkshopMetrics] Carregando métricas de tempo...');
      
      const detailedMetrics = await workshopMetricsService.getDetailedTimeMetrics(user.id);
      setTimeMetrics(detailedMetrics);
      
      console.log('✅ [useWorkshopMetrics] Métricas de tempo carregadas');
    } catch (err) {
      console.error('❌ [useWorkshopMetrics] Erro ao carregar métricas de tempo:', err);
      setError('Erro ao carregar métricas detalhadas');
    }
  }, [user?.id]);

  /**
   * Carrega todas as métricas
   */
  const refreshAll = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      await Promise.all([
        refreshMetrics(),
        refreshTimeMetrics()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshMetrics, refreshTimeMetrics, user?.id]);

  // Carregamento inicial
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Atualização automática a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [refreshAll]);

  return {
    metrics,
    timeMetrics,
    isLoading,
    error,
    lastUpdated,
    refreshMetrics,
    refreshTimeMetrics,
    refreshAll
  };
}
