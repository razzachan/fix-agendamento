import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import technicianStockService, { TechnicianStock } from '@/services/technicianStockService';
import { useStockEventEmitter } from '@/hooks/useStockUpdateEvents';
import { toast } from 'sonner';

interface StockRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TechnicianStock;
  onSuccess: () => void;
}

export const StockRequestDialog: React.FC<StockRequestDialogProps> = ({
  open,
  onOpenChange,
  item,
  onSuccess
}) => {
  const { user } = useAuth();
  const { emitStockEvent } = useStockEventEmitter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Resetar campos quando o dialog abre
  useEffect(() => {
    if (open) {
      // Sugerir quantidade para atingir o estoque mínimo
      const suggestedQuantity = Math.max(1, item.min_quantity - item.current_quantity);
      setRequestedQuantity(suggestedQuantity);
      
      // Definir motivo baseado no status
      if (item.stock_status === 'out_of_stock') {
        setReason('Item sem estoque - necessário para atendimentos');
        setPriority('high');
      } else if (item.stock_status === 'low_stock') {
        setReason('Estoque baixo - reposição preventiva');
        setPriority('normal');
      } else {
        setReason('');
        setPriority('normal');
      }
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!user?.id || !reason.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (requestedQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero.');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await technicianStockService.requestRestock(
        user.id,
        item.item.code,
        requestedQuantity,
        reason.trim(),
        priority
      );

      if (success) {
        // Emitir evento de solicitação
        emitStockEvent(
          'stock_requested',
          user.id,
          'StockRequestDialog',
          {
            itemCode: item.item.code,
            quantity: requestedQuantity
          }
        );

        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao solicitar reposição:', error);
      toast.error('Erro ao enviar solicitação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'low_stock':
        return 'Estoque Baixo';
      case 'out_of_stock':
        return 'Sem Estoque';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'Alta';
      case 'urgent':
        return 'Urgente';
      default:
        return priority;
    }
  };

  const estimatedCost = requestedQuantity * item.item.unit_cost;
  const newTotal = item.current_quantity + requestedQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Solicitar Reposição de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Item */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold">{item.item.name}</h3>
              <Badge className={getStatusColor(item.stock_status)}>
                {getStatusLabel(item.stock_status)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Código:</span> {item.item.code}
              </div>
              <div>
                <span className="font-medium">Atual:</span> {item.current_quantity} un.
              </div>
              <div>
                <span className="font-medium">Mínimo:</span> {item.min_quantity} un.
              </div>
              <div>
                <span className="font-medium">Máximo:</span> {item.max_quantity} un.
              </div>
              <div>
                <span className="font-medium">Local:</span> {item.location_in_vehicle || 'Não definido'}
              </div>
              <div>
                <span className="font-medium">Custo Unit.:</span> R$ {item.item.unit_cost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quantidade Solicitada */}
          <div>
            <Label htmlFor="requestedQuantity">Quantidade Solicitada *</Label>
            <Input
              id="requestedQuantity"
              type="number"
              min="1"
              max={item.max_quantity}
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo da van: {item.max_quantity} unidades
            </p>
          </div>

          {/* Prioridade */}
          <div>
            <Label htmlFor="priority">Prioridade da Solicitação *</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-800">Baixa</Badge>
                    <span>Reposição de rotina</span>
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">Normal</Badge>
                    <span>Reposição padrão</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800">Alta</Badge>
                    <span>Necessário em breve</span>
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800">Urgente</Badge>
                    <span>Necessário hoje</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa */}
          <div>
            <Label htmlFor="reason">Justificativa da Solicitação *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Item necessário para atendimentos agendados, estoque zerado após último reparo..."
              rows={3}
            />
          </div>

          {/* Alertas baseados na prioridade */}
          {priority === 'urgent' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                <strong>Urgente:</strong> Esta solicitação será priorizada para entrega hoje.
              </span>
            </div>
          )}

          {priority === 'high' && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                <strong>Alta prioridade:</strong> Entrega prevista em 1-2 dias úteis.
              </span>
            </div>
          )}

          {/* Resumo da Solicitação */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Resumo da Solicitação:</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Estoque atual:</span>
                <span className="font-medium">{item.current_quantity} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Quantidade solicitada:</span>
                <span className="font-medium text-blue-600">+{requestedQuantity} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Estoque após entrega:</span>
                <span className="font-bold">{newTotal} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Custo estimado:</span>
                <span className="font-medium">R$ {estimatedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Prioridade:</span>
                <Badge className={getPriorityColor(priority)}>
                  {getPriorityLabel(priority)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Informações sobre o processo */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Processo de Aprovação:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Solicitação será enviada para o administrador</div>
              <div>• Você receberá notificação sobre aprovação/rejeição</div>
              <div>• Itens aprovados serão entregues conforme prioridade</div>
              <div>• Acompanhe o status no painel de solicitações</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing || !reason.trim() || requestedQuantity <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
