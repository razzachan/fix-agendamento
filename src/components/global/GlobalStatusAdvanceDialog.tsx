import React from 'react';
import { createPortal } from 'react-dom';
import { useStatusDialog } from '@/contexts/StatusDialogContext';
import { StatusAdvanceDialog } from '@/components/technician/StatusAdvanceDialog';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/contexts/auth/AuthContext';
import { toast } from 'sonner';

export const GlobalStatusAdvanceDialog: React.FC = () => {
  const { showStatusAdvanceDialog, setShowStatusAdvanceDialog, serviceOrderId } = useStatusDialog();
  const { serviceOrders, updateServiceOrder } = useAppData();
  const { user } = useAuth();

  console.log('🎯 [GlobalStatusAdvanceDialog] Renderizando:', { showStatusAdvanceDialog, serviceOrderId });

  if (!showStatusAdvanceDialog || !serviceOrderId) {
    return null;
  }

  // Encontrar a ordem de serviço
  const serviceOrder = serviceOrders.find(order => order.id === serviceOrderId);
  if (!serviceOrder) {
    console.error('🎯 [GlobalStatusAdvanceDialog] Ordem de serviço não encontrada:', serviceOrderId);
    return null;
  }

  // Calcular próximo status (lógica simplificada para coleta diagnóstico)
  const nextStatus = 'collected_for_diagnosis';
  const nextStatusLabel = 'Coletado para Diagnóstico';

  const handleStatusUpdate = async (orderId: string, status: string, notes?: string): Promise<boolean> => {
    console.log('🎯 [GlobalStatusAdvanceDialog] === INÍCIO DA ATUALIZAÇÃO ===');
    console.log('🎯 [GlobalStatusAdvanceDialog] Parâmetros recebidos:', { orderId, status, notes });
    console.log('🎯 [GlobalStatusAdvanceDialog] updateServiceOrder disponível:', !!updateServiceOrder);
    console.log('🎯 [GlobalStatusAdvanceDialog] Tipo de updateServiceOrder:', typeof updateServiceOrder);

    try {
      // Verificar se a função existe antes de chamar
      if (!updateServiceOrder) {
        console.error('❌ [GlobalStatusAdvanceDialog] updateServiceOrder não está disponível!');
        toast.error('Função de atualização não disponível');
        return false;
      }

      // Preparar dados de atualização - VERSÃO SIMPLIFICADA PARA TESTE
      const updateData: any = { status: status as any };
      if (notes) {
        updateData.notes = notes;
      }

      console.log('🎯 [GlobalStatusAdvanceDialog] Dados preparados para atualização:', updateData);
      console.log('🎯 [GlobalStatusAdvanceDialog] Executando updateServiceOrder...');

      // Atualizar no banco de dados
      const success = await updateServiceOrder(orderId, updateData);

      console.log('🎯 [GlobalStatusAdvanceDialog] Resultado do updateServiceOrder:', success);
      console.log('🎯 [GlobalStatusAdvanceDialog] Tipo do resultado:', typeof success);

      if (success) {
        console.log('✅ [GlobalStatusAdvanceDialog] Status atualizado com sucesso no banco');
        toast.success(`Status atualizado para: ${nextStatusLabel}`);

        // Fechar o dialog primeiro
        setShowStatusAdvanceDialog(false);

        // Forçar refresh da página para garantir que os dados sejam atualizados
        console.log('🔄 [GlobalStatusAdvanceDialog] Forçando refresh da página...');
        setTimeout(() => {
          window.location.reload();
        }, 500);

        return true;
      } else {
        console.error('❌ [GlobalStatusAdvanceDialog] updateServiceOrder retornou false');
        toast.error('Erro ao atualizar status da ordem de serviço');
        return false;
      }
    } catch (error) {
      console.error('❌ [GlobalStatusAdvanceDialog] Erro capturado:', error);
      console.error('❌ [GlobalStatusAdvanceDialog] Stack trace:', error?.stack);
      console.error('❌ [GlobalStatusAdvanceDialog] Mensagem do erro:', error?.message);
      toast.error('Erro ao atualizar status da ordem de serviço');
      return false;
    }
  };

  // Função para atualização direta (bypass do fluxo de pagamento)
  const handleDirectStatusUpdate = async () => {
    console.log('🎯 [GlobalStatusAdvanceDialog] === ATUALIZAÇÃO DIRETA ===');
    const success = await handleStatusUpdate(serviceOrder.id, nextStatus);
    if (success) {
      console.log('✅ [GlobalStatusAdvanceDialog] Atualização direta bem-sucedida');
    }
  };

  return (
    <StatusAdvanceDialog
      open={showStatusAdvanceDialog}
      onOpenChange={setShowStatusAdvanceDialog}
      serviceOrder={{
        id: serviceOrder.id,
        order_number: serviceOrder.orderNumber,
        client_name: serviceOrder.clientName,
        equipment_type: serviceOrder.equipmentType,
        equipment_model: serviceOrder.equipmentModel,
        equipment_serial: serviceOrder.equipmentSerial,
        service_attendance_type: serviceOrder.serviceAttendanceType as any,
        status: serviceOrder.status,
        final_cost: serviceOrder.finalCost,
        pickup_address: serviceOrder.pickupAddress
      }}
      nextStatus={nextStatus}
      nextStatusLabel={nextStatusLabel}
      technicianId={user?.id || 'unknown'}
      technicianName={user?.name || 'Técnico'}
      onStatusUpdate={handleStatusUpdate}
    />
  );
};
