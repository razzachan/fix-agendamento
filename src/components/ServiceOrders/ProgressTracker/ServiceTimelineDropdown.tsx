import React, { useState } from 'react';
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
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceTimelineDropdownProps {
  serviceOrder: ServiceOrder;
}

const ServiceTimelineDropdown: React.FC<ServiceTimelineDropdownProps> = ({ serviceOrder }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Obter o fluxo de serviço baseado no tipo de atendimento
  const serviceFlow = getServiceFlow(validType);
  const currentStepIndex = getCurrentStepIndex(serviceOrder.status, validType);
  const currentStep = serviceFlow[currentStepIndex];
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

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

  // Função para obter classes CSS baseadas no estado
  const getStepClasses = (index: number, currentIndex: number) => {
    if (index < currentIndex) {
      return {
        circle: 'bg-green-500 border-green-500 shadow-sm',
        line: 'bg-green-500',
        text: 'text-green-700',
        description: 'text-green-600'
      };
    } else if (index === currentIndex) {
      return {
        circle: 'bg-white border-blue-500 border-2 ring-4 ring-blue-100 shadow-md',
        line: 'bg-gray-200',
        text: 'text-blue-700 font-semibold',
        description: 'text-blue-600'
      };
    } else {
      return {
        circle: 'bg-gray-200 border-gray-300 shadow-sm',
        line: 'bg-gray-200',
        text: 'text-gray-500',
        description: 'text-gray-400'
      };
    }
  };

  return (
    <div className="w-full">
      {/* Botão compacto para expandir */}
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between h-auto p-4"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {currentStep && getStepIcon(currentStep.status, false, true)}
            <div className="text-left">
              <div className="font-medium text-sm">
                {currentStep?.label || 'Status não encontrado'}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} de {serviceFlow.length} etapas • {Math.round(progress)}% concluído
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            Ver histórico
          </Badge>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </Button>

      {/* Timeline expandida */}
      {isExpanded && (
        <Card className="mt-3 border-t-0 rounded-t-none">
          <CardContent className="p-4">
            {/* Header da Timeline */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">
                    Histórico do Acompanhamento
                  </h4>
                  <p className="text-xs text-blue-700">
                    OS #{serviceOrder.id?.slice(-6) || 'N/A'} • {serviceOrder.clientName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600 font-medium">
                    {Math.round(progress)}% concluído
                  </div>
                  <div className="text-xs text-blue-500">
                    {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} de {serviceFlow.length} etapas
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline detalhada */}
            <div className="relative max-h-96 overflow-y-auto">
              {serviceFlow.map((step, index) => {
                const classes = getStepClasses(index, currentStepIndex);
                const isLast = index === serviceFlow.length - 1;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.status} className="relative flex items-start pb-6">
                    {/* Linha conectora */}
                    {!isLast && (
                      <div
                        className={`absolute left-5 top-10 w-0.5 h-10 ${classes.line}`}
                        style={{ zIndex: 1 }}
                      />
                    )}

                    {/* Círculo do step */}
                    <div className="relative flex-shrink-0" style={{ zIndex: 10 }}>
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${classes.circle}`}
                        style={{ zIndex: 10 }}
                      >
                        {getStepIcon(step.status, isCompleted, isCurrent)}
                      </div>
                    </div>

                    {/* Conteúdo do step */}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className={`text-sm font-medium ${classes.text}`}>
                          {step.label}
                        </h5>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                            Atual
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            ✓ Concluído
                          </Badge>
                        )}
                      </div>
                      
                      <p className={`mt-1 text-xs ${classes.description}`}>
                        {step.description}
                      </p>

                      {/* Informações adicionais para step atual */}
                      {isCurrent && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                          <div className="flex items-center text-xs text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              Atualizado em {format(new Date(serviceOrder.updatedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer com informações do equipamento */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <Wrench className="h-3 w-3 mr-2" />
                  <span>{serviceOrder.equipment || 'Equipamento não especificado'}</span>
                </div>
                {serviceOrder.technicianName && (
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-2" />
                    <span>Técnico: {serviceOrder.technicianName}</span>
                  </div>
                )}
                {serviceOrder.address && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-2" />
                    <span className="truncate">{serviceOrder.address}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceTimelineDropdown;
