
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagnosisData } from './hooks/useDiagnosisData';
import DiagnosisLoading from './diagnosis/DiagnosisLoading';
import DiagnosisError from './diagnosis/DiagnosisError';
import DiagnosisEmpty from './diagnosis/DiagnosisEmpty';
import DiagnosisContent from './diagnosis/DiagnosisContent';
import { toast } from 'sonner';

interface DiagnosisDetailsProps {
  serviceOrderId: string;
  refreshKey?: number;
}

const DiagnosisDetails: React.FC<DiagnosisDetailsProps> = ({ serviceOrderId, refreshKey = 0 }) => {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0);

  // Combine external and local refresh keys
  const combinedRefreshKey = refreshKey + localRefreshKey;

  // Fetch diagnosis data
  const { isLoading, error, diagnosisEvent, parsedData, refetch } = useDiagnosisData(serviceOrderId, combinedRefreshKey);

  // Auto-refresh mechanism for when data was just saved
  useEffect(() => {
    if (refreshKey > 0 && !diagnosisEvent && autoRefreshAttempts < 3 && !isLoading) {
      const timer = setTimeout(() => {
        setLocalRefreshKey(prev => prev + 1);
        setAutoRefreshAttempts(prev => prev + 1);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [refreshKey, diagnosisEvent, autoRefreshAttempts, isLoading]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    toast.info("Verificando dados mais recentes...");

    try {
      // Reset auto-refresh state
      setAutoRefreshAttempts(0);

      // Increment local refresh key to trigger a refetch via the hook
      setLocalRefreshKey(prev => prev + 1);

      // Also call refetch directly
      await refetch();

      if (!diagnosisEvent) {
        toast.info("Aguardando dados do diagnóstico...");
      }
    } catch (error) {
      console.error("Erro ao atualizar diagnóstico:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (isLoading) {
    return <DiagnosisLoading />;
  }

  if (error) {
    return <DiagnosisError error={error} onRetry={handleRefresh} />;
  }

  if (!diagnosisEvent || !parsedData) {
    return <DiagnosisEmpty serviceOrderId={serviceOrderId} onRefresh={handleRefresh} />;
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <DiagnosisContent diagnosisEvent={diagnosisEvent} parsedData={parsedData} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full flex-shrink-0 ml-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar</span>
        </Button>
      </div>
    </div>
  );
};

export default DiagnosisDetails;
