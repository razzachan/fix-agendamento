import React from 'react';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Play, 
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { getServiceFlow, getCurrentStepIndex, getNextStatus } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/translations';
import { ProgressionManager } from './ProgressionManager';

interface QuickProgressButtonProps {
  orders: ServiceOrder[];
  onUpdateStatus: (orderId: string, status: string) => Promise<boolean>;
  variant?: 'compact' | 'full';
  className?: string;
}

export const QuickProgressButton: React.FC<QuickProgressButtonProps> = ({
  orders,
  onUpdateStatus,
  variant = 'compact',
  className = ''
}) => {
  // Analisar estado das ordens para determinar ação apropriada
  const analyzeOrdersState = () => {
    const activeOrders = orders.filter(order => 
      !['completed', 'cancelled', 'delivered'].includes(order.status)
    );

    if (activeOrders.length === 0) {
      return {
        type: 'completed',
        label: 'Concluído',
        description: 'Todas as ordens finalizadas',
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600',
        disabled: true
      };
    }

    // Verificar quantas ordens podem avançar
    const canAdvanceOrders = activeOrders.filter(order => {
      const attendanceType = order.serviceAttendanceType || 'em_domicilio';
      return getNextStatus(order.status, attendanceType as any) !== null;
    });

    if (canAdvanceOrders.length === 0) {
      return {
        type: 'waiting',
        label: 'Aguardando',
        description: 'Nenhuma ação disponível',
        icon: <Clock className="h-4 w-4" />,
        color: 'text-yellow-600',
        disabled: true
      };
    }

    // Verificar se todas têm o mesmo próximo status
    const nextStatuses = canAdvanceOrders.map(order => {
      const attendanceType = order.serviceAttendanceType || 'em_domicilio';
      return getNextStatus(order.status, attendanceType as any);
    }).filter(Boolean);

    const uniqueNextStatuses = [...new Set(nextStatuses)];

    if (uniqueNextStatuses.length === 1 && canAdvanceOrders.length > 1) {
      // Progressão em lote possível
      return {
        type: 'batch',
        label: variant === 'compact' ? 'Avançar Todos' : `Avançar ${canAdvanceOrders.length} Equipamentos`,
        description: `Para: ${translateStatus(uniqueNextStatuses[0]!)}`,
        icon: <ChevronRight className="h-4 w-4" />,
        color: 'text-[#e5b034]',
        disabled: false,
        count: canAdvanceOrders.length
      };
    }

    if (canAdvanceOrders.length === 1) {
      // Progressão individual
      const order = canAdvanceOrders[0];
      const attendanceType = order.serviceAttendanceType || 'em_domicilio';
      const nextStatus = getNextStatus(order.status, attendanceType as any);
      
      return {
        type: 'individual',
        label: variant === 'compact' ? 'Avançar' : 'Avançar Equipamento',
        description: `Para: ${translateStatus(nextStatus!)}`,
        icon: <Play className="h-4 w-4" />,
        color: 'text-[#e5b034]',
        disabled: false
      };
    }

    // Múltiplas ordens com status diferentes
    return {
      type: 'mixed',
      label: variant === 'compact' ? 'Avançar' : 'Progressão Seletiva',
      description: `${canAdvanceOrders.length} equipamentos prontos`,
      icon: <ChevronRight className="h-4 w-4" />,
      color: 'text-[#e5b034]',
      disabled: false,
      count: canAdvanceOrders.length
    };
  };

  const state = analyzeOrdersState();

  // Renderização compacta (para cards agrupados)
  if (variant === 'compact') {
    if (state.disabled) {
      return (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className={`h-8 px-2 ${state.color} ${className}`}
        >
          {state.icon}
          <span className="ml-1 text-xs">{state.label}</span>
        </Button>
      );
    }

    return (
      <ProgressionManager
        orders={orders}
        onUpdateStatus={onUpdateStatus}
        context="grouped"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 hover:bg-[#e5b034]/10 ${state.color} ${className}`}
          >
            {state.icon}
            <span className="ml-1 text-xs">{state.label}</span>
            {state.count && state.count > 1 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {state.count}
              </Badge>
            )}
          </Button>
        }
      />
    );
  }

  // Renderização completa (para área de detalhes)
  if (state.disabled) {
    return (
      <div className={`flex items-center gap-3 p-3 border rounded-lg bg-gray-50 ${className}`}>
        <div className={state.color}>
          {state.icon}
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-700">{state.label}</div>
          <div className="text-xs text-gray-500">{state.description}</div>
        </div>
      </div>
    );
  }

  return (
    <ProgressionManager
      orders={orders}
      onUpdateStatus={onUpdateStatus}
      context={orders.length > 1 ? 'grouped' : 'individual'}
      trigger={
        <div className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:border-[#e5b034] hover:bg-[#e5b034]/5 ${className}`}>
          <div className={state.color}>
            {state.icon}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{state.label}</div>
            <div className="text-xs text-gray-600">{state.description}</div>
          </div>
          <div className="flex items-center gap-2">
            {state.count && state.count > 1 && (
              <Badge variant="outline" className="text-xs">
                {state.count} equipamentos
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      }
    />
  );
};

export default QuickProgressButton;
