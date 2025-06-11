
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceOrderStatus } from '@/types';
import { useServiceFlow } from '@/hooks/useServiceFlow';
import StatusDropdownItems from './components/StatusDropdownItems';
import StatusDropdownTrigger from './StatusComponents/StatusDropdownTrigger';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { translateStatus } from '@/utils/statusMapping';

interface StatusDropdownProps {
  status: ServiceOrderStatus;
  orderId: string;
  onUpdateStatus?: (id: string, status: ServiceOrderStatus) => Promise<void>;
  serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  status,
  orderId,
  onUpdateStatus,
  serviceAttendanceType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { serviceFlow } = useServiceFlow(serviceAttendanceType, status);



  const handleStatusClick = (newStatus: ServiceOrderStatus) => (e: React.MouseEvent) => {
    // CRÍTICO: Prevenir propagação IMEDIATAMENTE
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // VALIDAÇÕES ROBUSTAS
    if (!onUpdateStatus) {
      toast.error("Função de atualização não disponível");
      return;
    }

    if (isUpdating) {
      return;
    }

    if (status === newStatus) {
      return;
    }

    // Executar a atualização de forma assíncrona sem bloquear o evento
    (async () => {
      try {
        setIsUpdating(true);

        // Verify the status exists in the flow
        const statusExists = serviceFlow.some(step => step.status === newStatus);
        if (!statusExists) {
          console.error(`❌ [StatusDropdown] Status inválido ${newStatus} para tipo ${serviceAttendanceType}`);
          toast.error(`Status inválido: ${newStatus}`);
          return;
        }

        // Close dropdown first to improve UI responsiveness
        setIsOpen(false);

        // SISTEMA ROBUSTO - Tentar atualizar com tratamento de erro
        try {
          await onUpdateStatus(orderId, newStatus);

          // Se chegou até aqui, a atualização foi bem-sucedida
          toast.success(`Status atualizado para ${translateStatus(newStatus)}`);

      } catch (updateError) {
        // FALLBACK: Tentar notificar mesmo se a atualização falhou
        try {
          const { error: dbError } = await supabase
            .from('notifications')
            .insert({
              user_id: '00000000-0000-0000-0000-000000000001',
              title: `⚠️ Erro na Atualização de Status`,
              description: `Tentativa de alterar status da ordem #${orderId.substring(0, 8)} de "${status}" para "${newStatus}" falhou. Erro: ${updateError.message || 'Erro desconhecido'}. Tentativa em: ${new Date().toLocaleString('pt-BR')}`,
              type: 'error',
              read: false,
              time: new Date().toISOString()
            });
        } catch (notificationError) {
          console.error(`❌ [StatusDropdown] Erro ao criar notificação de erro:`, notificationError);
        }

        // Re-throw o erro para que seja tratado no catch principal
        throw updateError;
      }

      } catch (error) {
        toast.error(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setIsUpdating(false);
      }
    })(); // Fechar a IIFE
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger disabled={isUpdating} asChild>
        <div className="cursor-pointer">
          <StatusDropdownTrigger 
            status={status} 
            isUpdatingStatus={isUpdating} 
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 z-50">
        <StatusDropdownItems
          serviceFlow={serviceFlow}
          currentStatus={status}
          onStatusClick={handleStatusClick}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusDropdown;
