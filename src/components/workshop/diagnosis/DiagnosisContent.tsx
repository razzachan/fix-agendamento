
import React from 'react';
import { ServiceEvent } from '@/types';
import DiagnosisHeader from './DiagnosisHeader';
import DiagnosisRecommendation from './DiagnosisRecommendation';
import DiagnosisEstimates from './DiagnosisEstimates';
import DiagnosisPartsLink from './DiagnosisPartsLink';
import DiagnosisTimestamp from './DiagnosisTimestamp';

interface DiagnosisContentProps {
  diagnosisEvent: ServiceEvent;
  parsedData: any;
}

const DiagnosisContent: React.FC<DiagnosisContentProps> = ({ 
  diagnosisEvent, 
  parsedData 
}) => {
  return (
    <>
      <DiagnosisHeader />
      
      <p className="text-slate-700 whitespace-pre-wrap">
        {parsedData.diagnosis_details}
      </p>
      
      <DiagnosisRecommendation 
        recommendedService={parsedData.recommended_service} 
      />
      
      <DiagnosisEstimates 
        estimatedCost={parsedData.estimated_cost}
        estimatedCompletionDate={parsedData.estimated_completion_date}
      />
      
      <DiagnosisPartsLink 
        partsLink={parsedData.parts_purchase_link} 
      />
      
      <DiagnosisTimestamp 
        createdAt={diagnosisEvent.createdAt} 
      />
    </>
  );
};

export default DiagnosisContent;
