import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder } from '@/types';
import { WarrantyStatus } from '@/types/warranty';
import { warrantyService } from '@/services/warranty/warrantyService';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WarrantyBadgeProps {
  serviceOrder: ServiceOrder;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente que exibe um badge com o status de garantia de uma ordem de serviço
 */
const WarrantyBadge: React.FC<WarrantyBadgeProps> = ({ serviceOrder, size = 'md' }) => {
  const warrantyStatus = warrantyService.getWarrantyStatus(serviceOrder);
  
  // Se não tiver garantia, não exibe o badge
  if (warrantyStatus === WarrantyStatus.NOT_APPLICABLE) {
    return null;
  }
  
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-0.5 px-2',
    lg: 'text-base py-1 px-2.5',
  };
  
  // Configurações com base no status
  const getStatusConfig = () => {
    switch (warrantyStatus) {
      case WarrantyStatus.IN_WARRANTY:
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5 mr-1" />,
          label: 'Em Garantia',
          className: 'bg-green-100 text-green-800 border-green-300',
          tooltipContent: getWarrantyTooltip()
        };
      case WarrantyStatus.EXPIRED:
        return {
          icon: <ShieldX className="h-3.5 w-3.5 mr-1" />,
          label: 'Garantia Expirada',
          className: 'bg-gray-100 text-gray-800 border-gray-300',
          tooltipContent: `Garantia expirada em ${format(new Date(serviceOrder.warrantyEndDate!), 'dd/MM/yyyy')}`
        };
      case WarrantyStatus.WARRANTY_SERVICE:
        return {
          icon: <ShieldAlert className="h-3.5 w-3.5 mr-1" />,
          label: 'Atendimento em Garantia',
          className: 'bg-blue-100 text-blue-800 border-blue-300',
          tooltipContent: `Atendimento em garantia da ordem #${serviceOrder.relatedWarrantyOrderId}`
        };
      default:
        return {
          icon: <Shield className="h-3.5 w-3.5 mr-1" />,
          label: 'Garantia',
          className: 'bg-gray-100 text-gray-800 border-gray-300',
          tooltipContent: 'Informações de garantia'
        };
    }
  };
  
  // Gera o conteúdo do tooltip para garantias ativas
  const getWarrantyTooltip = () => {
    if (!serviceOrder.warrantyEndDate) return 'Informações de garantia não disponíveis';
    
    const endDate = new Date(serviceOrder.warrantyEndDate);
    const daysRemaining = differenceInDays(endDate, new Date());
    
    return (
      <>
        <p>Garantia válida até {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        <p>{daysRemaining} dias restantes</p>
        {serviceOrder.warrantyPeriod && (
          <p>Período de garantia: {serviceOrder.warrantyPeriod} meses</p>
        )}
      </>
    );
  };
  
  const config = getStatusConfig();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`warranty-badge ${config.className} ${sizeClasses[size]} flex items-center`}
          >
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {config.tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WarrantyBadge;
