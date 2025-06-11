import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Loader2 } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { warrantyService } from '@/services/warranty/warrantyService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WarrantyConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrder: ServiceOrder;
  onWarrantyUpdated: (updatedOrder: ServiceOrder) => void;
}

/**
 * Diálogo para configurar a garantia de uma ordem de serviço
 */
const WarrantyConfigDialog: React.FC<WarrantyConfigDialogProps> = ({
  isOpen,
  onClose,
  serviceOrder,
  onWarrantyUpdated
}) => {
  const [warrantyPeriod, setWarrantyPeriod] = useState<number>(
    serviceOrder.warrantyPeriod || 3
  );
  const [warrantyTerms, setWarrantyTerms] = useState<string>(
    serviceOrder.warrantyTerms || 'Garantia padrão de peças e serviços.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (warrantyPeriod <= 0) {
      toast.error('O período de garantia deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await warrantyService.updateWarrantyInfo(
        serviceOrder.id,
        warrantyPeriod,
        warrantyTerms
      );

      if (success) {
        toast.success('Informações de garantia atualizadas com sucesso!');

        // Buscar a ordem de serviço atualizada do backend
        try {
          const { data: updatedOrderData, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', serviceOrder.id)
            .single();

          if (error) {
            console.error('Erro ao buscar ordem atualizada:', error);
          } else {
            console.log('WarrantyConfigDialog: Dados da ordem atualizados do backend', {
              id: updatedOrderData.id,
              warrantyPeriod: updatedOrderData.warranty_period,
              warrantyStartDate: updatedOrderData.warranty_start_date,
              warrantyEndDate: updatedOrderData.warranty_end_date,
              warrantyTerms: updatedOrderData.warranty_terms
            });

            // Mapear os dados do backend para o formato da interface ServiceOrder
            const updatedOrder: ServiceOrder = {
              ...serviceOrder,
              warrantyPeriod: updatedOrderData.warranty_period,
              warrantyTerms: updatedOrderData.warranty_terms,
              warrantyStartDate: updatedOrderData.warranty_start_date,
              warrantyEndDate: updatedOrderData.warranty_end_date
            };

            // Atualizar a ordem de serviço com os dados reais do backend
            onWarrantyUpdated(updatedOrder);

            // Fechar o diálogo após atualização bem-sucedida
            onClose();
          }
        } catch (fetchError) {
          console.error('Erro ao buscar ordem atualizada:', fetchError);
          toast.error('Erro ao buscar dados atualizados. Tente recarregar a página.');
        }
      } else {
        toast.error('Erro ao atualizar informações de garantia.');
      }
    } catch (error) {
      console.error('Erro ao atualizar informações de garantia:', error);
      toast.error('Erro ao atualizar informações de garantia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Configurar Garantia
          </DialogTitle>
          <DialogDescription>
            Configure as informações de garantia para a ordem de serviço #{serviceOrder.id.substring(0, 8)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="warrantyPeriod">Período de Garantia (meses)</Label>
            <Input
              id="warrantyPeriod"
              type="number"
              min="1"
              max="60"
              value={warrantyPeriod}
              onChange={(e) => setWarrantyPeriod(parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-muted-foreground">
              Período padrão de garantia é de 3 meses.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyTerms">Termos da Garantia</Label>
            <Textarea
              id="warrantyTerms"
              placeholder="Descreva os termos e condições da garantia..."
              value={warrantyTerms}
              onChange={(e) => setWarrantyTerms(e.target.value)}
              rows={5}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> A garantia só será válida após a conclusão do serviço.
              {serviceOrder.status !== 'completed' && ' Esta ordem ainda não foi concluída.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Salvar Garantia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarrantyConfigDialog;
