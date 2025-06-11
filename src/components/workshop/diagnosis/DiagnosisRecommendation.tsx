
import React from 'react';

interface DiagnosisRecommendationProps {
  recommendedService: string;
}

const DiagnosisRecommendation: React.FC<DiagnosisRecommendationProps> = ({ 
  recommendedService 
}) => {
  if (!recommendedService) return null;
  
  return (
    <div className="bg-white rounded p-2 border border-slate-100">
      <p className="font-medium text-slate-700 mb-1">Serviço Recomendado:</p>
      <p className="text-slate-600">{recommendedService}</p>
    </div>
  );
};

export default DiagnosisRecommendation;
