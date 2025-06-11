import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Route } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AgendamentoAI } from '@/services/agendamentos';
import { format } from 'date-fns';

interface RoutingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (agendamentoId: string, scheduledDate: string) => void;
  title: string;
  description: string;
  actionText: string;
  agendamentoId: string;
  agendamentoNome?: string;
  agendamentoEndereco?: string;
}

const RoutingDialog: React.FC<RoutingDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText,
  agendamentoId,
  agendamentoNome,
  agendamentoEndereco,
}) => {
  // Estado para armazenar a data e hora selecionadas
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  
  // Função para lidar com a confirmação
  const handleConfirm = () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Por favor, selecione uma data e hora para o agendamento.');
      return;
    }
    
    // Combinar data e hora em um formato ISO
    const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
    onConfirm(agendamentoId, dateTimeString);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-purple-600" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="pb-2">
            {description}
          </AlertDialogDescription>
          
          {agendamentoNome && agendamentoEndereco && (
            <div className="border rounded-md p-4 bg-muted/20 my-2">
              <div className="font-medium">{agendamentoNome}</div>
              <div className="text-sm text-muted-foreground flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {agendamentoEndereco}
              </div>
            </div>
          )}
          
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled-date" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Data do Agendamento
              </Label>
              <Input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduled-time" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Horário do Agendamento
              </Label>
              <Input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="mt-2 text-sm text-purple-600">
              <p>Ao roteirizar, o status será atualizado para "roteirizado" e a data e hora serão definidas.</p>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RoutingDialog;
