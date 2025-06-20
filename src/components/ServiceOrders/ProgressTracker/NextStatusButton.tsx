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
  relatedOrders?: ServiceOrder[];
}

const NextStatusButton: React.FC<NextStatusButtonProps> = ({ serviceOrder, onUpdateStatus, relatedOrders = [] }) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [showRequiredActions, setShowRequiredActions] = useState(false);
  const [requiredActionConfig, setRequiredActionConfig] = useState<any>(null);
  const [showWorkshopSelection, setShowWorkshopSelection] = useState(false);
  const [showStatusAdvanceDialog, setShowStatusAdvanceDialog] = useState(false);
  const [showServiceCompletionDialog, setShowServiceCompletionDialog] = useState(false);
  const [showBatchProgressionDialog, setShowBatchProgressionDialog] = useState(false);

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

  // Analisar ordens relacionadas para progressão em lote
  const analyzeRelatedOrders = () => {
    if (relatedOrders.length === 0) return null;

    const allOrders = [serviceOrder, ...relatedOrders];

    // Agrupar por status atual
    const statusGroups: { [status: string]: ServiceOrder[] } = {};
    allOrders.forEach(order => {
      if (!statusGroups[order.status]) {
        statusGroups[order.status] = [];
      }
      statusGroups[order.status].push(order);
    });

    // Verificar quantas ordens podem avançar para o mesmo próximo status
    const canAdvanceToSameStatus = allOrders.filter(order => {
      const orderAttendanceType = order.serviceAttendanceType || "em_domicilio";
      const orderValidType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(orderAttendanceType)
        ? orderAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
        : "em_domicilio";

      const orderServiceFlow = getServiceFlow(orderValidType);
      const orderCurrentStatusIndex = orderServiceFlow.findIndex(step => step.status === order.status);
      const orderNextStatus = orderCurrentStatusIndex !== -1 && orderCurrentStatusIndex < orderServiceFlow.length - 1
        ? orderServiceFlow[orderCurrentStatusIndex + 1].status
        : null;

      return orderNextStatus === nextStatus;
    });

    // Para progressão em lote, incluir TODAS as ordens que podem avançar
    // A validação será feita no momento da execução, não na filtragem
    const canBatchProcess = canAdvanceToSameStatus;

    return {
      totalOrders: allOrders.length,
      statusGroups,
      canAdvanceToSameStatus: canAdvanceToSameStatus.length,
      canBatchProcess: canBatchProcess.length,
      ordersToAdvance: canBatchProcess, // Usar apenas as que podem ser processadas em lote
      nextStatus,
      nextStatusLabel: translateStatus(nextStatus)
    };
  };

  const batchAnalysis = analyzeRelatedOrders();

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
          {/* Botão principal - sempre individual */}
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

        {/* Botão de progressão em lote (se aplicável) */}
        {batchAnalysis && batchAnalysis.canAdvanceToSameStatus > 1 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowBatchProgressionDialog(true)}
              disabled={isUpdating}
              className="w-full text-[#e5b034] border-[#e5b034] hover:bg-[#e5b034]/10"
            >
              Processar {batchAnalysis.canAdvanceToSameStatus} Ordens em Lote
              <span className="text-xs ml-1">
                (com validações individuais)
              </span>
            </Button>
          </div>
        )}

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
              order_number: serviceOrder.orderNumber, // ✅ Incluir order_number
              client_name: serviceOrder.clientName,
              equipment_type: serviceOrder.equipmentType,
              equipment_model: serviceOrder.equipmentModel,
              equipment_serial: serviceOrder.equipmentSerial,
              service_attendance_type: validType,
              status: serviceOrder.status,
              final_cost: serviceOrder.finalCost,
              pickup_address: serviceOrder.pickupAddress
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

        {/* Dialog de Progressão em Lote */}
        {batchAnalysis && (
          <Dialog open={showBatchProgressionDialog} onOpenChange={setShowBatchProgressionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Progressão em Lote</DialogTitle>
                <DialogDescription>
                  Avançar múltiplas ordens do mesmo endereço simultaneamente
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">
                    🎯 Processamento em Lote Inteligente
                  </h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Cada ordem será processada individualmente com todas as validações necessárias:
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Confirmações de pagamento (se necessário)</li>
                    <li>• Fotos obrigatórias (se necessário)</li>
                    <li>• Seleções de oficina (se necessário)</li>
                    <li>• Outras validações específicas</li>
                  </ul>
                  <p className="text-sm font-medium text-amber-900 mt-3">
                    {batchAnalysis.canAdvanceToSameStatus} ordens serão processadas para: {nextStep?.label || translateStatus(nextStatus)}
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-gray-700">Ordens que serão processadas:</h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchAnalysis.ordersToAdvance.map(order => (
                      <div key={order.id} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">OS #{order.id.slice(-8)}</span> - {order.equipmentType} {order.equipmentModel}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBatchProgressionDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    console.log('🎯 [NextStatusButton] Iniciando processamento em lote inteligente...');
                    setIsUpdating(true);
                    setShowBatchProgressionDialog(false);

                    try {
                      let successCount = 0;
                      let skippedCount = 0;
                      const results: { orderId: string; success: boolean; reason?: string }[] = [];

                      for (const order of batchAnalysis.ordersToAdvance) {
                        try {
                          console.log(`🔄 Processando ordem ${order.id}...`);

                          // Simular a mesma lógica do handleUpdateStatus individual
                          const orderAttendanceType = order.serviceAttendanceType || "em_domicilio";
                          const orderValidType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(orderAttendanceType)
                            ? orderAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
                            : "em_domicilio";

                          // Verificar se precisa de seleção de oficina
                          if (nextStatus === 'at_workshop') {
                            console.log(`⚠️ Ordem ${order.id} requer seleção de oficina - pulando`);
                            results.push({ orderId: order.id, success: false, reason: 'Requer seleção de oficina' });
                            skippedCount++;
                            continue;
                          }

                          // Verificar se precisa de dialog de conclusão com estoque
                          if (nextStatus === 'completed') {
                            console.log(`⚠️ Ordem ${order.id} requer dialog de conclusão - pulando`);
                            results.push({ orderId: order.id, success: false, reason: 'Requer dialog de conclusão' });
                            skippedCount++;
                            continue;
                          }

                          // Verificar se precisa de pagamento por etapas
                          const orderForPayment = {
                            id: order.id,
                            service_attendance_type: orderValidType,
                            final_cost: order.finalCost || 0,
                            status: order.status
                          };

                          // Verificar se precisa de pagamento por etapas (usando a mesma lógica do handleUpdateStatus)
                          let needsPaymentDialog = false;

                          if (nextStatus === 'collected' || nextStatus === 'collected_for_diagnosis') {
                            const collectionConfig = PaymentStageService.calculateCollectionPayment(orderForPayment);
                            needsPaymentDialog = !!collectionConfig;
                          } else if (nextStatus === 'completed' || nextStatus === 'delivered') {
                            if (orderValidType === 'em_domicilio') {
                              needsPaymentDialog = !!PaymentStageService.calculateFullPayment(orderForPayment);
                            } else {
                              const config = await PaymentStageService.calculateDeliveryPayment(orderForPayment);
                              needsPaymentDialog = !!config;
                            }
                          } else if (nextStatus === 'payment_pending') {
                            if (orderValidType !== 'em_domicilio') {
                              const config = await PaymentStageService.calculateDeliveryPayment(orderForPayment);
                              needsPaymentDialog = !!config;
                            }
                          }
                          if (needsPaymentDialog) {
                            console.log(`⚠️ Ordem ${order.id} requer confirmação de pagamento - pulando`);
                            results.push({ orderId: order.id, success: false, reason: 'Requer confirmação de pagamento' });
                            skippedCount++;
                            continue;
                          }

                          // Verificar se requer ações obrigatórias
                          const actionConfig = getRequiredActionConfig(order.status, nextStatus, orderValidType);
                          if (actionConfig) {
                            console.log(`⚠️ Ordem ${order.id} requer ações obrigatórias: ${actionConfig.title} - pulando`);
                            results.push({ orderId: order.id, success: false, reason: `Requer: ${actionConfig.title}` });
                            skippedCount++;
                            continue;
                          }

                          // Verificar se requer notas
                          if (requiresNotes(nextStatus)) {
                            console.log(`⚠️ Ordem ${order.id} requer notas adicionais - pulando`);
                            results.push({ orderId: order.id, success: false, reason: 'Requer notas adicionais' });
                            skippedCount++;
                            continue;
                          }

                          // Se chegou até aqui, pode processar automaticamente
                          const success = await onUpdateStatus(order.id, nextStatus, `Processamento em lote - ${batchAnalysis.canAdvanceToSameStatus} ordens`);
                          if (success) {
                            successCount++;
                            results.push({ orderId: order.id, success: true });
                            console.log(`✅ Ordem ${order.id} processada com sucesso`);
                          } else {
                            results.push({ orderId: order.id, success: false, reason: 'Erro na atualização' });
                          }
                        } catch (error) {
                          console.error(`❌ Erro ao processar ordem ${order.id}:`, error);
                          results.push({ orderId: order.id, success: false, reason: 'Erro técnico' });
                        }
                      }

                      // Feedback detalhado
                      if (successCount > 0 && skippedCount === 0) {
                        toast.success(`✅ ${successCount} ordens processadas com sucesso!`);
                      } else if (successCount > 0 && skippedCount > 0) {
                        toast.warning(`⚠️ ${successCount} ordens processadas, ${skippedCount} requerem ação individual`);
                      } else if (skippedCount > 0) {
                        toast.info(`ℹ️ Todas as ${skippedCount} ordens requerem ação individual`);
                      } else {
                        toast.error('❌ Nenhuma ordem pôde ser processada automaticamente');
                      }

                      // Log detalhado dos resultados
                      console.log('🎯 [NextStatusButton] Resultados do processamento em lote:', results);

                    } catch (error) {
                      console.error('❌ Erro no processamento em lote:', error);
                      toast.error('Erro no processamento em lote');
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  disabled={isUpdating}
                  className="bg-[#e5b034] hover:bg-[#d4a02a]"
                >
                  {isUpdating ? 'Processando...' : `Processar ${batchAnalysis.canAdvanceToSameStatus} Ordens`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
            order_number: serviceOrder.orderNumber, // ✅ Incluir order_number
            client_name: serviceOrder.clientName,
            equipment_type: serviceOrder.equipmentType,
            equipment_model: serviceOrder.equipmentModel,
            equipment_serial: serviceOrder.equipmentSerial,
            service_attendance_type: validType,
            status: serviceOrder.status,
            final_cost: serviceOrder.finalCost,
            pickup_address: serviceOrder.pickupAddress
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
