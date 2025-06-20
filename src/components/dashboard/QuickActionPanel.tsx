import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder } from '@/types';
import {
  Zap,
  MapPin,
  Phone,
  Clock,
  Package,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translateStatus } from '@/utils/statusMapping';

interface QuickActionPanelProps {
  orders: ServiceOrder[];
  onNavigateToAll?: () => void;
  onCallClient?: (phone: string) => void;
  onViewRoute?: () => void;
  className?: string;
}

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

export const QuickActionPanel: React.FC<QuickActionPanelProps> = ({
  orders,
  onNavigateToAll,
  onCallClient,
  onViewRoute,
  className
}) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  // Separar ordens atuais e atrasadas
  const currentOrders = orders.filter(order => !isOrderOverdue(order));
  const overdueOrders = orders.filter(order => isOrderOverdue(order));

  // Agrupar ordens atuais por status
  const statusGroups = currentOrders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, ServiceOrder[]>);

  // Estatísticas rápidas (apenas ordens atuais)
  const totalOrders = currentOrders.length;
  const uniqueAddresses = new Set(currentOrders.map(o => o.pickupAddress)).size;
  const urgentOrders = currentOrders.filter(o =>
    o.status === 'scheduled' || o.status === 'on_the_way' || o.status === 'in_progress'
  ).length;

  // Próxima ação sugerida
  const getNextSuggestedAction = () => {
    // Prioridade 1: Ordens atrasadas
    if (overdueOrders.length > 0) {
      return {
        action: 'Resolver Atrasos',
        description: `${overdueOrders.length} ordem${overdueOrders.length > 1 ? 's' : ''} atrasada${overdueOrders.length > 1 ? 's' : ''}`,
        icon: AlertCircle,
        color: 'bg-red-500',
        onClick: onNavigateToAll
      };
    }

    const scheduledOrders = currentOrders.filter(o => o.status === 'scheduled');
    const onTheWayOrders = currentOrders.filter(o => o.status === 'on_the_way');
    const inProgressOrders = currentOrders.filter(o => o.status === 'in_progress');

    if (inProgressOrders.length > 0) {
      return {
        action: 'Finalizar Serviços',
        description: `${inProgressOrders.length} ordem${inProgressOrders.length > 1 ? 's' : ''} em andamento`,
        icon: CheckCircle,
        color: 'bg-green-500',
        onClick: onNavigateToAll
      };
    }

    if (onTheWayOrders.length > 0) {
      return {
        action: 'Continuar Rota',
        description: `${onTheWayOrders.length} ordem${onTheWayOrders.length > 1 ? 's' : ''} a caminho`,
        icon: ArrowRight,
        color: 'bg-yellow-500',
        onClick: onNavigateToAll
      };
    }

    if (scheduledOrders.length > 0) {
      return {
        action: 'Iniciar Rota',
        description: `${scheduledOrders.length} ordem${scheduledOrders.length > 1 ? 's' : ''} agendada${scheduledOrders.length > 1 ? 's' : ''}`,
        icon: MapPin,
        color: 'bg-blue-500',
        onClick: onViewRoute
      };
    }

    return null;
  };

  const suggestedAction = getNextSuggestedAction();

  return (
    <Card className={cn('transition-all duration-300', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-[#e5b034]" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-[#e5b034]">{totalOrders}</div>
            <div className="text-xs text-muted-foreground">Atuais</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{uniqueAddresses}</div>
            <div className="text-xs text-muted-foreground">Endereços</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{overdueOrders.length}</div>
            <div className="text-xs text-muted-foreground">Atrasadas</div>
          </div>
        </div>

        {/* Ação Sugerida */}
        {suggestedAction && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Próxima Ação</div>
            <Button
              onClick={suggestedAction.onClick}
              className={cn(
                "w-full justify-start text-white",
                suggestedAction.color
              )}
              size="sm"
            >
              <suggestedAction.icon className="w-4 h-4 mr-2" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{suggestedAction.action}</span>
                <span className="text-xs opacity-90">{suggestedAction.description}</span>
              </div>
            </Button>
          </div>
        )}

        {/* Status Overview */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Status das Ordens</div>
          <div className="space-y-1">
            {Object.entries(statusGroups).map(([status, statusOrders]) => (
              <div key={status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'scheduled' && 'bg-blue-500',
                    status === 'on_the_way' && 'bg-yellow-500',
                    status === 'in_progress' && 'bg-green-500',
                    status === 'collected' && 'bg-purple-500',
                    status === 'completed' && 'bg-emerald-500',
                    !['scheduled', 'on_the_way', 'in_progress', 'collected', 'completed'].includes(status) && 'bg-gray-500'
                  )} />
                  <span>{translateStatus(status)}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {statusOrders.length}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Ações</div>
          <div className="grid grid-cols-2 gap-2">
            {onNavigateToAll && (
              <Button variant="outline" size="sm" onClick={onNavigateToAll}>
                <MapPin className="w-3 h-3 mr-1" />
                Navegar
              </Button>
            )}
            
            {onViewRoute && (
              <Button variant="outline" size="sm" onClick={onViewRoute}>
                <ArrowRight className="w-3 h-3 mr-1" />
                Ver Rota
              </Button>
            )}
            
            {orders[0]?.clientPhone && onCallClient && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onCallClient(orders[0].clientPhone)}
                className="col-span-2"
              >
                <Phone className="w-3 h-3 mr-1" />
                Ligar para Cliente
              </Button>
            )}
          </div>
        </div>

        {/* Alertas */}
        {overdueOrders.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div className="text-xs text-red-700">
              <span className="font-medium">{overdueOrders.length} ordem{overdueOrders.length > 1 ? 's' : ''}</span> atrasada{overdueOrders.length > 1 ? 's' : ''} - ação imediata necessária
            </div>
          </div>
        )}

        {urgentOrders > 0 && overdueOrders.length === 0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div className="text-xs text-yellow-700">
              <span className="font-medium">{urgentOrders} ordem{urgentOrders > 1 ? 's' : ''}</span> precisam de atenção hoje
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
