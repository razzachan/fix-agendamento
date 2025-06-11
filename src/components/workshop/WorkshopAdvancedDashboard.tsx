import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Factory,
  Clock,
  CheckCircle,
  Wrench,
  BarChart3,
  TrendingUp,
  List
} from 'lucide-react';
import WorkshopStatsCards from '../dashboard/workshop/WorkshopStatsCards';
import EquipmentDropdown from '../dashboard/workshop/EquipmentDropdown';
import { PendingEquipmentsList } from './PendingEquipmentsList';
import EquipmentManagement from './EquipmentManagement';
import { DiagnosisDialog } from './DiagnosisDialog';
import { RepairProgressDialog } from './RepairProgressDialog';
import { CompleteRepairDialog } from './CompleteRepairDialog';
import { WorkshopMetricsDashboard } from './WorkshopMetricsDashboard';
import { WorkshopQueue } from './WorkshopQueue';
import { serviceEventService } from '@/services';
import { toast } from 'sonner';

interface WorkshopAdvancedDashboardProps {
  className?: string;
}

const WorkshopAdvancedDashboard: React.FC<WorkshopAdvancedDashboardProps> = ({ 
  className = "" 
}) => {
  const { serviceOrders, refreshServiceOrders } = useAppData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  console.log('🔍 [WorkshopAdvancedDashboard] Active tab:', activeTab);
  const [refreshKey, setRefreshKey] = useState(0);
  const [diagnosisCompletedIds, setDiagnosisCompletedIds] = useState<string[]>([]);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Estados para os dialogs
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderForRepair, setSelectedOrderForRepair] = useState<any>(null);

  // Função para carregar dados de diagnósticos concluídos
  const loadDiagnosisData = useCallback(async () => {
    setIsLoadingDiagnosis(true);
    try {
      const diagnosticOrders = serviceOrders.filter(order => 
        order.serviceAttendanceType === 'coleta_diagnostico'
      );
      
      const completedIds = [];
      for (const order of diagnosticOrders) {
        try {
          const events = await serviceEventService.getDiagnosisEvents(order.id);
          if (events && events.length > 0) {
            completedIds.push(order.id);
          }
        } catch (error) {
          console.error(`Erro ao verificar diagnósticos para a OS ${order.id}:`, error);
        }
      }
      
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
    await refreshServiceOrders();
    await loadDiagnosisData();
    setLastUpdateTime(new Date());
    setRefreshKey(prev => prev + 1);
  }, [refreshServiceOrders, loadDiagnosisData]);

  useEffect(() => {
    const fetchData = async () => {
      await refreshServiceOrders();
      await loadDiagnosisData();
    };
    
    fetchData();
    
    // Atualização periódica a cada 5 minutos
    const intervalId = setInterval(fetchData, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Filtrar ordens da oficina
  const workshopOrders = useMemo(() => {
    return serviceOrders.filter(order => {
      return (order.status === 'received_at_workshop' ||
              order.status === 'diagnosis_completed' ||
              order.status === 'quote_sent' ||
              order.status === 'quote_approved' ||
              order.status === 'in_progress' ||
              order.status === 'collected' ||
              order.status === 'collected_for_delivery' ||
              order.status === 'ready_for_delivery' ||
              order.status === 'payment_pending');
    });
  }, [serviceOrders]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const pendingDiagnostics = workshopOrders.filter(order => {
      const isReceivedAtWorkshop = (order.status === 'received_at_workshop' || order.status === 'collected');
      const needsDiagnosisStep = order.serviceAttendanceType === 'coleta_diagnostico';
      const needsDiagnosis = !diagnosisCompletedIds.includes(order.id);
      return needsDiagnosisStep && isReceivedAtWorkshop && needsDiagnosis;
    }).length;

    const awaitingQuoteApproval = workshopOrders.filter(order => {
      const isAwaitingApproval = order.status === 'quote_sent' || order.status === 'diagnosis_completed';
      const needsApprovalStep = order.serviceAttendanceType === 'coleta_diagnostico';
      return isAwaitingApproval && needsApprovalStep;
    }).length;

    const ongoingWork = workshopOrders.filter(order => {
      const isInProgressStatus = order.status === 'in_progress' || order.status === 'quote_approved';
      const isColetaConsertoReady = order.serviceAttendanceType === 'coleta_conserto' &&
                                   (order.status === 'received_at_workshop' || order.status === 'collected');
      return isInProgressStatus || isColetaConsertoReady;
    }).length;

    const readyForPickup = workshopOrders.filter(order =>
      order.status === 'ready_for_delivery' ||
      order.status === 'collected_for_delivery' ||
      order.status === 'payment_pending'
    ).length;

    const completedToday = workshopOrders.filter(order => {
      if (order.completedDate) {
        const today = new Date();
        const completedDate = new Date(order.completedDate);
        return completedDate.toDateString() === today.toDateString();
      }
      return false;
    }).length;

    return {
      pendingDiagnostics,
      awaitingQuoteApproval,
      ongoingWork,
      readyForPickup,
      completedToday
    };
  }, [workshopOrders, diagnosisCompletedIds]);

  // Handlers para os dialogs
  const handleAddDiagnosis = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDiagnosisDialog(true);
  }, []);

  const handleUpdateProgress = useCallback((orderId: string) => {
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

  const handleCompleteRepair = useCallback((orderId: string) => {
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

  const handleDialogSuccess = useCallback(async () => {
    setShowDiagnosisDialog(false);
    setShowProgressDialog(false);
    setShowCompleteDialog(false);
    setSelectedOrderId(null);
    setSelectedOrderForRepair(null);
    await handleWorkshopDataUpdate();
  }, [handleWorkshopDataUpdate]);

  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-8 w-8 text-blue-600" />
            Painel Avançado da Oficina
          </h2>
          <p className="text-sm text-muted-foreground">
            Última atualização: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>
        <Button 
          onClick={handleWorkshopDataUpdate}
          variant="outline"
          size="sm"
        >
          Atualizar Dados
        </Button>
      </div>

      {/* Stats Cards */}
      <WorkshopStatsCards
        pendingDiagnostics={stats.pendingDiagnostics}
        awaitingQuoteApproval={stats.awaitingQuoteApproval}
        ongoingWork={stats.ongoingWork}
        readyForPickup={stats.readyForPickup}
        completedToday={stats.completedToday}
        isLoading={isLoadingDiagnosis}
      />

      {/* Tabs Navigation - Expandido com Fila de Trabalho */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Fila de Trabalho
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Gestão de Equipamentos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Lista de equipamentos pendentes de recebimento */}
          <PendingEquipmentsList onEquipmentReceived={handleWorkshopDataUpdate} />

          {/* Lista principal de equipamentos na oficina */}
          <EquipmentDropdown
            workshopOrders={workshopOrders}
            diagnosisCompletedIds={diagnosisCompletedIds}
            onAddDiagnosis={handleAddDiagnosis}
            onUpdateProgress={handleUpdateProgress}
            onCompleteRepair={handleCompleteRepair}
            isLoadingDiagnosis={isLoadingDiagnosis}
          />
          
          {/* Resumo rápido */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workshopOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  Na oficina atualmente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.5 dias</div>
                <p className="text-xs text-muted-foreground">
                  Por equipamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-muted-foreground">
                  Taxa de sucesso
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queue Tab - Fila de Trabalho Inteligente */}
        <TabsContent value="queue">
          <WorkshopQueue />
        </TabsContent>

        {/* Metrics Tab - Dashboard de Métricas da Oficina */}
        <TabsContent value="metrics">
          <WorkshopMetricsDashboard />
        </TabsContent>

        {/* Equipment Management Tab - Foco apenas no trabalho técnico */}
        <TabsContent value="equipment">
          <EquipmentManagement
            workshopOrders={workshopOrders}
            diagnosisCompletedIds={diagnosisCompletedIds}
            onDataUpdate={handleWorkshopDataUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedOrderId && (
        <DiagnosisDialog
          open={showDiagnosisDialog}
          onOpenChange={setShowDiagnosisDialog}
          serviceOrderId={selectedOrderId}
          onSuccess={handleDialogSuccess}
        />
      )}

      {selectedOrderForRepair && (
        <>
          <RepairProgressDialog
            open={showProgressDialog}
            onOpenChange={setShowProgressDialog}
            order={selectedOrderForRepair}
            onSuccess={handleDialogSuccess}
          />

          <CompleteRepairDialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
            order={selectedOrderForRepair}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
    </div>
  );
};

export default WorkshopAdvancedDashboard;
