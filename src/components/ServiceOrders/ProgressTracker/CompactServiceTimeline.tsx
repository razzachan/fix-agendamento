import React from 'react';
import { ServiceOrder } from '@/types';
import { getServiceFlow, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Truck, 
  Wrench, 
  Home, 
  Package, 
  CreditCard,
  Calendar
} from 'lucide-react';

interface CompactServiceTimelineProps {
  serviceOrder: ServiceOrder;
}

const CompactServiceTimeline: React.FC<CompactServiceTimelineProps> = ({ serviceOrder }) => {
  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Obter o fluxo de serviço baseado no tipo de atendimento
  const serviceFlow = getServiceFlow(validType);
  const currentStepIndex = getCurrentStepIndex(serviceOrder.status, validType);

  // Função para obter ícone baseado no status
  const getStepIcon = (status: string, isCompleted: boolean, isCurrent: boolean) => {
    const iconProps = {
      className: `h-4 w-4 ${
        isCompleted 
          ? 'text-white' 
          : isCurrent 
            ? 'text-blue-600' 
            : 'text-gray-400'
      }`
    };

    // Ícones específicos por status
    switch (status) {
      case 'scheduled':
      case 'pickup_scheduled':
        return <Calendar {...iconProps} />;
      case 'on_the_way':
      case 'on_the_way_to_deliver':
        return <Truck {...iconProps} />;
      case 'collected':
      case 'collected_for_diagnosis':
      case 'collected_for_delivery':
        return <Package {...iconProps} />;
      case 'at_workshop':
        return <Home {...iconProps} />;
      case 'in_progress':
      case 'in_repair':
        return <Wrench {...iconProps} />;
      case 'payment_pending':
        return <CreditCard {...iconProps} />;
      case 'completed':
        return <CheckCircle {...iconProps} />;
      default:
        return isCompleted ? <CheckCircle {...iconProps} /> : <Circle {...iconProps} />;
    }
  };

  // Função para obter cor do step
  const getStepColor = (index: number, currentIndex: number) => {
    if (index < currentIndex) {
      return 'completed'; // Concluído
    } else if (index === currentIndex) {
      return 'current'; // Atual
    } else {
      return 'pending'; // Pendente
    }
  };

  // Função para obter classes CSS baseadas no estado
  const getStepClasses = (stepState: string) => {
    switch (stepState) {
      case 'completed':
        return {
          circle: 'bg-green-500 border-green-500',
          line: 'bg-green-500',
          text: 'text-green-700 font-medium'
        };
      case 'current':
        return {
          circle: 'bg-white border-blue-500 border-2 ring-2 ring-blue-100',
          line: 'bg-gray-200',
          text: 'text-blue-700 font-semibold'
        };
      case 'pending':
        return {
          circle: 'bg-gray-200 border-gray-300',
          line: 'bg-gray-200',
          text: 'text-gray-500'
        };
      default:
        return {
          circle: 'bg-gray-200 border-gray-300',
          line: 'bg-gray-200',
          text: 'text-gray-500'
        };
    }
  };

  return (
    <div className="w-full">
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          Progresso do Serviço
        </h4>
        <div className="text-xs text-gray-500">
          {currentStepIndex >= 0 ? currentStepIndex + 1 : 0}/{serviceFlow.length} • {Math.round(((currentStepIndex + 1) / serviceFlow.length) * 100)}%
        </div>
      </div>

      {/* Timeline horizontal compacta */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {serviceFlow.map((step, index) => {
            const stepState = getStepColor(index, currentStepIndex);
            const classes = getStepClasses(stepState);
            const isLast = index === serviceFlow.length - 1;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.status} className="flex flex-col items-center relative">
                {/* Linha conectora horizontal */}
                {!isLast && (
                  <div 
                    className={`absolute top-4 left-8 h-0.5 ${classes.line}`}
                    style={{ 
                      width: `calc(100vw / ${serviceFlow.length} - 2rem)`,
                      zIndex: 1 
                    }}
                  />
                )}

                {/* Círculo do step */}
                <div 
                  className={`w-8 h-8 rounded-full border flex items-center justify-center relative ${classes.circle}`}
                  style={{ zIndex: 2 }}
                >
                  {getStepIcon(step.status, isCompleted, isCurrent)}
                </div>

                {/* Label do step */}
                <div className="mt-2 text-center max-w-20">
                  <div className={`text-xs ${classes.text}`}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Atual
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status atual detalhado */}
      {currentStepIndex >= 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-blue-900">
                {serviceFlow[currentStepIndex]?.label}
              </div>
              <div className="text-xs text-blue-700">
                {serviceFlow[currentStepIndex]?.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactServiceTimeline;
