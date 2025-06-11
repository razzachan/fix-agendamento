import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder } from '@/types';
import {
  Clock,
  MapPin,
  User,
  Wrench,
  Phone,
  Calendar,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Home,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceFlow, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hasOrderValue } from '@/utils/orderValue';
import OrderValue from '../ServiceOrders/OrderValue';

interface ModernOrderCardProps {
  order: ServiceOrder;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    label: string;
  }> = {
    'scheduled': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      icon: <Calendar className="w-4 h-4" />,
      label: 'Agendado'
    },
    'on_the_way': {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50/70',
      borderColor: 'border-yellow-200',
      icon: <ArrowRight className="w-4 h-4" />,
      label: 'A Caminho'
    },
    'in_progress': {
      color: 'text-green-700',
      bgColor: 'bg-green-50/70',
      borderColor: 'border-green-200',
      icon: <Wrench className="w-4 h-4" />,
      label: 'Em Progresso'
    },
    'collected': {
      color: 'text-purple-700',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-200',
      icon: <Package className="w-4 h-4" />,
      label: 'Coletado'
    },
    'at_workshop': {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50/70',
      borderColor: 'border-orange-200',
      icon: <Wrench className="w-4 h-4" />,
      label: 'Na Oficina'
    },
    'completed': {
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Concluído'
    },
    'cancelled': {
      color: 'text-red-700',
      bgColor: 'bg-red-50/70',
      borderColor: 'border-red-200',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Cancelado'
    }
  };

  return configs[status] || configs['scheduled'];
};

const getAttendanceTypeConfig = (type: string) => {
  const configs: Record<string, {
    icon: React.ReactNode;
    label: string;
    color: string;
  }> = {
    'em_domicilio': {
      icon: <Home className="w-3 h-3" />,
      label: 'Em Domicílio',
      color: 'bg-blue-100 text-blue-800'
    },
    'coleta_conserto': {
      icon: <Package className="w-3 h-3" />,
      label: 'Coleta Conserto',
      color: 'bg-purple-100 text-purple-800'
    },
    'coleta_diagnostico': {
      icon: <Wrench className="w-3 h-3" />,
      label: 'Coleta Diagnóstico',
      color: 'bg-orange-100 text-orange-800'
    }
  };
  
  return configs[type] || configs['em_domicilio'];
};

export const ModernOrderCard: React.FC<ModernOrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  className
}) => {
  const statusConfig = getStatusConfig(order.status);
  const attendanceConfig = getAttendanceTypeConfig(order.serviceAttendanceType || 'em_domicilio');
  
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
    <Card 
      className={cn(
        'transition-all duration-300 cursor-pointer group hover:shadow-lg',
        statusConfig.bgColor,
        statusConfig.borderColor,
        'border-l-4',
        isSelected && 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]',
        className
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header com status e tipo */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={cn('flex items-center gap-1', statusConfig.color)}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={cn('text-xs flex items-center gap-1', attendanceConfig.color)}
          >
            {attendanceConfig.icon}
            {attendanceConfig.label}
          </Badge>
        </div>

        {/* Informações principais */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{order.clientName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
            </span>
          </div>

          {/* Valor da Ordem */}
          {hasOrderValue(order) && (
            <OrderValue order={order} size="sm" />
          )}

          {order.pickupAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-xs text-muted-foreground line-clamp-2">
                {order.pickupAddress}
              </span>
            </div>
          )}

          {scheduledTime && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{scheduledTime}</span>
            </div>
          )}
        </div>

        {/* Progresso */}
        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-xs text-muted-foreground">
                {currentStepIndex + 1}/{serviceFlow.length}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Descrição */}
        {order.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 bg-white/50 p-2 rounded">
            {order.description}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <span className="text-xs text-muted-foreground">
            OS #{order.id.substring(0, 8)}
          </span>
          
          <div className="flex items-center gap-1">
            {order.clientPhone && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${order.clientPhone}`);
                }}
              >
                <Phone className="w-3 h-3" />
              </Button>
            )}
            
            <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
