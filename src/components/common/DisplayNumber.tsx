/**
 * Componente universal para exibir números sequenciais
 * Detecta automaticamente se é ordem de serviço (OS #001) ou pré-agendamento (AG #001)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useDisplayNumber } from '@/hooks/useOrderNumber';
import { detectItemType, getDisplayNumber } from '@/utils/orderNumberUtils';
import { FileText, Calendar, Hash } from 'lucide-react';

interface DisplayNumberProps {
  item: any;
  index?: number;
  variant?: 'default' | 'badge' | 'inline' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function DisplayNumber({ 
  item, 
  index, 
  variant = 'default',
  size = 'md',
  showIcon = false,
  className = ''
}: DisplayNumberProps) {
  const displayNumber = useDisplayNumber(item, index);
  const itemType = detectItemType(item);

  // Determinar ícone baseado no tipo
  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (itemType) {
      case 'service_order':
        return <FileText className="h-3 w-3" />;
      case 'pre_schedule':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Hash className="h-3 w-3" />;
    }
  };

  // Determinar cores baseado no tipo
  const getColors = () => {
    switch (itemType) {
      case 'service_order':
        return {
          text: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
        };
      case 'pre_schedule':
        return {
          text: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-green-200 dark:border-green-800',
          badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
        };
      default:
        return {
          text: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          border: 'border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200'
        };
    }
  };

  const colors = getColors();
  const icon = getIcon();

  // Determinar tamanhos
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return {
          text: 'text-xs',
          padding: 'px-1.5 py-0.5',
          iconSize: 'h-2.5 w-2.5'
        };
      case 'lg':
        return {
          text: 'text-base',
          padding: 'px-3 py-1.5',
          iconSize: 'h-4 w-4'
        };
      default:
        return {
          text: 'text-sm',
          padding: 'px-2 py-1',
          iconSize: 'h-3 w-3'
        };
    }
  };

  const sizes = getSizes();

  // Renderizar baseado na variante
  switch (variant) {
    case 'badge':
      return (
        <Badge 
          variant="outline" 
          className={`${colors.badge} ${sizes.text} ${sizes.padding} font-medium ${className}`}
        >
          {icon && <span className="mr-1">{icon}</span>}
          {displayNumber}
        </Badge>
      );

    case 'inline':
      return (
        <span className={`${colors.text} ${sizes.text} font-medium inline-flex items-center gap-1 ${className}`}>
          {icon}
          {displayNumber}
        </span>
      );

    case 'card':
      return (
        <div className={`
          ${colors.bg} ${colors.border} ${colors.text} 
          ${sizes.text} ${sizes.padding}
          border rounded-md font-medium inline-flex items-center gap-1.5
          ${className}
        `}>
          {icon}
          {displayNumber}
        </div>
      );

    default:
      return (
        <div className={`${colors.text} ${sizes.text} font-medium inline-flex items-center gap-1 ${className}`}>
          {icon}
          {displayNumber}
        </div>
      );
  }
}

/**
 * Componente específico para ordens de serviço (compatibilidade)
 */
export function OrderNumber({ order, index, ...props }: Omit<DisplayNumberProps, 'item'> & { order: any }) {
  return <DisplayNumber item={order} index={index} {...props} />;
}

/**
 * Componente específico para pré-agendamentos
 */
export function ScheduleNumber({ schedule, index, ...props }: Omit<DisplayNumberProps, 'item'> & { schedule: any }) {
  return <DisplayNumber item={schedule} index={index} {...props} />;
}

/**
 * Hook para obter apenas o número formatado (sem componente)
 */
export function useFormattedNumber(item: any, index?: number): string {
  return getDisplayNumber(item, index);
}

export default DisplayNumber;
