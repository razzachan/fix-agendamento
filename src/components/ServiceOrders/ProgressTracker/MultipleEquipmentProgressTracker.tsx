import React, { useState } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getServiceFlow, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/statusMapping';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench
} from 'lucide-react';

interface MultipleEquipmentProgressTrackerProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (serviceOrderId: string, status: string) => Promise<boolean>;
}

interface EquipmentProgress {
  equipment: string;
  attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  currentStatus: string;
  progress: number;
  nextStatus?: string;
  isCompleted: boolean;
}

export const MultipleEquipmentProgressTracker: React.FC<MultipleEquipmentProgressTrackerProps> = ({
  serviceOrder,
  onUpdateStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Verificar se tem múltiplos equipamentos
  const hasMultipleItems = serviceOrder.serviceItems && serviceOrder.serviceItems.length > 1;
  
  if (!hasMultipleItems) {
    // Se não tem múltiplos equipamentos, usar o tracker normal
    return null;
  }

  // Calcular progresso para cada equipamento
  const equipmentProgress: EquipmentProgress[] = serviceOrder.serviceItems.map((item) => {
    const attendanceType = item.serviceAttendanceType;
    const serviceFlow = getServiceFlow(attendanceType);
    const currentStepIndex = getCurrentStepIndex(serviceOrder.status, attendanceType);
    const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;
    const nextStatus = currentStepIndex < serviceFlow.length - 1 ? serviceFlow[currentStepIndex + 1]?.status : undefined;
    const isCompleted = serviceOrder.status === 'completed' || serviceOrder.status === 'cancelled';

    return {
      equipment: `${item.equipmentType}${item.equipmentModel ? ` - ${item.equipmentModel}` : ''}`,
      attendanceType,
      currentStatus: serviceOrder.status,
      progress,
      nextStatus,
      isCompleted
    };
  });

  // Calcular progresso geral (média dos progressos individuais)
  const overallProgress = equipmentProgress.reduce((sum, eq) => sum + eq.progress, 0) / equipmentProgress.length;

  // Verificar se todos os equipamentos estão no mesmo tipo de atendimento
  const allSameType = equipmentProgress.every(eq => eq.attendanceType === equipmentProgress[0].attendanceType);

  // Obter tipos de atendimento únicos
  const uniqueAttendanceTypes = [...new Set(equipmentProgress.map(eq => eq.attendanceType))];

  const getAttendanceTypeLabel = (type: string) => {
    switch (type) {
      case 'em_domicilio': return 'Em Domicílio';
      case 'coleta_conserto': return 'Coleta Conserto';
      case 'coleta_diagnostico': return 'Coleta Diagnóstico';
      default: return type;
    }
  };

  const getAttendanceTypeColor = (type: string) => {
    switch (type) {
      case 'em_domicilio': return 'bg-blue-100 text-blue-800';
      case 'coleta_conserto': return 'bg-green-100 text-green-800';
      case 'coleta_diagnostico': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (isCompleted: boolean, progress: number) => {
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (progress > 0) return <Clock className="h-4 w-4 text-blue-600" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#e5b034]" />
            <CardTitle className="text-lg">
              Múltiplos Equipamentos ({serviceOrder.serviceItems.length})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!allSameType && (
              <Badge variant="outline" className="text-xs">
                {uniqueAttendanceTypes.length} tipos diferentes
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {Math.round(overallProgress)}% concluído
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso Geral */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progresso Geral</span>
            <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />

          {/* Indicador de eficiência */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{equipmentProgress.filter(eq => eq.isCompleted).length} de {equipmentProgress.length} concluídos</span>
            <span>
              {equipmentProgress.filter(eq => eq.progress > 50).length} em andamento
            </span>
          </div>
        </div>

        {/* Resumo dos Tipos de Atendimento */}
        {!allSameType && (
          <div className="flex flex-wrap gap-2">
            {uniqueAttendanceTypes.map(type => {
              const count = equipmentProgress.filter(eq => eq.attendanceType === type).length;
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className={`text-xs ${getAttendanceTypeColor(type)}`}
                >
                  {getAttendanceTypeLabel(type)} ({count})
                </Badge>
              );
            })}
          </div>
        )}

        {/* Status Atual Unificado */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(equipmentProgress.some(eq => eq.isCompleted), overallProgress)}
            <div>
              <div className="font-medium">{translateStatus(serviceOrder.status)}</div>
              <div className="text-sm text-muted-foreground">
                Status atual para todos os equipamentos
              </div>
            </div>
          </div>
          <Badge variant="outline">Atual</Badge>
        </div>

        {/* Detalhes por Equipamento (Collapsible) */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Detalhes por Equipamento
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-3">
            {equipmentProgress.map((equipment, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(equipment.isCompleted, equipment.progress)}
                    <span className="font-medium text-sm">{equipment.equipment}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getAttendanceTypeColor(equipment.attendanceType)}`}
                  >
                    {getAttendanceTypeLabel(equipment.attendanceType)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progresso Individual</span>
                    <span className="text-muted-foreground">{Math.round(equipment.progress)}%</span>
                  </div>
                  <Progress value={equipment.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <strong>Status:</strong> {translateStatus(equipment.currentStatus)}
                    {equipment.nextStatus && (
                      <>
                        <br />
                        <strong>Próximo:</strong> {translateStatus(equipment.nextStatus)}
                      </>
                    )}
                  </div>

                  {equipment.nextStatus && !equipment.isCompleted && (
                    <button
                      onClick={() => {
                        // TODO: Implementar avanço individual de equipamento
                        console.log(`Avançar equipamento ${equipment.equipment} para ${equipment.nextStatus}`);
                      }}
                      className="text-xs bg-[#e5b034] text-white px-2 py-1 rounded hover:bg-[#d4a02a] transition-colors ml-2"
                    >
                      Avançar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Aviso sobre Fluxos Diferentes */}
        {!allSameType && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Este pedido contém equipamentos com diferentes tipos de atendimento. 
                Cada equipamento pode ter fluxos de trabalho específicos. Verifique os detalhes individuais acima.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultipleEquipmentProgressTracker;
