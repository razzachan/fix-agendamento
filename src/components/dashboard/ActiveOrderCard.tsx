import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import {
  Clock,
  MapPin,
  User,
  Wrench,
  ArrowRight,
  Phone,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceFlow, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface ActiveOrderCardProps {
  order: ServiceOrder | null;
  onViewOrder?: () => void;
  onNavigate?: () => void;
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
  className?: string;
}

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'scheduled': 'border-blue-200',
    'on_the_way': 'border-yellow-200',
    'in_progress': 'border-green-200',
    'collected': 'border-purple-200',
    'at_workshop': 'border-orange-200',
    'completed': 'border-emerald-200',
    'cancelled': 'border-red-200'
  };
  return statusColors[status] || 'border-gray-200';
};

const getStatusBgColor = (status: string) => {
  const statusBgColors: Record<string, string> = {
    'scheduled': 'bg-blue-50/80',
    'on_the_way': 'bg-yellow-50/80',
    'in_progress': 'bg-green-50/80',
    'collected': 'bg-purple-50/80',
    'at_workshop': 'bg-orange-50/80',
    'completed': 'bg-emerald-50/80',
    'cancelled': 'bg-red-50/80'
  };
  return statusBgColors[status] || 'bg-gray-50/80';
};

const getStatusLabel = (status: string) => {
  const statusLabels: Record<string, string> = {
    'scheduled': 'Agendado',
    'on_the_way': 'A Caminho',
    'in_progress': 'Em Progresso',
    'collected': 'Coletado',
    'at_workshop': 'Na Oficina',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };
  return statusLabels[status] || status;
};

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({
  order,
  onViewOrder,
  onNavigate,
  onUpdateStatus,
  className
}) => {
  if (!order) {
    return (
      <Card className={cn('transition-all duration-300', className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            Ordem em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhuma ordem em andamento</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todas as ordens foram concluídas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular progresso
  const attendanceType = order.serviceAttendanceType || "em_domicilio";
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";
  
  const serviceFlow = getServiceFlow(validType);
  const currentStepIndex = getCurrentStepIndex(order.status, validType);
  const progress = serviceFlow.length > 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

  const scheduledTime = order.scheduledDate 
    ? format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR })
    : null;

  return (
    <Card className={cn(
      'transition-all duration-300 hover:shadow-lg border-l-4',
      getStatusColor(order.status),
      getStatusBgColor(order.status),
      className
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Ordem em Andamento
          </div>
          <Badge
            variant="secondary"
            className="bg-white/70 text-gray-700 border border-gray-200"
          >
            {getStatusLabel(order.status)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cliente e Equipamento */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{order.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
            </span>
          </div>
        </div>

        {/* Endereço */}
        {order.pickupAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <span className="text-sm text-muted-foreground">
              {order.pickupAddress}
            </span>
          </div>
        )}

        {/* Horário agendado */}
        {scheduledTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{scheduledTime}</span>
          </div>
        )}

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-muted-foreground">
              {currentStepIndex + 1} de {serviceFlow.length} etapas
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {Math.round(progress)}% concluído
          </div>
        </div>

        {/* Descrição */}
        {order.description && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{order.description}</p>
          </div>
        )}

        {/* Ações de Progresso */}
        {onUpdateStatus && (
          <div className="pt-2">
            <NextStatusButton
              serviceOrder={order}
              onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                return true;
              }}
            />
          </div>
        )}

        {/* Botão de Navegação */}
        {onNavigate && order.pickupAddress && (
          <div className="pt-2">
            <Button
              onClick={onNavigate}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Navegar
            </Button>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
          </div>
          
          {order.clientPhone && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-auto p-1"
              onClick={() => window.open(`tel:${order.clientPhone}`)}
            >
              <Phone className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
