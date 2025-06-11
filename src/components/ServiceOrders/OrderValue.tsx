import React from 'react';
import { ServiceOrder } from '@/types';
import { getOrderValueInfo } from '@/utils/orderValue';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface OrderValueProps {
  order: ServiceOrder;
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderValue: React.FC<OrderValueProps> = ({
  order,
  className = '',
  showTooltip = true,
  size = 'md'
}) => {
  const valueInfo = getOrderValueInfo(order);

  if (!valueInfo.hasValue) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className={`${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>💰</span>
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          A definir
        </span>
      </div>
    );
  }

  const content = (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>💰</span>
      <span className={`font-semibold text-green-600 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
        {valueInfo.displayValue}
      </span>
      {valueInfo.isPartial && showTooltip && (
        <Info className={`text-blue-500 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
      )}
    </div>
  );

  if (!showTooltip || !valueInfo.tooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{valueInfo.description}</p>
            <p className="text-xs text-muted-foreground">{valueInfo.tooltip}</p>
            {valueInfo.isPartial && (
              <p className="text-xs text-blue-600">* Valor parcial baseado no status atual</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OrderValue;
