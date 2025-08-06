
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/contexts/AuthContext';
import WorkshopStatsCards from './workshop/WorkshopStatsCards';
import WorkshopEquipmentList from './workshop/WorkshopEquipmentList';
import EquipmentDropdown from './workshop/EquipmentDropdown';
import { PendingEquipmentsList } from '@/components/workshop/PendingEquipmentsList';
import { DiagnosisDialog } from '@/components/workshop/DiagnosisDialog';
import { RepairProgressDialog } from '@/components/workshop/RepairProgressDialog';
import { CompleteRepairDialog } from '@/components/workshop/CompleteRepairDialog';
import { serviceEventService } from '@/services';
import { toast } from 'sonner';

const WorkshopDashboard: React.FC = () => {
  const { serviceOrders, refreshServiceOrders } = useAppData();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [diagnosisCompletedIds, setDiagnosisCompletedIds] = useState<string[]>([]);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Estados para o diálogo de diagnóstico
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Estados para os dialogs de reparo
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedOrderForRepair, setSelectedOrderForRepair] = useState<any>(null);

  // Função para carregar dados de diagnósticos concluídos
  const loadDiagnosisData = useCallback(async () => {
    setIsLoadingDiagnosis(true);
    try {
      console.log('Carregando dados de diagnósticos');
      
      // Buscar todas as ordens que são do tipo diagnóstico
      const diagnosticOrders = serviceOrders.filter(order => 
        order.serviceAttendanceType === 'coleta_diagnostico'
      );
      
      console.log(`Encontradas ${diagnosticOrders.length} ordens do tipo diagnóstico`);
      
      // Para cada ordem, verificar se já tem diagnóstico
      const completedIds = [];
      for (const order of diagnosticOrders) {
        try {
          const events = await serviceEventService.getDiagnosisEvents(order.id);
          if (events && events.length > 0) {
            completedIds.push(order.id);
            console.log(`Diagnóstico encontrado para a OS ${order.id}`);
          }
        } catch (error) {
          console.error(`Erro ao verificar diagnósticos para a OS ${order.id}:`, error);
        }
      }
      
      console.log(`Total de ${completedIds.length} diagnósticos concluídos encontrados`);
      
      setDiagnosisCompletedIds(completedIds);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados de diagnóstico:', error);
      toast.error('Não foi possível carregar os dados de diagnóstico.');
    } finally {
      setIsLoadingDiagnosis(false);
    }
  }, [serviceOrders]);

  // Função para atualizar todos os dados do workshop
  const handleWorkshopDataUpdate = useCallback(async () => {
    console.log('🔄 [WorkshopDashboard] Atualizando dados após confirmação de recebimento');
    await refreshServiceOrders(); // Atualizar ordens de serviço
    await loadDiagnosisData(); // Recarregar diagnósticos
    setLastUpdateTime(new Date()); // Atualizar timestamp
  }, [refreshServiceOrders, loadDiagnosisData]);

  useEffect(() => {
    const fetchData = async () => {
      await refreshServiceOrders();
      await loadDiagnosisData();
    };
    
    fetchData();
    
    // Configurar atualização periódica dos dados - reduzida para evitar refreshes excessivos
    const intervalId = setInterval(fetchData, 300000); // Atualizar a cada 5 minutos
    
    return () => clearInterval(intervalId);
  }, []); // Mantendo vazio para evitar loops

  // Use useMemo para filtrar as ordens apenas quando necessário
  const workshopOrders = useMemo(() => {
    return serviceOrders.filter(order => {
      // EXCLUIR equipamentos apenas enviados ('at_workshop') - só incluir após confirmação de recebimento
      // Incluir equipamentos CONFIRMADOS como recebidos na oficina e outros status relevantes
      return (order.status === 'received_at_workshop' ||
              order.status === 'diagnosis_completed' ||
              order.status === 'awaiting_quote_approval' ||
              order.status === 'quote_approved' ||
              order.status === 'in_progress' ||
              order.status === 'collected' ||
              order.status === 'collected_for_delivery' ||
              order.status === 'ready_for_delivery' ||
              order.status === 'payment_pending');
    });
  }, [serviceOrders]);

  // Usando useMemo para calcular os valores apenas quando necessário
  const stats = useMemo(() => {
    // Diagnósticos pendentes: APENAS coleta_diagnostico (coleta_conserto vai direto para reparo)
    const pendingDiagnostics = workshopOrders.filter(order => {
      const isReceivedAtWorkshop = (order.status === 'received_at_workshop' || order.status === 'collected');
      const needsDiagnosisStep = order.serviceAttendanceType === 'coleta_diagnostico';
      const needsDiagnosis = !diagnosisCompletedIds.includes(order.id);

      return needsDiagnosisStep && isReceivedAtWorkshop && needsDiagnosis;
    }).length;

    // Log detalhado para depuração
    console.log(`Stats - Diagnósticos pendentes: ${pendingDiagnostics}, IDs concluídos: ${diagnosisCompletedIds.length}`);

    // Aguardando aprovação de orçamento (APENAS coleta_diagnostico)
    const awaitingQuoteApproval = workshopOrders.filter(order => {
      const isAwaitingApproval = order.status === 'quote_sent' || order.status === 'diagnosis_completed';
      const needsApprovalStep = order.serviceAttendanceType === 'coleta_diagnostico';
      return isAwaitingApproval && needsApprovalStep;
    }).length;

    // Em trabalho: após aprovação OU coleta_conserto direto
    const ongoingWork = workshopOrders.filter(order => {
      const isInProgressStatus = order.status === 'in_progress' || order.status === 'quote_approved';
      const isColetaConsertoReady = order.serviceAttendanceType === 'coleta_conserto' &&
                                   (order.status === 'received_at_workshop' || order.status === 'collected');
      return isInProgressStatus || isColetaConsertoReady;
    }).length;

    // Prontos para coleta: equipamentos finalizados aguardando retirada
    const readyForPickup = workshopOrders.filter(order =>
      order.status === 'ready_for_delivery' ||
      order.status === 'collected_for_delivery' ||
      order.status === 'payment_pending'
    ).length;

    // Estatísticas do dia
    const completedToday = workshopOrders.filter(order => {
      if (order.completedDate) {
        const today = new Date();
        const completedDate = new Date(order.completedDate);
        return completedDate.toDateString() === today.toDateString();
      }
      return false;
    }).length;

    // Log detalhado para depuração das contagens
    console.log(`Stats essenciais - Pendentes: ${pendingDiagnostics}, Aguardando aprovação: ${awaitingQuoteApproval}, Em trabalho: ${ongoingWork}, Prontos: ${readyForPickup}, Concluídos hoje: ${completedToday}`);

    return {
      pendingDiagnostics,
      awaitingQuoteApproval,
      ongoingWork,
      readyForPickup,
      completedToday
    };
  }, [workshopOrders, diagnosisCompletedIds]);

  // Função para abrir o diálogo de diagnóstico
  const handleAddDiagnosis = useCallback((orderId: string) => {
    console.log('🔍 [WorkshopDashboard] Abrindo diálogo de diagnóstico para ordem:', orderId);
    setSelectedOrderId(orderId);
    setShowDiagnosisDialog(true);
  }, []);

  // Função chamada quando diagnóstico é salvo com sucesso
  const handleDiagnosisSuccess = useCallback(async () => {
    console.log('🎉 [WorkshopDashboard] Diagnóstico salvo com sucesso, atualizando dados...');

    // Fechar diálogo
    setShowDiagnosisDialog(false);
    setSelectedOrderId(null);

    // Atualizar dados
    await refreshServiceOrders();
    await loadDiagnosisData();
    setRefreshKey(prevKey => prevKey + 1);
    setLastUpdateTime(new Date());

    toast.success('Diagnóstico registrado com sucesso!');
  }, [refreshServiceOrders, loadDiagnosisData]);

  // Função para abrir dialog de atualizar progresso
  const handleUpdateProgress = useCallback((orderId: string) => {
    console.log('🔧 [WorkshopDashboard] Abrindo dialog de progresso para ordem:', orderId);
    const order = workshopOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderForRepair({
        id: order.id,
        client_name: order.clientName || order.client_name,
        equipment_type: order.equipmentType || order.equipment_type,
        equipment_model: order.equipmentModel || order.equipment_model,
        status: order.status,
        service_attendance_type: order.serviceAttendanceType
      });
      setShowProgressDialog(true);
    }
  }, [workshopOrders]);

  // Função para abrir dialog de concluir reparo
  const handleCompleteRepair = useCallback((orderId: string) => {
    console.log('✅ [WorkshopDashboard] Abrindo dialog de conclusão para ordem:', orderId);
    const order = workshopOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderForRepair({
        id: order.id,
        client_name: order.clientName || order.client_name,
        equipment_type: order.equipmentType || order.equipment_type,
        equipment_model: order.equipmentModel || order.equipment_model,
        status: order.status,
        service_attendance_type: order.serviceAttendanceType
      });
      setShowCompleteDialog(true);
    }
  }, [workshopOrders]);

  // Função chamada quando reparo é atualizado/concluído com sucesso
  const handleRepairSuccess = useCallback(async () => {
    console.log('🎉 [WorkshopDashboard] Reparo atualizado com sucesso, atualizando dados...');

    // Fechar dialogs
    setShowProgressDialog(false);
    setShowCompleteDialog(false);
    setSelectedOrderForRepair(null);

    // Atualizar dados
    await refreshServiceOrders();
    await loadDiagnosisData();
    setRefreshKey(prevKey => prevKey + 1);
    setLastUpdateTime(new Date());

    toast.success('Reparo atualizado com sucesso!');
  }, [refreshServiceOrders, loadDiagnosisData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold tracking-tight">Painel da Oficina</h2>
      <p className="text-sm text-muted-foreground">
        Última atualização: {lastUpdateTime.toLocaleTimeString()}
      </p>
      
      <WorkshopStatsCards
        pendingDiagnostics={stats.pendingDiagnostics}
        awaitingQuoteApproval={stats.awaitingQuoteApproval}
        ongoingWork={stats.ongoingWork}
        readyForPickup={stats.readyForPickup}
        completedToday={stats.completedToday}
        isLoading={isLoadingDiagnosis}
      />

      {/* Lista de equipamentos pendentes de recebimento */}
      <PendingEquipmentsList onEquipmentReceived={handleWorkshopDataUpdate} />

      <EquipmentDropdown
        workshopOrders={workshopOrders}
        diagnosisCompletedIds={diagnosisCompletedIds}
        onAddDiagnosis={handleAddDiagnosis}
        onUpdateProgress={handleUpdateProgress}
        onCompleteRepair={handleCompleteRepair}
        isLoadingDiagnosis={isLoadingDiagnosis}
      />

      {/* Diálogo de diagnóstico */}
      {selectedOrderId && (
        <DiagnosisDialog
          open={showDiagnosisDialog}
          onOpenChange={setShowDiagnosisDialog}
          serviceOrderId={selectedOrderId}
          onSuccess={handleDiagnosisSuccess}
        />
      )}

      {/* Dialogs de reparo */}
      {selectedOrderForRepair && (
        <>
          <RepairProgressDialog
            open={showProgressDialog}
            onOpenChange={setShowProgressDialog}
            order={selectedOrderForRepair}
            onSuccess={handleRepairSuccess}
          />

          <CompleteRepairDialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
            order={selectedOrderForRepair}
            onSuccess={handleRepairSuccess}
          />
        </>
      )}
    </div>
  );
};

export default WorkshopDashboard;
