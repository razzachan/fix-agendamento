import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import technicianStockService, { TechnicianStock } from '@/services/technicianStockService';
import { useStockEventEmitter } from '@/hooks/useStockUpdateEvents';
import { toast } from 'sonner';

interface StockReplenishmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TechnicianStock;
  onSuccess: () => void;
}

export const StockReplenishmentDialog: React.FC<StockReplenishmentDialogProps> = ({
  open,
  onOpenChange,
  item,
  onSuccess
}) => {
  const { user } = useAuth();
  const { emitStockEvent } = useStockEventEmitter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');

  // Resetar campos quando o dialog abre
  useEffect(() => {
    if (open) {
      // Sugerir quantidade para atingir o estoque máximo
      const suggestedQuantity = Math.max(1, item.max_quantity - item.current_quantity);
      setQuantity(suggestedQuantity);
      setReason('Reposição de estoque');
      setLocation('');
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!user?.id || !reason.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero.');
      return;
    }

    const newTotal = item.current_quantity + quantity;
    if (newTotal > item.max_quantity) {
      toast.error(`Quantidade excede o limite máximo (${item.max_quantity} un.).`);
      return;
    }

    setIsProcessing(true);
    try {
      const success = await technicianStockService.addStock(
        user.id,
        item.item.code,
        quantity,
        reason.trim(),
        location.trim() || undefined
      );

      if (success) {
        toast.success('Item adicionado ao estoque com sucesso!');

        // Emitir evento de reposição
        emitStockEvent(
          'stock_replenished',
          user.id,
          'StockReplenishmentDialog',
          {
            itemCode: item.item.code,
            quantity
          }
        );

        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao adicionar ao estoque:', error);
      toast.error('Erro ao adicionar item ao estoque.');
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

  const newTotal = item.current_quantity + quantity;
  const willExceedMax = newTotal > item.max_quantity;
  const willReachOptimal = newTotal >= item.min_quantity && newTotal <= item.max_quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Repor Item no Estoque
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
                <span className="font-medium">Valor Unit.:</span> R$ {item.item.sale_price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <Label htmlFor="quantity">Quantidade a Adicionar *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item.max_quantity - item.current_quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo possível: {item.max_quantity - item.current_quantity} unidades
            </p>
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="reason">Motivo da Reposição *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reposição de estoque, compra de peças, transferência..."
              rows={3}
            />
          </div>

          {/* Local de Origem (Opcional) */}
          <div>
            <Label htmlFor="location">Local de Origem (Opcional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Depósito central, loja de peças, oficina..."
            />
          </div>

          {/* Alertas */}
          {willExceedMax && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Package className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                <strong>Atenção:</strong> Quantidade excede o limite máximo da van.
              </span>
            </div>
          )}

          {willReachOptimal && !willExceedMax && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                <strong>Ótimo:</strong> Estoque ficará em nível adequado.
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
                <span>Quantidade a adicionar:</span>
                <span className="font-medium text-green-600">+{quantity} un.</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Estoque após reposição:</span>
                <span className="font-bold">{newTotal} un.</span>
              </div>
              <div className="flex justify-between">
                <span>Valor adicionado:</span>
                <span className="font-medium">R$ {(quantity * item.item.sale_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Novo valor total:</span>
                <span className="font-medium">R$ {(newTotal * item.item.sale_price).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Sugestões */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Sugestões:</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Para atingir estoque mínimo:</span>
                <span className="font-medium">
                  {Math.max(0, item.min_quantity - item.current_quantity)} un.
                </span>
              </div>
              <div className="flex justify-between">
                <span>Para atingir estoque máximo:</span>
                <span className="font-medium">
                  {Math.max(0, item.max_quantity - item.current_quantity)} un.
                </span>
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
            disabled={isProcessing || !reason.trim() || quantity <= 0 || willExceedMax}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar ao Estoque
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
