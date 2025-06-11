import React, { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder } from '@/types';
import { getServiceFlow } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/statusMapping';

interface ProgressVisualizationProps {
  serviceOrder: ServiceOrder;
}

const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({ serviceOrder }) => {
  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";
  
  // Obter o fluxo de serviço com base no tipo de atendimento
  const serviceFlow = getServiceFlow(validType);
  const currentStatusIndex = serviceFlow.findIndex(step => step.status === serviceOrder.status);
  
  // Calcular a porcentagem de progresso
  const progressPercentage = currentStatusIndex >= 0 
    ? (currentStatusIndex / (serviceFlow.length - 1)) * 100
    : 0;
    
  // Log para depuração
  useEffect(() => {
    console.log(`ProgressVisualization: Ordem ${serviceOrder.id}`);
    console.log(`- Tipo de atendimento: ${validType}`);
    console.log(`- Status atual: ${serviceOrder.status} (${translateStatus(serviceOrder.status)})`);
    console.log(`- Índice no fluxo: ${currentStatusIndex}`);
    console.log(`- Progresso: ${progressPercentage.toFixed(1)}%`);
    
    if (currentStatusIndex === -1) {
      console.warn(`Status '${serviceOrder.status}' não encontrado no fluxo para tipo '${validType}'`);
      console.log('Fluxo disponível:', serviceFlow.map(s => s.status).join(' → '));
    }
  }, [serviceOrder.id, serviceOrder.status, validType, currentStatusIndex, progressPercentage]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm pt-2">
        <span>Progresso:</span>
        <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />

      <div className="flex justify-between mt-4 overflow-x-auto pb-2">
        {serviceFlow.map((step, index) => {
          const isActive = serviceOrder.status === step.status;
          const isCompleted = currentStatusIndex > index;
          const isPending = currentStatusIndex < index;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center ${
                isActive ? 'text-primary' : 
                isCompleted ? 'text-green-600' : 
                'text-gray-400'
              }`}
            >
              <div className={`rounded-full p-2 mb-1 ${
                isActive ? 'bg-blue-100 border border-primary' :
                isCompleted ? 'bg-green-100 border border-green-600' :
                'bg-gray-100 border border-gray-300'
              }`}>
                {step.icon}
              </div>
              <span className="text-xs font-medium text-center whitespace-nowrap">
                {step.label}
              </span>
              {isActive && (
                <span className="text-[10px] bg-primary text-white px-1 rounded mt-1">
                  Atual
                </span>
              )}
            </div>
          );
        })}
      </div>

      {currentStatusIndex === -1 && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mt-2">
          <p>Status atual não encontrado no fluxo padrão.</p>
          <p>Status: {translateStatus(serviceOrder.status)}</p>
        </div>
      )}
    </div>
  );
};

export default ProgressVisualization;
