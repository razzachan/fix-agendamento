import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder } from '@/types';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrder: ServiceOrder;
  onConfirm: (cancellationReason: string) => void;
  isLoading?: boolean;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  serviceOrder,
  onConfirm,
  isLoading = false
}) => {
  const [cancellationReason, setCancellationReason] = useState('');

  console.log('🎯 [CancelOrderModal] Renderizando modal:', {
    isOpen,
    serviceOrderId: serviceOrder?.id,
    reasonLength: cancellationReason.length
  });

  const handleConfirm = () => {
    if (!cancellationReason.trim()) {
      toast.error('Motivo do cancelamento é obrigatório.');
      return;
    }

    if (cancellationReason.trim().length < 10) {
      toast.error('Motivo deve ter pelo menos 10 caracteres.');
      return;
    }

    console.log('🎯 [CancelOrderModal] Confirmando cancelamento:', {
      serviceOrderId: serviceOrder.id,
      reason: cancellationReason.trim()
    });

    onConfirm(cancellationReason.trim());
  };

  const handleClose = () => {
    setCancellationReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cancelar Ordem de Serviço
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p className="text-red-600 font-medium">
              ⚠️ Esta ação não pode ser desfeita!
            </p>
            <p>
              Você está prestes a cancelar a seguinte ordem de serviço:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Ordem:</strong> #{serviceOrder?.id}</p>
              <p><strong>Cliente:</strong> {serviceOrder?.clientName}</p>
              <p><strong>Equipamento:</strong> {serviceOrder?.equipmentType} {serviceOrder?.equipmentModel}</p>
              <p><strong>Status atual:</strong> {serviceOrder?.status}</p>
              <p><strong>Descrição:</strong> {serviceOrder?.description}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason" className="text-red-600 font-medium">
              Motivo do Cancelamento *
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Descreva detalhadamente o motivo do cancelamento (mínimo 10 caracteres)..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[100px] border-red-200 focus:border-red-400"
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Mínimo 10 caracteres</span>
              <span className={cancellationReason.length < 10 ? 'text-red-500' : 'text-green-600'}>
                {cancellationReason.length}/10
              </span>
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">Consequências do cancelamento:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• A ordem será marcada como cancelada</li>
              <li>• O cliente será notificado automaticamente</li>
              <li>• O motivo será registrado no histórico</li>
              <li>• Esta ação não pode ser revertida</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!cancellationReason.trim() || cancellationReason.trim().length < 10 || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
