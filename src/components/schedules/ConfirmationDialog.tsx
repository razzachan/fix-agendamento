
import React, { useState, useEffect } from 'react';
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
import { Calendar, Clock, AlertTriangle, MapPin, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { technicianService } from '@/services/technician/technicianService';
import { Technician } from '@/types';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (technicianId?: string) => void;
  title: string;
  description: string;
  actionText: string;
  agendamentoNome?: string;
  agendamentoEndereco?: string;
  actionType: 'confirm' | 'reschedule' | 'cancel';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText,
  agendamentoNome,
  agendamentoEndereco,
  actionType,
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carregar técnicos quando o diálogo for aberto
  useEffect(() => {
    if (isOpen && actionType === 'confirm') {
      loadTechnicians();
    }
  }, [isOpen, actionType]);

  // Função para carregar os técnicos
  const loadTechnicians = async () => {
    try {
      setIsLoading(true);
      const techniciansList = await technicianService.getAll();
      setTechnicians(techniciansList);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para lidar com a confirmação
  const handleConfirm = () => {
    if (actionType === 'confirm' && !selectedTechnicianId) {
      // Se for uma confirmação, exigir a seleção de um técnico
      alert('Por favor, selecione um técnico para confirmar o agendamento.');
      return;
    }

    // Chamar a função onConfirm com o ID do técnico selecionado (se for uma confirmação)
    onConfirm(actionType === 'confirm' ? selectedTechnicianId : undefined);
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {actionType === 'confirm' && <Calendar className="h-5 w-5 text-green-600" />}
            {actionType === 'reschedule' && <Clock className="h-5 w-5 text-blue-600" />}
            {actionType === 'cancel' && <AlertTriangle className="h-5 w-5 text-red-600" />}
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

          {actionType === 'reschedule' && (
            <div className="mt-2 text-sm text-blue-600">
              <p>Ao reagendar, você mantém o status como pendente e poderá definir uma nova data posteriormente.</p>
            </div>
          )}

          {actionType === 'confirm' && (
            <div className="mt-2">
              <div className="text-sm text-green-600 mb-4">
                <p>Ao confirmar, o status será atualizado para "confirmado" e o cliente será notificado.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-select" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Selecione um técnico
                </Label>
                <Select
                  value={selectedTechnicianId}
                  onValueChange={setSelectedTechnicianId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="technician-select" className="w-full">
                    <SelectValue placeholder="Selecione um técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.length === 0 && isLoading && (
                      <SelectItem value="loading" disabled>
                        Carregando técnicos...
                      </SelectItem>
                    )}
                    {technicians.length === 0 && !isLoading && (
                      <SelectItem value="none" disabled>
                        Nenhum técnico disponível
                      </SelectItem>
                    )}
                    {technicians.map((technician) => (
                      <SelectItem key={technician.id} value={technician.id}>
                        {technician.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {actionType === 'cancel' && (
            <div className="mt-2 text-sm text-red-600">
              <p>Ao cancelar, o agendamento será marcado como "cancelado" e não aparecerá mais na listagem padrão.</p>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`
              ${actionType === 'confirm' ? 'bg-green-500 hover:bg-green-600' : ''}
              ${actionType === 'reschedule' ? 'bg-blue-500 hover:bg-blue-600' : ''}
              ${actionType === 'cancel' ? 'bg-red-500 hover:bg-red-600' : ''}
            `}
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
