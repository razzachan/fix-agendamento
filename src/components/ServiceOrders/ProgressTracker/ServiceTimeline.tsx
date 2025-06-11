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
  MapPin,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface ServiceTimelineProps {
  serviceOrder: ServiceOrder;
  showAllSteps?: boolean;
}

const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ 
  serviceOrder, 
  showAllSteps = true 
}) => {
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
      className: `h-5 w-5 ${
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
          text: 'text-green-700',
          description: 'text-green-600'
        };
      case 'current':
        return {
          circle: 'bg-white border-blue-500 border-2 ring-4 ring-blue-100',
          line: 'bg-gray-200',
          text: 'text-blue-700 font-semibold',
          description: 'text-blue-600'
        };
      case 'pending':
        return {
          circle: 'bg-gray-200 border-gray-300',
          line: 'bg-gray-200',
          text: 'text-gray-500',
          description: 'text-gray-400'
        };
      default:
        return {
          circle: 'bg-gray-200 border-gray-300',
          line: 'bg-gray-200',
          text: 'text-gray-500',
          description: 'text-gray-400'
        };
    }
  };

  return (
    <div className="w-full">
      {/* Header da Timeline */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Acompanhamento do Serviço
            </h3>
            <p className="text-sm text-blue-700">
              <DisplayNumber item={serviceOrder} variant="inline" size="sm" showIcon={false} /> • {serviceOrder.clientName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600 font-medium">
              {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} de {serviceFlow.length} etapas
            </div>
            <div className="text-xs text-blue-500">
              {Math.round(((currentStepIndex + 1) / serviceFlow.length) * 100)}% concluído
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {serviceFlow.map((step, index) => {
          const stepState = getStepColor(index, currentStepIndex);
          const classes = getStepClasses(stepState);
          const isLast = index === serviceFlow.length - 1;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.status} className="relative flex items-start pb-8">
              {/* Linha conectora */}
              {!isLast && (
                <div 
                  className={`absolute left-6 top-12 w-0.5 h-16 ${classes.line}`}
                  style={{ zIndex: 1 }}
                />
              )}

              {/* Círculo do step */}
              <div className="relative flex-shrink-0">
                <div 
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${classes.circle}`}
                  style={{ zIndex: 2 }}
                >
                  {getStepIcon(step.status, isCompleted, isCurrent)}
                </div>
              </div>

              {/* Conteúdo do step */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${classes.text}`}>
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Em andamento
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Concluído
                    </span>
                  )}
                </div>
                
                <p className={`mt-1 text-sm ${classes.description}`}>
                  {step.description}
                </p>

                {/* Informações adicionais para step atual */}
                {isCurrent && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center text-sm text-blue-700">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        Atualizado em {format(new Date(serviceOrder.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {serviceOrder.address && (
                      <div className="flex items-center text-sm text-blue-700 mt-1">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="truncate">{serviceOrder.address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Informações de conclusão */}
                {isCompleted && step.status === 'completed' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>
                        Serviço finalizado com sucesso
                      </span>
                    </div>
                    {serviceOrder.completedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        Concluído em {format(new Date(serviceOrder.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer com informações do equipamento */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Wrench className="h-4 w-4 mr-2" />
            <span>{serviceOrder.equipment || 'Equipamento não especificado'}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <User className="h-4 w-4 mr-2" />
            <span>Técnico: {serviceOrder.technicianName || 'Não atribuído'}</span>
          </div>
        </div>
        {serviceOrder.problem && (
          <div className="mt-2 text-sm text-gray-600">
            <strong>Problema:</strong> {serviceOrder.problem}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceTimeline;
