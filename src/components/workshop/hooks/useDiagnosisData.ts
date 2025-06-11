
import { useState, useCallback, useEffect } from 'react';
import { ServiceEvent } from '@/types';
import { serviceEventService } from '@/services';
import { toast } from 'sonner';

export const useDiagnosisData = (serviceOrderId: string, refreshKey: number = 0) => {
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosisEvent, setDiagnosisEvent] = useState<ServiceEvent | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const MAX_RETRIES = 5;

  const fetchDiagnosisData = useCallback(async () => {
    if (!serviceOrderId) {
      setIsLoading(false);
      setFetchCompleted(true);
      return;
    }

    // Prevent excessive retries
    if (retryCount >= MAX_RETRIES) {
      setIsLoading(false);
      setFetchCompleted(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();

      // Fetch diagnosis events with cache headers
      const events = await serviceEventService.getDiagnosisEvents(serviceOrderId);

      if (events && events.length > 0) {
        const latestEvent = events[0];
        setDiagnosisEvent(latestEvent);

        try {
          // Ensure description is a string before parsing
          const descriptionText = typeof latestEvent.description === 'string'
            ? latestEvent.description
            : JSON.stringify(latestEvent.description);

          const parsedDescription = JSON.parse(descriptionText);
          setParsedData(parsedDescription);
        } catch (parseError) {
          console.error('Erro ao parsear dados do diagnóstico:', parseError);
          setError('Erro ao analisar dados do diagnóstico');
          setParsedData(null);
        }
        setFetchCompleted(true);
      } else {
        // Only retry a few times when explicitly requested via refreshKey
        if (retryCount < MAX_RETRIES && refreshKey > 0) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000); // Increased retry interval to 2 seconds
        } else {
          setDiagnosisEvent(null);
          setParsedData(null);
          setFetchCompleted(true);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar eventos de diagnóstico:', error);
      setError('Falha ao carregar diagnóstico');
      toast.error('Não foi possível carregar os detalhes do diagnóstico');
      setDiagnosisEvent(null);
      setParsedData(null);
      setFetchCompleted(true);
    } finally {
      setIsLoading(false);
    }
  }, [serviceOrderId, refreshKey, retryCount]);

  // Fetch data when component mounts or refreshKey/retryCount changes
  useEffect(() => {
    fetchDiagnosisData();
  }, [fetchDiagnosisData]);

  // Reset retry count when refreshKey changes
  useEffect(() => {
    setRetryCount(0);
    setFetchCompleted(false);
  }, [refreshKey]);

  return {
    isLoading,
    error,
    diagnosisEvent,
    parsedData,
    refetch: fetchDiagnosisData,
    fetchCompleted
  };
};
