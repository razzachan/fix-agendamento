import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Package, CheckCircle } from 'lucide-react';
import { equipmentReceiptService } from '@/services/workshop/equipmentReceiptService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EquipmentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    service_attendance_type: string;
  } | null;
  onSuccess: () => void;
}

export function EquipmentReceiptDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  onSuccess 
}: EquipmentReceiptDialogProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmReceipt = async () => {
    if (!equipment || !user) return;

    setIsConfirming(true);
    try {
      const success = await equipmentReceiptService.confirmReceipt(
        equipment.id,
        user.id,
        notes.trim() || undefined
      );

      if (success) {
        toast.success('Recebimento confirmado com sucesso!');
        setNotes('');
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast.error('Erro ao confirmar recebimento.');
    } finally {
      setIsConfirming(false);
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return 'Coleta para Diagnóstico';
      case 'coleta_conserto':
        return 'Coleta para Conserto';
      case 'em_domicilio':
        return 'Atendimento Domiciliar';
      default:
        return type;
    }
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Confirmar Recebimento de Equipamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Equipamento */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">Detalhes do Equipamento</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Cliente:</span>
                <p className="font-medium">{equipment.client_name}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Equipamento:</span>
                <p className="font-medium">{equipment.equipment_type}</p>
              </div>
              
              {equipment.equipment_model && (
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <p className="font-medium">{equipment.equipment_model}</p>
                </div>
              )}
              
              <div>
                <span className="text-gray-600">Tipo de Serviço:</span>
                <p className="font-medium">{getServiceTypeLabel(equipment.service_attendance_type)}</p>
              </div>
            </div>
          </div>

          {/* Campo de Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre o estado do equipamento, acessórios recebidos, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Aviso sobre próximos passos */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Próximo passo:</strong> Após confirmar o recebimento, o equipamento ficará disponível para 
              {equipment.service_attendance_type === 'coleta_diagnostico' 
                ? ' diagnóstico técnico.' 
                : ' início do reparo.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmReceipt}
            disabled={isConfirming}
            className="bg-green-600 hover:bg-green-700"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Recebimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
