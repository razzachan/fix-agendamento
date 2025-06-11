import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ServiceOrder } from '@/types';
import { getServiceFlow, isCompletionStatus } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/statusMapping';
import { serviceOrderWarrantyIntegration } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { RequiredActionModal } from '@/components/ServiceOrders/RequiredActions/RequiredActionModal';
import { getRequiredActionConfig, requiresActions } from '@/config/requiredActionsConfig';
import { saveRequiredActions } from '@/services/requiredActions/requiredActionsService';
import { CompletedAction } from '@/types/requiredActions';
import { useAuth } from '@/contexts/auth/AuthContext';
import { RevertStatusButton } from './RevertStatusButton';
import { WorkshopSelectionModal } from '@/components/ServiceOrders/WorkshopSelection/WorkshopSelectionModal';
import { serviceOrderWorkshopService } from '@/services/serviceOrder/serviceOrderWorkshopService';
import { StatusAdvanceDialog } from '@/components/technician/StatusAdvanceDialog';
import { ServiceCompletionDialog } from '@/components/technician/ServiceCompletionDialog';
import { PaymentStageService } from '@/services/payments/paymentStageService';
import { CheckinService } from '@/services/checkinService';
import { CustomerRatingService } from '@/services/customerRatingService';

interface NextStatusButtonProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (serviceOrderId: string, status: string, notes?: string) => Promise<boolean>;
}

const NextStatusButton: React.FC<NextStatusButtonProps> = ({ serviceOrder, onUpdateStatus }) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [showRequiredActions, setShowRequiredActions] = useState(false);
  const [requiredActionConfig, setRequiredActionConfig] = useState<any>(null);
  const [showWorkshopSelection, setShowWorkshopSelection] = useState(false);
  const [showStatusAdvanceDialog, setShowStatusAdvanceDialog] = useState(false);
  const [showServiceCompletionDialog, setShowServiceCompletionDialog] = useState(false);

  // Debug: Monitorar mudanças de estado
  useEffect(() => {
    console.log('🎯 [NextStatusButton] Estado atualizado:', { showRequiredActions, hasConfig: !!requiredActionConfig });
  }, [showRequiredActions, requiredActionConfig]);

  // Validar e garantir um tipo de atendimento válido
  const attendanceType = serviceOrder.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";

  // Obter o fluxo de serviço com base no tipo de atendimento
  const serviceFlow = getServiceFlow(validType);
  const currentStatusIndex = serviceFlow.findIndex(step => step.status === serviceOrder.status);

  // Encontrar o próximo status no fluxo
  const getNextStatus = (): string | null => {
    if (currentStatusIndex === -1 || currentStatusIndex === serviceFlow.length - 1) {
      return null;
    }
    return serviceFlow[currentStatusIndex + 1].status;
  };

  const nextStatus = getNextStatus();
  const nextStep = nextStatus ? serviceFlow.find(step => step.status === nextStatus) : null;

  // Verificar se o próximo status requer notas adicionais
  const requiresNotes = (status: string): boolean => {
    // Status que requerem notas adicionais
    const statusesRequiringNotes = [
      'diagnosis_completed', // Diagnóstico concluído (precisa de detalhes)
      'cancelled'            // Cancelado (precisa do motivo)
      // 'payment_pending' removido - agora é tratado pelo sistema de pagamentos por etapas
    ];

    return statusesRequiringNotes.includes(status);
  };

  // Verificar se precisa do novo dialog de pagamento por etapas
  const requiresPaymentStageDialog = async (currentStatus: string, nextStatus: string): Promise<boolean> => {
    const serviceOrderForPayment = {
      id: serviceOrder.id,
      service_attendance_type: validType,
      final_cost: serviceOrder.finalCost || 0,
      status: currentStatus
    };

    // Verificar se há configuração de pagamento para esta transição
    let hasPaymentConfig = false;

    if (nextStatus === 'collected' || nextStatus === 'collected_for_diagnosis') {
      const collectionConfig = PaymentStageService.calculateCollectionPayment(serviceOrderForPayment);
      console.log('🎯 [NextStatusButton] Verificando pagamento na coleta:', {
        serviceType: validType,
        nextStatus,
        config: collectionConfig,
        hasConfig: !!collectionConfig
      });
      hasPaymentConfig = !!collectionConfig;
    } else if (nextStatus === 'completed' || nextStatus === 'delivered') {
      if (validType === 'em_domicilio') {
        hasPaymentConfig = !!PaymentStageService.calculateFullPayment(serviceOrderForPayment);
      } else {
        const config = await PaymentStageService.calculateDeliveryPayment(serviceOrderForPayment);
        hasPaymentConfig = !!config;
      }
    } else if (nextStatus === 'payment_pending') {
      // payment_pending só para tipos que não são em domicílio
      if (validType !== 'em_domicilio') {
        const config = await PaymentStageService.calculateDeliveryPayment(serviceOrderForPayment);
        hasPaymentConfig = !!config;
      }
    }

    return hasPaymentConfig;
  };

  const handleUpdateStatus = async () => {
    console.log('🎯 [NextStatusButton] ===== INÍCIO handleUpdateStatus =====');

    if (!nextStatus || isUpdating) {
      console.log('🎯 [NextStatusButton] Saindo early - nextStatus:', nextStatus, 'isUpdating:', isUpdating);
      return;
    }

    console.log('🎯 [NextStatusButton] handleUpdateStatus iniciado:', {
      currentStatus: serviceOrder.status,
      nextStatus,
      serviceType: validType
    });

    // Verificar se está indo para "Na Oficina" - precisa selecionar oficina primeiro
    if (nextStatus === 'at_workshop') {
      console.log('🎯 [NextStatusButton] Transição para oficina - abrindo seleção de oficina');
      setShowWorkshopSelection(true);
      return;
    }

    // Verificar se está indo para "completed" - usar dialog de conclusão com estoque
    if (nextStatus === 'completed') {
      console.log('🎯 [NextStatusButton] Transição para conclusão - abrindo dialog de conclusão com estoque');
      setShowServiceCompletionDialog(true);
      return;
    }

    // Verificar se precisa do novo dialog de pagamento por etapas
    console.log('🎯 [NextStatusButton] Verificando se precisa de pagamento...');
    const needsPaymentDialog = await requiresPaymentStageDialog(serviceOrder.status, nextStatus);
    console.log('🎯 [NextStatusButton] Resultado da verificação de pagamento:', needsPaymentDialog);

    if (needsPaymentDialog) {
      console.log('🎯 [NextStatusButton] Transição requer pagamento por etapas - abrindo dialog avançado');
      setShowStatusAdvanceDialog(true);
      return;
    }

    // Verificar se esta transição requer ações obrigatórias
    const actionConfig = getRequiredActionConfig(serviceOrder.status, nextStatus, validType);

    if (actionConfig) {
      console.log('🎯 Transição requer ações obrigatórias:', actionConfig.title);
      console.log('🎯 [NextStatusButton] Configurando modal:', { actionConfig, showRequiredActions });
      setRequiredActionConfig(actionConfig);
      setShowRequiredActions(true);
      console.log('🎯 [NextStatusButton] Modal configurado, showRequiredActions:', true);
      return;
    }

    // Se o próximo status requer notas e não estamos no diálogo, abrir o diálogo
    if (requiresNotes(nextStatus) && !isDialogOpen) {
      setIsDialogOpen(true);
      return;
    }

    await executeStatusUpdate();
  };

  const executeStatusUpdate = async (completedActions?: CompletedAction[], skipped?: boolean, skipReason?: string) => {
    if (!nextStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      console.log(`NextStatusButton: Atualizando ordem ${serviceOrder.id} para status: ${nextStatus}`);
      console.log(`Notas adicionais: ${notes || 'Nenhuma'}`);

      // 🎯 CHECK-IN AUTOMÁTICO: Se está indo para "in_progress", fazer check-in
      if (nextStatus === 'in_progress' && user?.id) {
        try {
          console.log('🎯 [NextStatusButton] Fazendo check-in automático...');
          await CheckinService.checkin(serviceOrder.id, user.id);
          console.log('✅ [NextStatusButton] Check-in automático realizado com sucesso');
        } catch (error) {
          console.warn('⚠️ [NextStatusButton] Erro no check-in automático (continuando):', error);
          // Não bloquear a atualização de status se check-in falhar
        }
      }

      // 🎯 CHECK-OUT AUTOMÁTICO: Se está saindo de "in_progress", fazer check-out
      if (serviceOrder.status === 'in_progress' && nextStatus !== 'in_progress' && user?.id) {
        try {
          console.log('🎯 [NextStatusButton] Fazendo check-out automático...');
          const activeCheckin = await CheckinService.getActiveCheckin(serviceOrder.id, user.id);
          if (activeCheckin) {
            await CheckinService.checkout(activeCheckin.id);
            console.log('✅ [NextStatusButton] Check-out automático realizado com sucesso');
          }
        } catch (error) {
          console.warn('⚠️ [NextStatusButton] Erro no check-out automático (continuando):', error);
          // Não bloquear a atualização de status se check-out falhar
        }
      }

      // Salvar ações obrigatórias se houver
      if (completedActions && user?.id) {
        await saveRequiredActions(
          serviceOrder.id,
          serviceOrder.status,
          nextStatus,
          completedActions,
          user.id,
          skipped,
          skipReason
        );
        console.log('✅ Ações obrigatórias salvas com sucesso');
      }

      const success = await onUpdateStatus(serviceOrder.id, nextStatus, notes);

      if (success) {
        toast.success(`Status atualizado para: ${nextStep?.label || translateStatus(nextStatus)}`);
        setIsDialogOpen(false);
        setShowRequiredActions(false);
        setNotes('');

        // Verificar se deve ativar a garantia automaticamente
        if (isCompletionStatus(nextStatus) &&
            serviceOrderWarrantyIntegration.shouldActivateWarranty(serviceOrder, nextStatus)) {
          try {
            console.log(`Tentando ativar garantia automaticamente para ordem ${serviceOrder.id}`);
            const warrantyActivated = await serviceOrderWarrantyIntegration.activateWarrantyOnCompletion({
              ...serviceOrder,
              status: nextStatus // Atualizar o status para o novo status
            });

            if (warrantyActivated) {
              toast.success('Garantia ativada automaticamente!');
            }
          } catch (warrantyError) {
            console.error('Erro ao ativar garantia automaticamente:', warrantyError);
            // Não exibir erro para o usuário, pois a atualização de status foi bem-sucedida
          }
        }

        // 🎯 SOLICITAR AVALIAÇÃO: Se ordem foi concluída, solicitar avaliação do cliente
        if (isCompletionStatus(nextStatus)) {
          try {
            console.log('🎯 [NextStatusButton] Solicitando avaliação do cliente...');
            await CustomerRatingService.requestRating(serviceOrder.id);
            console.log('✅ [NextStatusButton] Solicitação de avaliação enviada');
          } catch (error) {
            console.warn('⚠️ [NextStatusButton] Erro ao solicitar avaliação (continuando):', error);
            // Não bloquear a conclusão se avaliação falhar
          }
        }
      } else {
        toast.error('Não foi possível atualizar o status.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do serviço.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequiredActionsComplete = async (actions: CompletedAction[], skipped: boolean, skipReason?: string) => {
    console.log('🎯 Ações obrigatórias completadas:', { actions: actions.length, skipped, skipReason });
    await executeStatusUpdate(actions, skipped, skipReason);
  };

  const handleWorkshopConfirm = async (workshopId: string, workshopName: string) => {
    console.log('🎯 [NextStatusButton] Oficina selecionada:', { workshopId, workshopName });

    setIsUpdating(true);
    try {
      // Primeiro, associar a oficina à ordem de serviço
      const workshopAssigned = await serviceOrderWorkshopService.assignWorkshop(
        serviceOrder.id,
        workshopId,
        workshopName
      );

      if (!workshopAssigned) {
        toast.error('Erro ao associar oficina à ordem de serviço.');
        return;
      }

      // Depois, atualizar o status para "Na Oficina"
      const success = await onUpdateStatus(serviceOrder.id, 'at_workshop', `Equipamento enviado para oficina: ${workshopName}`);

      if (success) {
        toast.success(`Equipamento enviado para oficina: ${workshopName}`);
        setShowWorkshopSelection(false);
      } else {
        toast.error('Não foi possível atualizar o status.');
      }
    } catch (error) {
      console.error('❌ Erro ao processar seleção de oficina:', error);
      toast.error('Erro ao processar seleção de oficina.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleServiceCompletionSuccess = async () => {
    console.log('🎯 [NextStatusButton] Serviço concluído com sucesso via dialog de conclusão');

    // O ServiceCompletionDialog já consumiu o estoque, agora só precisamos atualizar o status
    setIsUpdating(true);
    try {
      const success = await onUpdateStatus(serviceOrder.id, 'completed', 'Serviço concluído com registro de estoque');

      if (success) {
        toast.success('Serviço finalizado com sucesso!');
        setShowServiceCompletionDialog(false);

        // Ativar garantia se necessário
        if (serviceOrderWarrantyIntegration.shouldActivateWarranty(serviceOrder, 'completed')) {
          try {
            console.log(`Tentando ativar garantia automaticamente para ordem ${serviceOrder.id}`);
            const warrantyActivated = await serviceOrderWarrantyIntegration.activateWarrantyOnCompletion({
              ...serviceOrder,
              status: 'completed'
            });

            if (warrantyActivated) {
              toast.success('Garantia ativada automaticamente!');
            }
          } catch (warrantyError) {
            console.error('Erro ao ativar garantia automaticamente:', warrantyError);
          }
        }

        // Solicitar avaliação do cliente
        try {
          console.log('🎯 [NextStatusButton] Solicitando avaliação do cliente...');
          await CustomerRatingService.requestRating(serviceOrder.id);
          console.log('✅ [NextStatusButton] Solicitação de avaliação enviada');
        } catch (error) {
          console.warn('⚠️ [NextStatusButton] Erro ao solicitar avaliação (continuando):', error);
        }
      } else {
        toast.error('Não foi possível finalizar o serviço.');
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar serviço:', error);
      toast.error('Erro ao finalizar serviço.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!nextStatus) return null;

  // Renderizar o botão diretamente se não precisar de notas adicionais
  if (!requiresNotes(nextStatus)) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-center">
          <Button
            onClick={() => {
              console.log('🎯 [NextStatusButton] ===== BOTÃO CLICADO =====');
              handleUpdateStatus();
            }}
            disabled={isUpdating}
            className="mt-2 w-full"
          >
            {isUpdating ? 'Atualizando...' : `Avançar para ${nextStep?.label || translateStatus(nextStatus)}`}
          </Button>
        </div>

        {/* Botão de Reverter */}
        <div className="flex justify-center">
          <RevertStatusButton
            serviceOrder={serviceOrder}
            onUpdateStatus={onUpdateStatus}
            isUpdating={isUpdating}
          />
        </div>

        {/* Modal de Ações Obrigatórias */}
        {console.log('🎯 [NextStatusButton] Verificando renderização (branch simples):', { showRequiredActions, hasConfig: !!requiredActionConfig, config: requiredActionConfig })}
        {showRequiredActions && requiredActionConfig ? (
          <>
            {console.log('🎯 [NextStatusButton] Renderizando RequiredActionModal (branch simples):', { showRequiredActions, config: requiredActionConfig?.title })}
            <RequiredActionModal
              isOpen={showRequiredActions}
              onClose={() => setShowRequiredActions(false)}
              config={requiredActionConfig}
              onComplete={handleRequiredActionsComplete}
              isLoading={isUpdating}
              serviceOrderId={serviceOrder.id}
            />
          </>
        ) : (
          console.log('🎯 [NextStatusButton] Modal NÃO renderizado (branch simples):', { showRequiredActions, hasConfig: !!requiredActionConfig })
        )}

        {/* Modal de Seleção de Oficina */}
        <WorkshopSelectionModal
          isOpen={showWorkshopSelection}
          onClose={() => setShowWorkshopSelection(false)}
          serviceOrder={serviceOrder}
          onConfirm={handleWorkshopConfirm}
          isLoading={isUpdating}
        />

        {/* Dialog Avançado de Status com Pagamento */}
        {nextStatus && (
          <StatusAdvanceDialog
            open={showStatusAdvanceDialog}
            onOpenChange={setShowStatusAdvanceDialog}
            serviceOrder={{
              id: serviceOrder.id,
              client_name: serviceOrder.clientName,
              equipment_type: serviceOrder.equipmentType,
              equipment_model: serviceOrder.equipmentModel,
              service_attendance_type: validType,
              status: serviceOrder.status,
              final_cost: serviceOrder.finalCost
            }}
            nextStatus={nextStatus}
            nextStatusLabel={nextStep?.label || translateStatus(nextStatus)}
            technicianId={user?.id || 'unknown'}
            technicianName={user?.name || 'Técnico'}
            onStatusUpdate={onUpdateStatus}
          />
        )}

        {/* Dialog de Conclusão de Serviço com Estoque */}
        <ServiceCompletionDialog
          open={showServiceCompletionDialog}
          onOpenChange={setShowServiceCompletionDialog}
          order={serviceOrder}
          onSuccess={handleServiceCompletionSuccess}
          onStockUpdate={() => {
            // Forçar atualização do cache de estoque
            console.log('🔄 Callback de atualização de estoque acionado');
            // Aqui podemos adicionar lógica específica se necessário
          }}
        />
      </div>
    );
  }

  // Renderizar o botão com diálogo para status que requerem notas
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-2 w-full">
              Avançar para {nextStep?.label || translateStatus(nextStatus)}
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
            <DialogDescription>
              Adicione informações adicionais para atualizar o status para {nextStep?.label || translateStatus(nextStatus)}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={getNotesPlaceholder(nextStatus)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating}
            >
              {isUpdating ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>

      {/* Botão de Reverter */}
      <div className="flex justify-center">
        <RevertStatusButton
          serviceOrder={serviceOrder}
          onUpdateStatus={onUpdateStatus}
          isUpdating={isUpdating}
        />
      </div>

      {/* Modal de Ações Obrigatórias */}
      {console.log('🎯 [NextStatusButton] Verificando renderização:', { showRequiredActions, hasConfig: !!requiredActionConfig, config: requiredActionConfig })}
      {showRequiredActions && requiredActionConfig ? (
        <>
          {console.log('🎯 [NextStatusButton] Renderizando RequiredActionModal:', { showRequiredActions, config: requiredActionConfig?.title })}
          <RequiredActionModal
            isOpen={showRequiredActions}
            onClose={() => setShowRequiredActions(false)}
            config={requiredActionConfig}
            onComplete={handleRequiredActionsComplete}
            isLoading={isUpdating}
            serviceOrderId={serviceOrder.id}
          />
        </>
      ) : (
        console.log('🎯 [NextStatusButton] Modal NÃO renderizado:', { showRequiredActions, hasConfig: !!requiredActionConfig })
      )}

      {/* Modal de Seleção de Oficina */}
      <WorkshopSelectionModal
        isOpen={showWorkshopSelection}
        onClose={() => setShowWorkshopSelection(false)}
        serviceOrder={serviceOrder}
        onConfirm={handleWorkshopConfirm}
        isLoading={isUpdating}
      />

      {/* Dialog Avançado de Status com Pagamento */}
      {nextStatus && (
        <StatusAdvanceDialog
          open={showStatusAdvanceDialog}
          onOpenChange={setShowStatusAdvanceDialog}
          serviceOrder={{
            id: serviceOrder.id,
            client_name: serviceOrder.clientName,
            equipment_type: serviceOrder.equipmentType,
            equipment_model: serviceOrder.equipmentModel,
            service_attendance_type: validType,
            status: serviceOrder.status,
            final_cost: serviceOrder.finalCost
          }}
          nextStatus={nextStatus}
          nextStatusLabel={nextStep?.label || translateStatus(nextStatus)}
          technicianId={user?.id || 'unknown'}
          technicianName={user?.name || 'Técnico'}
          onStatusUpdate={onUpdateStatus}
        />
      )}

      {/* Dialog de Conclusão de Serviço com Estoque */}
      <ServiceCompletionDialog
        open={showServiceCompletionDialog}
        onOpenChange={setShowServiceCompletionDialog}
        order={serviceOrder}
        onSuccess={handleServiceCompletionSuccess}
        onStockUpdate={() => {
          // Forçar atualização do cache de estoque
          console.log('🔄 Callback de atualização de estoque acionado');
          // Aqui podemos adicionar lógica específica se necessário
        }}
      />
    </div>
  );
};

// Função auxiliar para obter o placeholder adequado para cada tipo de status
function getNotesPlaceholder(status: string): string {
  switch (status) {
    case 'diagnosis_completed':
      return 'Descreva o diagnóstico realizado, problemas encontrados e recomendações...';
    case 'payment_pending':
      return 'Informe os detalhes do pagamento (valor, forma de pagamento, etc.)...';
    case 'cancelled':
      return 'Informe o motivo do cancelamento...';
    default:
      return 'Adicione observações sobre esta atualização de status...';
  }
}

export { NextStatusButton };

export default NextStatusButton;
