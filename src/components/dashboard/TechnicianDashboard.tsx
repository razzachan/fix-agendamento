
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
import { getServiceFlow, getNextStatus, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { isActiveOrder, isScheduledOrder, isInProgressOrder, sortOrdersByHybridPriority, isTechnicianActiveOrder, sortTechnicianOrdersByPriority } from '@/utils/statusMappingUtils';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import ServiceTimelineDropdown from '@/components/ServiceOrders/ProgressTracker/ServiceTimelineDropdown';
import { ptBR } from 'date-fns/locale';
import { MetricCard } from './MetricCard';
import { SimpleChart } from './SimpleChart';
import { ActiveOrderCard } from './ActiveOrderCard';
import { SuperActiveOrderCard } from './SuperActiveOrderCard';
import { QuickActionPanel } from './QuickActionPanel';
import { OverdueOrdersAlert } from './OverdueOrdersAlert';
import { CollectedEquipmentCard } from './CollectedEquipmentCard';
import { WeatherCard } from './WeatherCard';
import { ProductivityDashboard } from '@/components/technician/ProductivityDashboard';
import OrderDetailsModal from './OrderDetailsModal';
import TechnicianStockDashboard from '@/components/technician/TechnicianStockDashboard';
import TechnicianMainCalendarView from '@/components/technician/TechnicianMainCalendarView';
import { Users, BarChart3, BarChart } from 'lucide-react';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'productivity' | 'calendar' | 'stock'>('overview');
  const [isNextOrderModalOpen, setIsNextOrderModalOpen] = useState(false);

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

  // Ordenar ordens ativas por prioridade específica do técnico (ordens coletadas vão para o final)
  const sortedActiveOrders = sortTechnicianOrdersByPriority([...currentActiveOrders, ...overdueOrders]);

  // Ordens de hoje
  const todayOrders = technicianOrders.filter(order =>
    order.scheduledDate && isToday(new Date(order.scheduledDate))
  );

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
  
  return (
    <div className="space-y-6">
      {/* Navegação por abas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </div>
          </button>

          <button
            onClick={() => setActiveTab('productivity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'productivity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Produtividade
            </div>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </div>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Estoque Móvel
            </div>
          </button>
        </nav>
      </div>

      {/* Conteúdo das abas */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Header com informações do dia e clima */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bom dia! 👋</CardTitle>
                <CardDescription>
                  {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {format(currentTime, 'HH:mm')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {todayOrders.length} ordens hoje
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Card de Clima */}
        <WeatherCard compact className="md:col-span-1" />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Produtividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Ordens esta semana
            </p>
            <div className="flex items-center mt-2">
              <Star className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-sm font-medium">{averageRating}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Ordens Atrasadas */}
      {overdueOrders.length > 0 && (
        <OverdueOrdersAlert
          overdueOrders={overdueOrders}
          onNavigate={(address) => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`)}
          onCallClient={(phone) => window.open(`tel:${phone}`)}
          onViewOrder={(orderId) => onSelectOrder?.(orderId)}
        />
      )}

      {/* Card de Equipamentos Coletados */}
      {collectedOrders.length > 0 && (
        <CollectedEquipmentCard
          collectedOrders={collectedOrders}
          onUpdateStatus={onStatusUpdate}
        />
      )}

      {/* Layout Melhorado - Super Card + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Super Card de Ordens Ativas - 2/3 da largura */}
        <div className="lg:col-span-2">
          <SuperActiveOrderCard
            orders={sortedActiveOrders} // Usar ordens ordenadas por prioridade
            onViewOrder={(orderId) => onSelectOrder?.(orderId)}
            onNavigate={(address) => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`)}
            onUpdateStatus={onStatusUpdate}
          />
        </div>

        {/* Quick Action Panel - 1/3 da largura */}
        <div className="lg:col-span-1">
          <QuickActionPanel
            orders={sortedActiveOrders} // Usar ordens ordenadas por prioridade
            onNavigateToAll={() => handleNavigate('active')}
            onCallClient={(phone) => window.open(`tel:${phone}`)}
            onViewRoute={() => handleQuickAction('route')}
          />
        </div>
      </div>

      {/* Próxima ordem */}
      {nextOrder && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
              Próxima Ordem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{nextOrder.clientName}</div>
                <div className="text-sm text-muted-foreground">
                  {nextOrder.equipment || 'Equipamento não especificado'}
                </div>
                <div className="flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="text-xs">{nextOrder.address}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">
                  {nextOrder.scheduledDate && format(new Date(nextOrder.scheduledDate), 'HH:mm')}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {nextOrder.attendanceType}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => setIsNextOrderModalOpen(true)}>
                <ArrowRight className="h-4 w-4 mr-1" />
                Ver Detalhes
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('route')}>
                <Navigation className="h-4 w-4 mr-1" />
                Ver Rota
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de status modernos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pendentes"
          value={pendingOrders.length}
          subtitle="Aguardando atendimento"
          icon={Clock}
          color="orange"
          onClick={() => handleNavigate('pending')}
          trend={pendingOrders.length > 0 ? {
            value: 12,
            isPositive: false,
            label: "vs. semana passada"
          } : undefined}
        />

        <MetricCard
          title="Agendados"
          value={scheduledOrders.length}
          subtitle="Serviços programados"
          icon={Calendar}
          color="blue"
          onClick={() => handleNavigate('scheduled')}
          trend={scheduledOrders.length > 0 ? {
            value: 8,
            isPositive: true,
            label: "vs. semana passada"
          } : undefined}
        />

        <MetricCard
          title="Em Andamento"
          value={inProgressOrders.length}
          subtitle="Sendo executados"
          icon={Wrench}
          color="green"
          onClick={() => handleNavigate('in_progress')}
          trend={inProgressOrders.length > 0 ? {
            value: 15,
            isPositive: true,
            label: "vs. semana passada"
          } : undefined}
        />

        <MetricCard
          title="Concluídos"
          value={completedOrders.length}
          subtitle="Finalizados"
          icon={CheckCircle}
          color="purple"
          onClick={() => handleNavigate('completed')}
          trend={completedOrders.length > 0 ? {
            value: 25,
            isPositive: true,
            label: "vs. semana passada"
          } : undefined}
        />
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-16 flex-col"
              onClick={() => handleQuickAction('orders')}
            >
              <Wrench className="h-6 w-6 mb-1" />
              <span className="text-xs">Minhas Ordens</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex-col"
              onClick={() => handleQuickAction('route')}
            >
              <Route className="h-6 w-6 mb-1" />
              <span className="text-xs">Minha Rota</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex-col"
              onClick={() => handleQuickAction('calendar')}
            >
              <Calendar className="h-6 w-6 mb-1" />
              <span className="text-xs">Meu Calendário</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos e análises */}
      <div className="grid gap-4 md:grid-cols-2">
        <SimpleChart
          title="Produtividade Semanal"
          type="bar"
          data={[
            { label: 'Seg', value: 3, color: 'bg-blue-500' },
            { label: 'Ter', value: 5, color: 'bg-green-500' },
            { label: 'Qua', value: 2, color: 'bg-yellow-500' },
            { label: 'Qui', value: 4, color: 'bg-purple-500' },
            { label: 'Sex', value: 6, color: 'bg-indigo-500' },
            { label: 'Sáb', value: 1, color: 'bg-orange-500' },
            { label: 'Dom', value: 0, color: 'bg-gray-400' }
          ]}
          height={150}
        />

        <SimpleChart
          title="Status das Ordens"
          type="progress"
          data={[
            { label: 'Concluídas', value: completedOrders.length, color: 'bg-green-500' },
            { label: 'Em Andamento', value: inProgressOrders.length, color: 'bg-blue-500' },
            { label: 'Agendadas', value: scheduledOrders.length, color: 'bg-yellow-500' },
            { label: 'Pendentes', value: pendingOrders.length, color: 'bg-orange-500' }
          ]}
          height={150}
        />
      </div>

      {/* Resumo da semana e próximos dias */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Esta Semana"
          value={thisWeekCompleted}
          subtitle="Ordens concluídas"
          icon={BarChart3}
          color="green"
          size="lg"
          trend={{
            value: 20,
            isPositive: true,
            label: "vs. semana passada"
          }}
        />

        <MetricCard
          title="Distância"
          value={`${totalDistance} km`}
          subtitle="Percorrida esta semana"
          icon={MapPin}
          color="blue"
          size="lg"
          trend={{
            value: 5,
            isPositive: false,
            label: "vs. semana passada"
          }}
        />

        <MetricCard
          title="Avaliação"
          value={averageRating}
          subtitle="Média dos clientes"
          icon={Star}
          color="purple"
          size="lg"
          trend={{
            value: 2,
            isPositive: true,
            label: "vs. semana passada"
          }}
        />
      </div>

      {/* Próximos dias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximos Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Amanhã</h4>
              <div className="text-2xl font-bold">{tomorrowOrders.length}</div>
              <p className="text-sm text-muted-foreground">
                Ordens agendadas
              </p>
              {tomorrowOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/calendar')}
                >
                  Ver detalhes
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Esta Semana</h4>
              <div className="text-2xl font-bold">
                {technicianOrders.filter(order =>
                  order.scheduledDate &&
                  new Date(order.scheduledDate) >= new Date() &&
                  new Date(order.scheduledDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <p className="text-sm text-muted-foreground">
                Ordens programadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Modal de Detalhes da Próxima Ordem */}
        <OrderDetailsModal
          order={nextOrder}
          isOpen={isNextOrderModalOpen}
          onClose={() => setIsNextOrderModalOpen(false)}
          onUpdateStatus={onStatusUpdate}
        />
        </div>
      )}



      {/* Aba Produtividade */}
      {activeTab === 'productivity' && (
        <ProductivityDashboard />
      )}

      {/* Aba Calendário */}
      {activeTab === 'calendar' && (
        <TechnicianMainCalendarView technicianId={technicianId} />
      )}

      {/* Aba Estoque Móvel */}
      {activeTab === 'stock' && (
        <TechnicianStockDashboard />
      )}
    </div>
  );
};

export default TechnicianDashboard;
