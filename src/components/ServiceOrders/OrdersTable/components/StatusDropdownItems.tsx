
import React from 'react';
import { ServiceOrderStatus } from '@/types';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ServiceFlowStep } from '@/utils/serviceFlowUtils';
import { Check } from 'lucide-react';

interface StatusDropdownItemsProps {
  serviceFlow: ServiceFlowStep[];
  currentStatus: ServiceOrderStatus;
  onStatusClick: (status: ServiceOrderStatus) => (e: React.MouseEvent) => void;
}

const StatusDropdownItems: React.FC<StatusDropdownItemsProps> = ({
  serviceFlow,
  currentStatus,
  onStatusClick
}) => {

  return (
    <>
      {serviceFlow.map((step) => {
        const handleClick = (e: React.MouseEvent) => {
          // CRÍTICO: Prevenir propagação IMEDIATAMENTE
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();

          // Verificar se não é o status atual
          if (currentStatus === step.status) {
            return;
          }

          try {
            // Chamar a função original de forma síncrona
            const originalHandler = onStatusClick(step.status as ServiceOrderStatus);
            if (originalHandler) {
              // Executar de forma síncrona para evitar problemas de timing
              originalHandler(e);
            }
          } catch (error) {
            console.error(`❌ [StatusDropdownItems] Erro ao executar handler:`, error);
          }
        };

        return (
          <DropdownMenuItem
            key={step.status}
            onClick={handleClick}
            onSelect={handleClick}
            disabled={currentStatus === step.status}
            className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer
              ${currentStatus === step.status ? 'bg-muted opacity-50' : 'hover:bg-primary/5'}`}
            data-status={step.status}
          >
            <div className="flex items-center gap-2">
              {step.icon}
              <span>{step.label}</span>
            </div>
            {currentStatus === step.status && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        );
      })}
    </>
  );
};

export default StatusDropdownItems;
