import React, { useState } from 'react';
import { ServiceOrder } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  UserCheck, 
  Calendar, 
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface RecycleOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder | null;
  onRecycle: (orderId: string, recycleType: RecycleType, options: RecycleOptions) => Promise<void>;
}

export type RecycleType = 
  | 'reschedule'      // Reagendar
  | 'reassign'        // Reatribuir técnico
  | 'reactivate'      // Reativar ordem
  | 'convert_type';   // Converter tipo de atendimento

export interface RecycleOptions {
  newTechnicianId?: string;
  newServiceType?: string;
  newScheduledDate?: string;
  reason: string;
  notes?: string;
}

const RecycleOrderDialog: React.FC<RecycleOrderDialogProps> = ({
  isOpen,
  onClose,
  order,
  onRecycle
}) => {
  const [recycleType, setRecycleType] = useState<RecycleType>('reschedule');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [newTechnicianId, setNewTechnicianId] = useState('');
  const [newServiceType, setNewServiceType] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRecycle = async () => {
    if (!order || !reason.trim()) return;

    setIsLoading(true);
    try {
      const options: RecycleOptions = {
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        newTechnicianId: newTechnicianId || undefined,
        newServiceType: newServiceType || undefined,
        newScheduledDate: newScheduledDate || undefined,
      };

      await onRecycle(order.id, recycleType, options);
      
      // Reset form
      setRecycleType('reschedule');
      setReason('');
      setNotes('');
      setNewTechnicianId('');
      setNewServiceType('');
      setNewScheduledDate('');
      
      onClose();
    } catch (error) {
      console.error('Erro ao reciclar ordem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecycleTypeInfo = (type: RecycleType) => {
    switch (type) {
      case 'reschedule':
        return {
          icon: Calendar,
          title: 'Reagendar',
          description: 'Enviar para pré-agendamento para nova programação',
          color: 'blue'
        };
      case 'reassign':
        return {
          icon: UserCheck,
          title: 'Reatribuir',
          description: 'Transferir para outro técnico disponível',
          color: 'green'
        };
      case 'reactivate':
        return {
          icon: RefreshCw,
          title: 'Reativar',
          description: 'Voltar ao status anterior ao cancelamento',
          color: 'orange'
        };
      case 'convert_type':
        return {
          icon: Settings,
          title: 'Converter Tipo',
          description: 'Alterar tipo de atendimento (ex: domicílio → coleta)',
          color: 'purple'
        };
    }
  };

  if (!order) return null;

  const typeInfo = getRecycleTypeInfo(recycleType);
  const IconComponent = typeInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-600" />
            Reciclar Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Reprocessar ordem cancelada para reaproveitamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Ordem */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">OS #{order.id}</h4>
              <Badge variant="destructive">Cancelada</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.client_name} • {order.equipment_type} • {order.service_type}
            </p>
          </div>

          {/* Tipo de Reciclagem */}
          <div className="space-y-3">
            <Label>Tipo de Reciclagem</Label>
            <Select value={recycleType} onValueChange={(value) => setRecycleType(value as RecycleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reschedule">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Reagendar
                  </div>
                </SelectItem>
                <SelectItem value="reassign">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Reatribuir Técnico
                  </div>
                </SelectItem>
                <SelectItem value="reactivate">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reativar
                  </div>
                </SelectItem>
                <SelectItem value="convert_type">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Converter Tipo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Descrição do tipo selecionado */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <IconComponent className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">{typeInfo.title}</p>
                <p className="text-sm text-blue-700">{typeInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Campos específicos por tipo */}
          {recycleType === 'reassign' && (
            <div className="space-y-3">
              <Label>Novo Técnico</Label>
              <Select value={newTechnicianId} onValueChange={setNewTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech1">João Silva</SelectItem>
                  <SelectItem value="tech2">Maria Santos</SelectItem>
                  <SelectItem value="tech3">Pedro Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {recycleType === 'convert_type' && (
            <div className="space-y-3">
              <Label>Novo Tipo de Atendimento</Label>
              <Select value={newServiceType} onValueChange={setNewServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_domicilio">Em Domicílio</SelectItem>
                  <SelectItem value="coleta_diagnostico">Coleta para Diagnóstico</SelectItem>
                  <SelectItem value="coleta_conserto">Coleta para Conserto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {recycleType === 'reschedule' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Processo de Reagendamento</p>
                  <p className="text-sm text-blue-700 mt-1">
                    A ordem será enviada para o sistema de pré-agendamentos, onde o administrador
                    poderá programar uma nova data/horário seguindo o processo normal de agendamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Motivo obrigatório */}
          <div className="space-y-3">
            <Label>Motivo da Reciclagem *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo para reciclar esta ordem..."
              className="min-h-[80px]"
            />
          </div>

          {/* Observações opcionais */}
          <div className="space-y-3">
            <Label>Observações Adicionais</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre a reciclagem..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRecycle} 
            disabled={!reason.trim() || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Reciclando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Reciclar Ordem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecycleOrderDialog;
