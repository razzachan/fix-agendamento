
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder } from '@/types';
import { getServiceFlow } from '@/utils/serviceFlowUtils';

interface OrderProgressProps {
  serviceOrder: ServiceOrder;
  progressPercentage: number;
}

const OrderProgress: React.FC<OrderProgressProps> = ({ 
  serviceOrder, 
  progressPercentage 
}) => {
  const attendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType) 
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";
  
  const serviceFlow = getServiceFlow(validType);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm pt-2">
        <span>Progresso:</span>
        <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />

      <div className="flex justify-between pt-2">
        {serviceFlow.map((step, index) => {
          const isActive = serviceOrder.status === step.status;
          const isCompleted = serviceFlow.findIndex(s => s.status === serviceOrder.status) > index;

          return (
            <div 
              key={step.key} 
              className={`flex flex-col items-center ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <div className={`rounded-full p-2 mb-1 ${
                isActive ? 'bg-blue-100 border border-primary' : 
                isCompleted ? 'bg-green-100 border border-green-600' : 
                'bg-gray-100 border border-gray-300'
              }`}>
                {step.icon}
              </div>
              <span className="text-xs font-medium text-center">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderProgress;
