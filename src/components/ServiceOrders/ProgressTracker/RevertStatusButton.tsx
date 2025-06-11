import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { getPreviousStatus, getServiceFlow } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/statusMapping';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface RevertStatusButtonProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (orderId: string, newStatus: string, notes?: string) => Promise<boolean>;
  isUpdating?: boolean;
}

export const RevertStatusButton: React.FC<RevertStatusButtonProps> = ({
  serviceOrder,
  onUpdateStatus,
  isUpdating = false
}) => {
  const [isReverting, setIsReverting] = useState(false);

  console.log('🎯 [RevertStatusButton] Renderizando para ordem:', {
    id: serviceOrder.id,
    currentStatus: serviceOrder.status,
    attendanceType: serviceOrder.serviceAttendanceType
  });

  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Obter o fluxo de serviço e status anterior
  const serviceFlow = getServiceFlow(validType);
  const previousStatus = getPreviousStatus(serviceOrder.status, validType);
  const currentStatusIndex = serviceFlow.findIndex(step => step.status === serviceOrder.status);

  console.log('🎯 [RevertStatusButton] Análise de status:', {
    currentStatus: serviceOrder.status,
    previousStatus,
    currentIndex: currentStatusIndex,
    canRevert: !!previousStatus
  });

  // Se não há status anterior, não mostrar o botão
  if (!previousStatus || currentStatusIndex <= 0) {
    console.log('🎯 [RevertStatusButton] Não pode reverter - primeiro status ou status inválido');
    return null;
  }

  // Encontrar o passo anterior no fluxo
  const previousStep = serviceFlow.find(step => step.status === previousStatus);
  const currentStep = serviceFlow.find(step => step.status === serviceOrder.status);

  const handleRevert = async () => {
    if (!previousStatus || isReverting || isUpdating) return;

    setIsReverting(true);
    try {
      console.log(`🔄 [RevertStatusButton] Revertendo ordem ${serviceOrder.id} de ${serviceOrder.status} para ${previousStatus}`);
      
      const revertNotes = `Status revertido de "${currentStep?.label || serviceOrder.status}" para "${previousStep?.label || previousStatus}" pelo técnico`;
      
      const success = await onUpdateStatus(serviceOrder.id, previousStatus, revertNotes);

      if (success) {
        toast.success(`Status revertido para: ${previousStep?.label || translateStatus(previousStatus)}`);
        console.log('✅ [RevertStatusButton] Reversão realizada com sucesso');
      } else {
        toast.error('Não foi possível reverter o status.');
        console.error('❌ [RevertStatusButton] Falha na reversão');
      }
    } catch (error) {
      console.error('❌ [RevertStatusButton] Erro ao reverter status:', error);
      toast.error('Erro ao reverter status do serviço.');
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isReverting || isUpdating}
          className="mt-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isReverting ? 'Revertendo...' : `Reverter para ${previousStep?.label || translateStatus(previousStatus)}`}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Confirmar Reversão de Status
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a reverter o status desta ordem de serviço:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Ordem:</strong> #{serviceOrder.id}</p>
              <p><strong>Cliente:</strong> {serviceOrder.clientName}</p>
              <p><strong>Status atual:</strong> {currentStep?.label || translateStatus(serviceOrder.status)}</p>
              <p><strong>Reverter para:</strong> {previousStep?.label || translateStatus(previousStatus)}</p>
            </div>
            <p className="text-sm text-orange-600">
              ⚠️ Esta ação será registrada no histórico da ordem de serviço para auditoria.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevert}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={isReverting || isUpdating}
          >
            {isReverting ? 'Revertendo...' : 'Confirmar Reversão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
