import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Calendar, Clock } from 'lucide-react';
import { warrantyService } from '@/services/warranty/warrantyService';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreateWarrantyOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalOrderId: string;
}

/**
 * Diálogo para criar uma nova ordem de serviço em garantia
 */
const CreateWarrantyOrderDialog: React.FC<CreateWarrantyOrderDialogProps> = ({
  isOpen,
  onClose,
  originalOrderId
}) => {
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState(
    format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), 'HH:mm')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Por favor, descreva o problema para o atendimento em garantia.');
      return;
    }

    if (!scheduledDate) {
      toast.error('Por favor, defina uma data para o agendamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Criar data completa a partir da data e hora fornecidas
      let fullScheduledDate = null;
      if (scheduledDate) {
        try {
          // Criar data a partir dos campos separados
          const dateStr = scheduledDate;
          const timeStr = scheduledTime || '12:00'; // Usar meio-dia como padrão se não houver hora

          // Combinar data e hora
          const dateTimeStr = `${dateStr}T${timeStr}:00`;
          fullScheduledDate = new Date(dateTimeStr).toISOString();
        } catch (error) {
          console.error('Erro ao processar data e hora:', error);
          toast.error('Formato de data ou hora inválido');
          setIsSubmitting(false);
          return;
        }
      }

      const newOrder = await warrantyService.createWarrantyOrder(
        originalOrderId,
        description,
        fullScheduledDate,
        scheduledTime
      );

      if (newOrder) {
        toast.success('Ordem de serviço em garantia criada com sucesso!');
        onClose();
        navigate(`/orders/${newOrder.id}`);
      } else {
        toast.error('Erro ao criar ordem de serviço em garantia.');
      }
    } catch (error) {
      console.error('Erro ao criar ordem de serviço em garantia:', error);
      toast.error('Erro ao criar ordem de serviço em garantia.');
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
            Criar Atendimento em Garantia
          </DialogTitle>
          <DialogDescription>
            Crie uma nova ordem de serviço em garantia para a ordem #{originalOrderId}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Problema</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema que requer atendimento em garantia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          {/* Campos de data e hora */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Data do Agendamento
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Horário
              </Label>
              <Input
                id="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
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
                Criando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Criar Ordem em Garantia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWarrantyOrderDialog;
