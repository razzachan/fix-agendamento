
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useDiagnosisData } from './hooks/useDiagnosisData';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DiagnosisContent from './diagnosis/DiagnosisContent';
import DiagnosisLoading from './diagnosis/DiagnosisLoading';
import DiagnosisEmpty from './diagnosis/DiagnosisEmpty';
import DiagnosisError from './diagnosis/DiagnosisError';
import { toast } from 'sonner';

interface DiagnosisDisplayProps {
  serviceOrderId: string;
  refreshKey?: number;
}

export function DiagnosisDisplay({ serviceOrderId, refreshKey = 0 }: DiagnosisDisplayProps) {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const combinedRefreshKey = refreshKey + localRefreshKey;
  
  const {
    isLoading,
    error,
    diagnosisEvent,
    parsedData,
    refetch,
    fetchCompleted
  } = useDiagnosisData(serviceOrderId, combinedRefreshKey);

  // Auto-refresh logic for first load
  useEffect(() => {
    if (!isLoading && fetchCompleted && !diagnosisEvent && refreshKey > 0 && localRefreshKey === 0) {
      // Auto-refresh once after initial load if no data found
      const timer = setTimeout(() => {
        console.log('Auto-refreshing diagnosis data after initial load');
        setLocalRefreshKey(prev => prev + 1);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, fetchCompleted, diagnosisEvent, refreshKey, localRefreshKey]);

  const handleRefresh = () => {
    console.log('Manual refresh requested for diagnosis data');
    setRefreshing(true);
    toast.info("Verificando diagnóstico...");
    
    // Increment local refresh key to trigger a refetch
    setLocalRefreshKey(prev => prev + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Render loading state
  if (isLoading) {
    return <DiagnosisLoading />;
  }

  // Render error state
  if (error) {
    return <DiagnosisError error={error} onRetry={handleRefresh} />;
  }

  // Render empty state when no diagnosis is found
  if (!diagnosisEvent || !parsedData) {
    return <DiagnosisEmpty serviceOrderId={serviceOrderId} onRefresh={handleRefresh} />;
  }

  // Render diagnosis data
  return (
    <Card className="p-4 space-y-4">
      <DiagnosisContent diagnosisEvent={diagnosisEvent} parsedData={parsedData} />
      
      <div className="flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-6 w-6 p-0 rounded-full ${refreshing ? 'opacity-50' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar</span>
        </Button>
      </div>
    </Card>
  );
}
