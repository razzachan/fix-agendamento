
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DiagnosisEmptyProps {
  serviceOrderId?: string;
  onRefresh: () => void;
}

const DiagnosisEmpty: React.FC<DiagnosisEmptyProps> = ({ serviceOrderId, onRefresh }) => {
  return (
    <div className="py-2 text-sm space-y-4">
      <p className="text-muted-foreground">Nenhum diagnóstico registrado.</p>
      {serviceOrderId && (
        <div className="flex flex-col space-y-2">
          <p className="text-xs text-slate-500">
            Se você acabou de salvar um diagnóstico, clique no botão abaixo para atualizar os dados. 
            O diagnóstico pode levar alguns segundos para aparecer.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 w-full justify-center" 
            onClick={onRefresh}
          >
            <RefreshCw className="h-3 w-3" /> Verificar novamente
          </Button>
        </div>
      )}
    </div>
  );
};

export default DiagnosisEmpty;
