
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DiagnosisErrorProps {
  error: string;
  onRetry: () => void;
}

const DiagnosisError: React.FC<DiagnosisErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="py-2 text-amber-500 space-y-2">
      <p>{error}</p>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1" 
        onClick={onRetry}
      >
        <RefreshCw className="h-3 w-3" /> Tentar novamente
      </Button>
    </div>
  );
};

export default DiagnosisError;
