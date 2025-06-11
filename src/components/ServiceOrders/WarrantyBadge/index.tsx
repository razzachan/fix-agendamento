import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { warrantyService } from '@/services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WarrantyBadgeProps {
  serviceOrder: ServiceOrder;
  size?: 'sm' | 'md' | 'lg';
}

const WarrantyBadge: React.FC<WarrantyBadgeProps> = ({ serviceOrder, size = 'md' }) => {
  const [warrantyStatus, setWarrantyStatus] = useState<{ inWarranty: boolean, daysRemaining: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar se a ordem tem garantia configurada
  const hasWarrantyConfig = Boolean(
    serviceOrder.warrantyPeriod && 
    serviceOrder.warrantyStartDate && 
    serviceOrder.warrantyEndDate
  );

  // Verificar se esta é uma ordem em garantia
  const isWarrantyOrder = Boolean(serviceOrder.relatedWarrantyOrderId);

  // Carregar status de garantia
  useEffect(() => {
    const loadWarrantyStatus = async () => {
      if (!serviceOrder.id || !hasWarrantyConfig) return;
      
      setIsLoading(true);
      try {
        const status = await warrantyService.checkWarrantyStatus(serviceOrder.id);
        setWarrantyStatus(status);
      } catch (error) {
        console.error('Erro ao verificar status de garantia:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWarrantyStatus();
  }, [serviceOrder.id, hasWarrantyConfig]);

  // Se não houver configuração de garantia e não for uma ordem em garantia, não exibir nada
  if (!hasWarrantyConfig && !isWarrantyOrder) {
    return null;
  }

  // Classes de tamanho
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-0.5 px-2',
    lg: 'text-base py-1 px-2.5',
  };

  // Se for uma ordem em garantia
  if (isWarrantyOrder) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-green-100 text-green-800 border-green-400 ${sizeClasses[size]}`}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Em Garantia
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta é uma ordem de serviço em garantia</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se estiver carregando
  if (isLoading) {
    return (
      <Badge 
        variant="outline" 
        className={`bg-gray-100 text-gray-800 border-gray-400 ${sizeClasses[size]}`}
      >
        <Shield className="h-3 w-3 mr-1" />
        Verificando...
      </Badge>
    );
  }

  // Se estiver em garantia
  if (warrantyStatus?.inWarranty) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-blue-100 text-blue-800 border-blue-400 ${sizeClasses[size]}`}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Garantia Ativa
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {warrantyStatus.daysRemaining !== null ? (
              <p>Garantia válida por mais {warrantyStatus.daysRemaining} dias</p>
            ) : (
              <p>Garantia ativa</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se a garantia estiver expirada
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`bg-amber-100 text-amber-800 border-amber-400 ${sizeClasses[size]}`}
          >
            <ShieldAlert className="h-3 w-3 mr-1" />
            Garantia Expirada
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>A garantia para esta ordem de serviço expirou</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WarrantyBadge;
