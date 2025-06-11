
import React from 'react';
import { CalendarClock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiagnosisEstimatesProps {
  estimatedCost?: number;
  estimatedCompletionDate?: string;
}

const DiagnosisEstimates: React.FC<DiagnosisEstimatesProps> = ({
  estimatedCost,
  estimatedCompletionDate
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (!estimatedCost && !estimatedCompletionDate) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
      {estimatedCost && (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-slate-600">
            Custo estimado: <span className="font-medium">R$ {Number(estimatedCost).toFixed(2)}</span>
          </span>
        </div>
      )}
      
      {estimatedCompletionDate && (
        <div className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-slate-600">
            Previsão de conclusão: <span className="font-medium">{formatDate(estimatedCompletionDate)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default DiagnosisEstimates;
