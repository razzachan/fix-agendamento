import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types';
import { getServiceFlow } from '@/utils/serviceFlowUtils';
import { useAppData } from '@/hooks/useAppData';
import { toast } from 'sonner';
import { NotificationTriggers } from '@/services/notifications/notificationTriggers';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface StatusChangeButtonProps {
  order: ServiceOrder;
  onOrderUpdated: (updatedOrder: ServiceOrder) => void;
}

const StatusChangeButton: React.FC<StatusChangeButtonProps> = ({ order, onOrderUpdated }) => {
  const { updateServiceOrder } = useAppData();
  const [isUpdating, setIsUpdating] = useState(false);
  const notificationTriggers = new NotificationTriggers();

  // Validate and ensure proper attendance type
  const attendanceType = order.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Get the service flow based on the validated attendance type
  const serviceFlow = getServiceFlow(validType);

  // Show all statuses (like in the main listing), not just filtered ones
  const availableStatuses = serviceFlow;

  const handleUpdateStatus = async (newStatus: string) => {
    console.log(`🔄 [StatusChangeButton] INICIANDO - handleUpdateStatus: ${order.status} → ${newStatus} para ordem ${order.id}`);

    // VALIDAÇÕES ROBUSTAS
    if (isUpdating) {
      console.log(`⏳ [StatusChangeButton] Já está atualizando, ignorando`);
      return;
    }

    if (newStatus === order.status) {
      console.log(`ℹ️ [StatusChangeButton] Status já é ${newStatus}, nada a fazer`);
      return;
    }

    if (!updateServiceOrder) {
      console.error(`❌ [StatusChangeButton] updateServiceOrder não disponível`);
      toast.error('Função de atualização não disponível');
      return;
    }

    setIsUpdating(true);

    try {
      console.log(`🔄 [StatusChangeButton] EXECUTANDO - Chamando updateServiceOrder...`);

      // SISTEMA ROBUSTO - Múltiplas tentativas de atualização
      let success = false;
      let lastError = null;

      // Tentativa 1: Atualização normal
      try {
        success = await updateServiceOrder(order.id, { status: newStatus });
        console.log(`✅ [StatusChangeButton] Tentativa 1 - Resultado:`, success);
      } catch (error1) {
        console.error(`❌ [StatusChangeButton] Tentativa 1 falhou:`, error1);
        lastError = error1;

        // Tentativa 2: Aguardar e tentar novamente
        try {
          console.log(`🔄 [StatusChangeButton] Tentativa 2 - Aguardando 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          success = await updateServiceOrder(order.id, { status: newStatus });
          console.log(`✅ [StatusChangeButton] Tentativa 2 - Resultado:`, success);
        } catch (error2) {
          console.error(`❌ [StatusChangeButton] Tentativa 2 falhou:`, error2);
          lastError = error2;

          // Tentativa 3: REMOVIDA - Não usar atualização direta no banco
          // Isso bypassa o sistema de notificações automáticas
          console.error(`❌ [StatusChangeButton] Todas as tentativas falharam - não usando fallback direto no banco`);
          console.error(`❌ [StatusChangeButton] Último erro:`, lastError);
        }
      }

      if (success) {
        const updatedOrder = {
          ...order,
          status: newStatus
        };

        const nextStep = serviceFlow.find(step => step.status === newStatus);
        toast.success(`Status atualizado para: ${nextStep?.label || newStatus}`);

        console.log(`✅ [StatusChangeButton] Status atualizado com sucesso, chamando onOrderUpdated`);

        // Notificação será criada automaticamente pelo useServiceOrdersData

        onOrderUpdated(updatedOrder);
      } else {
        console.error(`❌ [StatusChangeButton] Todas as tentativas falharam. Último erro:`, lastError);
        toast.error('Não foi possível atualizar o status após múltiplas tentativas.');
      }
    } catch (error) {
      console.error('❌ [StatusChangeButton] Erro geral ao atualizar status:', error);
      toast.error(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUpdating(false);
      console.log(`🏁 [StatusChangeButton] FINALIZANDO - handleUpdateStatus concluído`);
    }
  };

  // Always show the dropdown, even if current status is selected (it will be disabled)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isUpdating}>
          {isUpdating ? 'Atualizando...' : 'Alterar Status'} <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status.key}
            onSelect={() => handleUpdateStatus(status.status)}
            disabled={order.status === status.status}
            className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer
              ${order.status === status.status ? 'bg-muted' : 'hover:bg-primary/5'}`}
          >
            <div className="flex items-center gap-2">
              <span>{status.icon}</span>
              <span>{status.label}</span>
            </div>
            {order.status === status.status && (
              <span className="text-xs text-muted-foreground">Atual</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusChangeButton;
