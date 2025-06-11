import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ServiceOrder } from '@/types';
import { getServiceFlow, getNextStatus, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  MessageSquare,
  Truck,
  Wrench,
  Home,
  Package
} from "lucide-react";
import { toast } from 'sonner';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface StatusUpdateCardProps {
  serviceOrder: ServiceOrder;
  onStatusUpdate: (orderId: string, newStatus: string, notes?: string) => Promise<void>;
}

const StatusUpdateCard: React.FC<StatusUpdateCardProps> = ({ 
  serviceOrder, 
  onStatusUpdate 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Obter o fluxo de serviço baseado no tipo de atendimento
  const serviceFlow = getServiceFlow(validType);
  const currentStepIndex = getCurrentStepIndex(serviceOrder.status, validType);
  const nextStatus = getNextStatus(serviceOrder.status, validType);
  
  // Calcular progresso
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

  // Obter informações do status atual e próximo
  const currentStep = serviceFlow.find(step => step.status === serviceOrder.status);
  const nextStep = nextStatus ? serviceFlow.find(step => step.status === nextStatus) : null;

  // Ícone do tipo de atendimento
  const getAttendanceIcon = () => {
    switch (validType) {
      case 'em_domicilio':
        return <Home className="h-4 w-4" />;
      case 'coleta_conserto':
        return <Package className="h-4 w-4" />;
      case 'coleta_diagnostico':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Label do tipo de atendimento
  const getAttendanceLabel = () => {
    switch (validType) {
      case 'em_domicilio':
        return 'Em Domicílio';
      case 'coleta_conserto':
        return 'Coleta Conserto';
      case 'coleta_diagnostico':
        return 'Coleta Diagnóstico';
      default:
        return 'Não especificado';
    }
  };

  // Cor do status
  const getStatusColor = (status: string) => {
    const step = serviceFlow.find(s => s.status === status);
    return step?.color || 'gray';
  };

  // Avançar para próximo status
  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(serviceOrder.id, nextStatus, notes || undefined);
      toast.success('Status atualizado com sucesso!');
      setNotes('');
      setShowNotes(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getAttendanceIcon()}
            <DisplayNumber item={serviceOrder} variant="inline" size="md" showIcon={false} />
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getAttendanceIcon()}
            {getAttendanceLabel()}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="font-semibold">{serviceOrder.clientName}</div>
          <div className="text-sm text-muted-foreground">
            {serviceOrder.equipment || 'Equipamento não especificado'}
          </div>
          <div className="text-sm text-muted-foreground">
            {serviceOrder.problem}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status atual */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-${getStatusColor(serviceOrder.status)}-500`} />
            <div>
              <div className="font-medium">{currentStep?.label || serviceOrder.status}</div>
              <div className="text-sm text-muted-foreground">
                {currentStep?.description || 'Status atual'}
              </div>
            </div>
          </div>
          <Badge variant="outline">Atual</Badge>
        </div>

        {/* Próximo status */}
        {nextStep && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border-2 border-dashed border-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-${getStatusColor(nextStep.status)}-500`} />
                <div>
                  <div className="font-medium">{nextStep.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {nextStep.description}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Botão para adicionar notas */}
            {!showNotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(true)}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Adicionar observações (opcional)
              </Button>
            )}

            {/* Campo de notas */}
            {showNotes && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione observações sobre esta etapa (opcional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNotes(false);
                      setNotes('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Botão de avançar */}
            <Button
              onClick={handleAdvanceStatus}
              disabled={isUpdating}
              className="w-full"
              size="lg"
            >
              {isUpdating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Avançar para: {nextStep.label}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Status final */}
        {!nextStep && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="font-medium text-green-800">Ordem Finalizada</div>
            <div className="text-sm text-green-600">
              Esta ordem de serviço foi concluída
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusUpdateCard;
