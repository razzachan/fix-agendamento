import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  Zap, 
  Calendar,
  Package,
  Truck,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType = 
  | 'delayed_repair'      // Reparo atrasado (+5 dias)
  | 'ready_for_pickup'    // Pronto para coleta
  | 'overdue_pickup'      // Coleta atrasada (+2 dias)
  | 'scheduled_today'     // Agendado para hoje
  | 'in_route'           // Em rota de entrega
  | 'active_repair'      // Reparo ativo (informativo)
  | 'urgent_action'      // Ação urgente necessária

interface AlertBadgeProps {
  type: AlertType;
  daysOverdue?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  customText?: string;
}

const alertConfigs = {
  delayed_repair: {
    icon: AlertTriangle,
    variant: 'destructive' as const,
    baseText: 'Atrasado',
    bgColor: 'bg-red-50 border-red-200 text-red-800',
    priority: 'high' as const
  },
  ready_for_pickup: {
    icon: Package,
    variant: 'secondary' as const,
    baseText: 'Pronto para Coleta',
    bgColor: 'bg-green-50 border-green-200 text-green-800',
    priority: 'medium' as const
  },
  overdue_pickup: {
    icon: Clock,
    variant: 'destructive' as const,
    baseText: 'Coleta Atrasada',
    bgColor: 'bg-orange-50 border-orange-200 text-orange-800',
    priority: 'high' as const
  },
  scheduled_today: {
    icon: Calendar,
    variant: 'default' as const,
    baseText: 'Agendado Hoje',
    bgColor: 'bg-blue-50 border-blue-200 text-blue-800',
    priority: 'medium' as const
  },
  in_route: {
    icon: Truck,
    variant: 'secondary' as const,
    baseText: 'Em Rota',
    bgColor: 'bg-purple-50 border-purple-200 text-purple-800',
    priority: 'medium' as const
  },
  active_repair: {
    icon: CheckCircle2,
    variant: 'outline' as const,
    baseText: 'Em Andamento',
    bgColor: 'bg-blue-50 border-blue-200 text-blue-700',
    priority: 'low' as const
  },
  urgent_action: {
    icon: Zap,
    variant: 'destructive' as const,
    baseText: 'Ação Urgente',
    bgColor: 'bg-red-50 border-red-200 text-red-800',
    priority: 'high' as const
  }
};

const sizeConfigs = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    icon: 'h-3 w-3',
    gap: 'gap-1'
  },
  md: {
    text: 'text-sm',
    padding: 'px-2.5 py-1',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1.5'
  },
  lg: {
    text: 'text-base',
    padding: 'px-3 py-1.5',
    icon: 'h-4 w-4',
    gap: 'gap-2'
  }
};

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  type,
  daysOverdue,
  className,
  size = 'md',
  showIcon = true,
  customText
}) => {
  const config = alertConfigs[type];
  const sizeConfig = sizeConfigs[size];
  const Icon = config.icon;

  // Texto dinâmico baseado no tipo e dias de atraso
  const getText = () => {
    if (customText) return customText;
    
    if (daysOverdue && daysOverdue > 0) {
      switch (type) {
        case 'delayed_repair':
          return `Atrasado ${daysOverdue}d`;
        case 'overdue_pickup':
          return `Atrasado ${daysOverdue}d`;
        default:
          return config.baseText;
      }
    }
    
    return config.baseText;
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        // Base styles
        'inline-flex items-center font-medium border transition-all duration-200',
        sizeConfig.text,
        sizeConfig.padding,
        sizeConfig.gap,

        // Color and background
        config.bgColor,

        // Hover effects
        'hover:shadow-sm hover:scale-105',

        // Custom className
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(sizeConfig.icon, 'flex-shrink-0')} />
      )}
      <span className="font-semibold">{getText()}</span>
    </Badge>
  );
};

// Hook para determinar o tipo de alerta baseado nos dados da ordem
export const useAlertType = (order: any): AlertType | null => {
  if (!order) return null;

  const now = new Date();
  // Usar updated_at se disponível, senão usar created_at
  const referenceDate = new Date(order.updated_at || order.created_at);
  const daysDiff = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));



  // Lógica para reparos
  if (order.status === 'in_progress') {
    if (daysDiff >= 5) return 'delayed_repair';
    return 'active_repair';
  }

  // Lógica para entregas
  if (order.status === 'ready_for_delivery' || order.status === 'ready_for_pickup') {
    if (daysDiff >= 2) return 'overdue_pickup';
    return 'ready_for_pickup';
  }

  // Status "paid" também deve mostrar badge
  if (order.status === 'paid') {
    if (daysDiff >= 2) return 'overdue_pickup';
    return 'ready_for_pickup';
  }

  // Agendamentos para hoje
  if (order.scheduled_date) {
    const scheduledDate = new Date(order.scheduled_date);
    const today = new Date().toDateString();
    if (scheduledDate.toDateString() === today) {
      return 'scheduled_today';
    }
  }

  // Em rota
  if (order.status === 'in_delivery_route') {
    return 'in_route';
  }

  return null;
};

// Hook para calcular dias de atraso
export const useDaysOverdue = (order: any): number => {
  if (!order) return 0;

  const now = new Date();
  // Usar updated_at se disponível, senão usar created_at
  const referenceDate = new Date(order.updated_at || order.created_at);
  return Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
};

export default AlertBadge;
