import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Minus, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import technicianStockService, { TechnicianStock } from '@/services/technicianStockService';
import { useStockEventEmitter } from '@/hooks/useStockUpdateEvents';
import { toast } from 'sonner';

interface StockConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TechnicianStock;
  onSuccess: () => void;
}

export const StockConsumptionDialog: React.FC<StockConsumptionDialogProps> = ({
  open,
  onOpenChange,
  item,
  onSuccess
}) => {
  const { user } = useAuth();
  const { serviceOrders } = useAppData();
  const { emitStockEvent } = useStockEventEmitter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [serviceOrderId, setServiceOrderId] = useState('manual');
  const [location, setLocation] = useState('');

  // Filtrar ordens de serviço do técnico que estão em andamento
  const technicianOrders = serviceOrders.filter(order => 
    order.assignedTechnician === user?.id && 
    (order.status === 'in_progress' || order.status === 'scheduled')
  );

  // Resetar campos quando o dialog abre
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setReason('');
      setServiceOrderId('manual');
      setLocation('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user?.id || !reason.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (quantity <= 0 || quantity > item.current_quantity) {
      toast.error('Quantidade inválida.');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await technicianStockService.consumeStock(
        user.id,
        item.item.code,
        quantity,
        serviceOrderId === 'manual' ? 'manual' : serviceOrderId,
        reason.trim(),
        location.trim() || undefined
      );

      if (success) {
        toast.success('Item consumido do estoque com sucesso!');

        // Emitir evento de consumo
        emitStockEvent(
          'stock_consumed',
          user.id,
          'StockConsumptionDialog',
          {
            itemCode: item.item.code,
            quantity
          }
        );

        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao consumir estoque:', error);
      toast.error('Erro ao consumir item do estoque.');
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

  const willBeLowStock = (item.current_quantity - quantity) <= item.min_quantity;
  const willBeOutOfStock = (item.current_quantity - quantity) === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-600" />
            Consumir Item do Estoque
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
                <span className="font-medium">Disponível:</span> {item.current_quantity} un.
              </div>
              <div>
                <span className="font-medium">Local:</span> {item.location_in_vehicle || 'Não definido'}
              </div>
              <div>
                <span className="font-medium">Valor Unit.:</span> R$ {item.item.sale_price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <Label htmlFor="quantity">Quantidade a Consumir *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item.current_quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo disponível: {item.current_quantity} unidades
            </p>
          </div>

          {/* Ordem de Serviço (Opcional) */}
          <div>
            <Label htmlFor="serviceOrder">Ordem de Serviço (Opcional)</Label>
            <Select value={serviceOrderId} onValueChange={setServiceOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma OS (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Consumo manual</SelectItem>
                {technicianOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    OS #{order.id.slice(-8)} - {order.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="reason">Motivo do Consumo *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Usado no reparo do forno elétrico, substituição de fusível queimado..."
              rows={3}
            />
          </div>

          {/* Local (Opcional) */}
          <div>
            <Label htmlFor="location">Local do Atendimento (Opcional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Centro"
            />
          </div>

          {/* Alertas */}
          {willBeOutOfStock && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                <strong>Atenção:</strong> Este item ficará sem estoque após o consumo.
              </span>
            </div>
          )}

          {willBeLowStock && !willBeOutOfStock && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                <strong>Aviso:</strong> Este item ficará com estoque baixo após o consumo.
              </span>
            </div>
          )}

          {/* Resumo */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Estoque atual:</span>
                <span className="font-medium">{item.current_quantity} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Quantidade a consumir:</span>
                <span className="font-medium text-red-600">-{quantity} un.</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Estoque após consumo:</span>
                <span className="font-bold">{item.current_quantity - quantity} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Valor consumido:</span>
                <span className="font-medium">R$ {(quantity * item.item.sale_price).toFixed(2)}</span>
              </div>
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
            disabled={isProcessing || !reason.trim() || quantity <= 0 || quantity > item.current_quantity}
            className="bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Minus className="mr-2 h-4 w-4" />
                Consumir Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
