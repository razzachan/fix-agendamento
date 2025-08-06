
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Wrench,
  CheckCircle,
  MapPin,
  Route,
  Star,
  TrendingUp,
  AlertCircle,
  Navigation,
  ArrowRight,
  MessageSquare,
  Home,
  Package,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getServiceFlow, getNextStatus, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { isActiveOrder, isScheduledOrder, isInProgressOrder, sortOrdersByHybridPriority, isTechnicianActiveOrder, sortTechnicianOrdersByPriority } from '@/utils/statusMappingUtils';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import ServiceTimelineDropdown from '@/components/ServiceOrders/ProgressTracker/ServiceTimelineDropdown';
import { useAuth } from '@/contexts/AuthContext';

import { MetricCard } from './MetricCard';
import { SuperActiveOrderCard } from './SuperActiveOrderCard';
import OverdueOrdersAlert from './OverdueOrdersAlert';
import { CollectedEquipmentCard } from './CollectedEquipmentCard';
import { ScheduledDeliveriesCard } from './ScheduledDeliveriesCard';
import { ProductivityDashboard } from '@/components/technician/ProductivityDashboard';
import OrderDetailsModal from './OrderDetailsModal';
import TechnicianStockDashboard from '@/components/technician/TechnicianStockDashboard';
import TechnicianMainCalendarView from '@/components/technician/TechnicianMainCalendarView';
import { SmartProgressTracker } from '@/components/ServiceOrders/ProgressTracker/SmartProgressTracker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, BarChart3, BarChart } from 'lucide-react';
import '@/styles/technician-dashboard.css';

interface TechnicianDashboardProps {
  technicianOrders: ServiceOrder[];
  technicianId?: string;
  selectedOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
  onStatusUpdate?: (orderId: string, newStatus: string, notes?: string) => Promise<void>;
}

const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  technicianOrders,
  technicianId,
  selectedOrderId,
  onSelectOrder,
  onStatusUpdate
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'productivity' | 'calendar' | 'stock'>('overview');
  const [isNextOrderModalOpen, setIsNextOrderModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<ServiceOrder | null>(null);


  // Atualizar horário a cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filtrar ordens usando utilitários unificados
  const pendingOrders = technicianOrders.filter(order => order.status === 'pending');
  const activeOrders = technicianOrders.filter(order => isTechnicianActiveOrder(order.status)); // Usar função específica do técnico
  const inProgressOrders = technicianOrders.filter(order => isInProgressOrder(order.status));
  const scheduledOrders = technicianOrders.filter(order => isScheduledOrder(order.status));
  const completedOrders = technicianOrders.filter(order =>
    order.status === 'completed' || order.status === 'cancelled'
  );



  // 🔧 FILTRO: Ordens ativas apenas do dia atual (para não poluir o dashboard)
  const todayActiveOrders = activeOrders.filter(order => {
    // Ordens com delivery_scheduled sempre aparecem (equipamentos prontos para entrega)
    if (order.status === 'delivery_scheduled') return true;

    // Ordens coletadas para entrega sempre aparecem
    if (order.status === 'collected_for_delivery') return true;

    // Ordens em rota de entrega sempre aparecem (técnico responsável pela entrega)
    if (order.status === 'on_the_way_to_deliver') return true;

    if (!order.scheduledDate) return true; // Incluir ordens sem data (podem ser urgentes)

    const orderDate = new Date(order.scheduledDate);
    const today = new Date();

    // Verificar se é do dia atual
    return orderDate.toDateString() === today.toDateString();
  });

  // Função para detectar ordens atrasadas
  const isOrderOverdue = (order: ServiceOrder): boolean => {
    if (!order.scheduledDate) return false;

    const now = new Date();
    const scheduledDateTime = new Date(order.scheduledDate);

    // Se tem horário específico, usar ele
    if (order.scheduledTime) {
      const [hours, minutes] = order.scheduledTime.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
    }

    // Considerar atrasado se passou mais de 1 hora do horário agendado
    const oneHourLater = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
    return now > oneHourLater;
  };

  // Separar ordens atuais e atrasadas (usando ordens filtradas do dia atual)
  const overdueOrders = todayActiveOrders.filter(order => isOrderOverdue(order));
  const currentActiveOrders = todayActiveOrders.filter(order => !isOrderOverdue(order));

  // Filtrar ordens coletadas que precisam ser deixadas na oficina
  const collectedOrders = technicianOrders.filter(order =>
    order.status === 'collected' || order.status === 'collected_for_diagnosis'
  );

  // Filtrar entregas agendadas que precisam ser coletadas na oficina
  const scheduledDeliveries = technicianOrders.filter(order =>
    order.status === 'delivery_scheduled'
  );

  // Ordens de hoje
  const todayOrders = technicianOrders.filter(order =>
    order.scheduledDate && isToday(new Date(order.scheduledDate))
  );



  // Ordenar ordens ativas por prioridade específica do técnico (ordens coletadas vão para o final)
  const sortedActiveOrders = sortTechnicianOrdersByPriority([...currentActiveOrders, ...overdueOrders]);

  // Ordens de amanhã
  const tomorrowOrders = technicianOrders.filter(order =>
    order.scheduledDate && isTomorrow(new Date(order.scheduledDate))
  );

  // Ordem em andamento (prioridade: em progresso > agendada)
  const activeOrder = sortedActiveOrders[0] || null;

  // Próxima ordem agendada (excluindo a ordem em andamento)
  const nextOrder = scheduledOrders
    .filter(order =>
      order.scheduledDate &&
      order.id !== activeOrder?.id // Excluir a ordem em andamento
    )
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

  // Calcular métricas de produtividade
  const thisWeekCompleted = completedOrders.filter(order => {
    if (!order.completedAt) return false;
    const completedDate = new Date(order.completedAt);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return completedDate >= weekStart;
  }).length;

  const averageRating = 4.8; // Placeholder - implementar cálculo real
  const totalDistance = 45.2; // Placeholder - implementar cálculo real

  // Navigate to orders view
  const handleNavigate = (status?: ServiceOrderStatus) => {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    navigate(`/technician?${searchParams.toString()}`);
  };

  // Ações rápidas
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'route':
        navigate('/routing');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'orders':
        navigate('/technician');
        break;
    }
  };

  // Função para atualizar status (placeholder - deve ser passada como prop)
  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string): Promise<boolean> => {
    if (onStatusUpdate) {
      try {
        await onStatusUpdate(orderId, newStatus, notes);
        return true;
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return false;
      }
    }
    console.warn('onStatusUpdate não foi fornecido');
    return false;
  };

  // Obter informações do tipo de atendimento
  const getAttendanceIcon = (type: string) => {
    switch (type) {
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

  const getAttendanceLabel = (type: string) => {
    switch (type) {
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

  // Função para abrir o modal de progresso
  const handleOpenProgressModal = (order: ServiceOrder) => {
    setSelectedOrderForProgress(order);
    setIsProgressModalOpen(true);
  };

  // Função para fechar o modal de progresso
  const handleCloseProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedOrderForProgress(null);
  };



  // Função para atualizar status no modal de progresso
  const handleProgressStatusUpdate = async (orderId: string, status: string): Promise<boolean> => {
    if (onStatusUpdate) {
      try {
        await onStatusUpdate(orderId, status);
        return true;
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return false;
      }
    }
    return false;
  };
  
  return (
    <div className="dashboard-main">
      <div className="dashboard-wrapper dashboard-content responsive-spacing">
        {/* Navegação por abas - Responsiva */}
        <div className="tab-navigation">
          <nav className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Visão Geral</span>
                <span className="xs:hidden text-xs">Visão</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Calendário</span>
                <span className="xs:hidden text-xs">Agenda</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('productivity')}
              className={`tab-button ${activeTab === 'productivity' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <BarChart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Produtividade</span>
                <span className="xs:hidden text-xs">Produção</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Estoque Móvel</span>
                <span className="xs:hidden text-xs">Estoque</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Alerta de Ordens Atrasadas */}
            {overdueOrders.length > 0 && (
              <div className="alert-container">
                <OverdueOrdersAlert
                  overdueOrders={overdueOrders}
                  onNavigate={(address) => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`)}
                  onCallClient={(phone) => window.open(`tel:${phone}`)}
                  onViewOrder={(orderId) => onSelectOrder?.(orderId)}
                  onOpenProgress={handleOpenProgressModal}
                  className="shadow-sm mobile-card-spacing"
                />
              </div>
            )}

            {/* Card de Equipamentos Coletados */}
            {collectedOrders.length > 0 && (
              <div className="card-container">
                <CollectedEquipmentCard
                  collectedOrders={collectedOrders}
                  onUpdateStatus={onStatusUpdate}
                />
              </div>
            )}

            {/* Card de Entregas Agendadas */}
            {scheduledDeliveries.length > 0 && (
              <div className="card-container">
                <ScheduledDeliveriesCard
                  scheduledDeliveries={scheduledDeliveries}
                  onUpdateStatus={onStatusUpdate}
                />
              </div>
            )}

            {/* Ordens Ativas - Layout Principal */}
            <div className="card-container">
              <SuperActiveOrderCard
                orders={sortedActiveOrders}
                onViewOrder={(orderId) => onSelectOrder?.(orderId)}
                onNavigate={(address) => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`)}
                onUpdateStatus={onStatusUpdate}
                onOpenProgressModal={handleOpenProgressModal}
                className="shadow-sm mobile-card-spacing"
              />
            </div>

            {/* Resumo Essencial */}
            <div className="metrics-grid">
              <MetricCard
                title="Hoje"
                value={todayOrders.length}
                subtitle="Ordens agendadas"
                icon={Clock}
                color="blue"
                size="sm"
                onClick={() => handleNavigate('today')}
              />

              <MetricCard
                title="Em Andamento"
                value={inProgressOrders.length}
                subtitle="Sendo executados"
                icon={Wrench}
                color="green"
                size="sm"
                onClick={() => handleNavigate('in_progress')}
              />

              <MetricCard
                title="Concluídos"
                value={thisWeekCompleted}
                subtitle="Esta semana"
                icon={CheckCircle}
                color="purple"
                size="sm"
                onClick={() => handleNavigate('completed')}
              />

              <MetricCard
                title="Avaliação"
                value={averageRating}
                subtitle="Média dos clientes"
                icon={Star}
                color="orange"
                size="sm"
              />
            </div>

            {/* Modal de Detalhes da Próxima Ordem */}
            <OrderDetailsModal
              order={nextOrder}
              isOpen={isNextOrderModalOpen}
              onClose={() => setIsNextOrderModalOpen(false)}
              onUpdateStatus={onStatusUpdate}
            />
          </div>
        )}



        {/* Aba Calendário */}
        {activeTab === 'calendar' && (
          <div className="content-card">
            <TechnicianMainCalendarView userId={user?.id || ''} />
          </div>
        )}

        {/* Aba Produtividade */}
        {activeTab === 'productivity' && (
          <div className="content-card">
            <ProductivityDashboard />
          </div>
        )}

        {/* Aba Estoque Móvel */}
        {activeTab === 'stock' && (
          <div className="content-card">
            <TechnicianStockDashboard />
          </div>
        )}

        {/* Modal de Progresso da Ordem de Serviço */}
        <Dialog open={isProgressModalOpen} onOpenChange={handleCloseProgressModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-green-600" />
                Progresso da Ordem de Serviço
              </DialogTitle>
            </DialogHeader>

            {selectedOrderForProgress && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data/Hora</label>
                    <p className="text-sm font-semibold">
                      {selectedOrderForProgress.scheduledDate &&
                        format(new Date(selectedOrderForProgress.scheduledDate), 'dd/MM/yyyy', { locale: ptBR })
                      }
                      {selectedOrderForProgress.scheduledTime && ` às ${selectedOrderForProgress.scheduledTime}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Endereço</label>
                    <p className="text-sm font-semibold">{selectedOrderForProgress.pickupAddress}</p>
                  </div>
                </div>

                {/* SmartProgressTracker */}
                <SmartProgressTracker
                  serviceOrder={selectedOrderForProgress}
                  onUpdateStatus={handleProgressStatusUpdate}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
};

export default TechnicianDashboard;
