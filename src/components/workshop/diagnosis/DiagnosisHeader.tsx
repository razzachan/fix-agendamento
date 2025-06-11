
import React from 'react';
import { PencilRuler } from 'lucide-react';

const DiagnosisHeader: React.FC = () => {
  return (
    <div className="flex items-center gap-2 font-medium text-slate-800">
      <PencilRuler className="h-4 w-4 text-indigo-500" />
      Diagnóstico Técnico
    </div>
  );
};

export default DiagnosisHeader;
