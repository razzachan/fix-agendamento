
import React from 'react';
import { useScheduling } from './SchedulingContext';

const LoadingIndicator = () => {
  const { isLoading } = useScheduling();
  
  if (!isLoading) return null;
  
  return (
    <div className="flex items-center justify-center py-2">
      <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
      <span className="ml-2 text-sm text-muted-foreground">Verificando disponibilidade...</span>
    </div>
  );
};

export default LoadingIndicator;
