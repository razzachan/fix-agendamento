import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ServiceOrder } from '@/types';
import { warrantyService } from '@/services/api';
import { Shield, ShieldCheck } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isCompletionStatus } from '@/utils/serviceFlowUtils';

interface WarrantyActivationProps {
  serviceOrder: ServiceOrder;
  onActivateWarranty: (serviceOrderId: string) => Promise<boolean>;
}

/**
 * Componente para ativação de garantia
 * Exibido quando a ordem de serviço está concluída e a garantia ainda não foi ativada
 */
const WarrantyActivation: React.FC<WarrantyActivationProps> = ({ 
  serviceOrder, 
  onActivateWarranty 
}) => {
  const [isActivating, setIsActivating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Verificar se a ordem tem garantia configurada
  const hasWarrantyConfig = Boolean(
    serviceOrder.warrantyPeriod && 
    !serviceOrder.warrantyStartDate && 
    !serviceOrder.warrantyEndDate
  );

  // Verificar se a ordem está concluída
  const isCompleted = isCompletionStatus(serviceOrder.status);

  // Se a ordem não estiver concluída ou não tiver garantia configurada, não exibir nada
  if (!isCompleted || !hasWarrantyConfig) {
    return null;
  }

  const handleActivateWarranty = async () => {
    if (isActivating) return;
    
    setIsActivating(true);
    try {
      const success = await onActivateWarranty(serviceOrder.id);
      
      if (success) {
        toast.success('Garantia ativada com sucesso!');
        setIsDialogOpen(false);
      } else {
        toast.error('Erro ao ativar garantia.');
      }
    } catch (error) {
      console.error('Erro ao ativar garantia:', error);
      toast.error('Erro ao processar solicitação.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="mt-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Ativar Garantia
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Garantia</DialogTitle>
            <DialogDescription>
              A garantia será ativada a partir de hoje por um período de {serviceOrder.warrantyPeriod} meses.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <p className="text-blue-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-500" />
                <span>
                  Ao ativar a garantia, a data de início será definida como hoje e a data de término será calculada automaticamente.
                </span>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleActivateWarranty}
              disabled={isActivating}
            >
              {isActivating ? 'Ativando...' : 'Confirmar Ativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarrantyActivation;
