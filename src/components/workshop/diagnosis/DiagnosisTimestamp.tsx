
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiagnosisTimestampProps {
  createdAt: string;
}

const DiagnosisTimestamp: React.FC<DiagnosisTimestampProps> = ({ createdAt }) => {
  return (
    <p className="text-xs text-slate-500 mt-3">
      Diagnóstico registrado em {format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    </p>
  );
};

export default DiagnosisTimestamp;
