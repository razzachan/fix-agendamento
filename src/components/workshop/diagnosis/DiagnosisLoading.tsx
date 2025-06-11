
import React from 'react';
import { Loader2 } from 'lucide-react';

const DiagnosisLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span>Carregando diagnóstico...</span>
    </div>
  );
};

export default DiagnosisLoading;
