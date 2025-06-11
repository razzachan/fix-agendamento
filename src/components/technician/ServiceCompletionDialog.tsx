import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Package, 
  Plus, 
  Minus, 
  Loader2,
  AlertTriangle,
  Star,
  User,
  Wrench
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import technicianStockService, { TechnicianStock } from '@/services/technicianStockService';
import { sendGoogleReviewsRequest, GOOGLE_REVIEWS_LINK } from '@/services/notificationService';
import { useStockEventEmitter } from '@/hooks/useStockUpdateEvents';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

interface UsedStockItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ServiceCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder;
  onSuccess: () => void;
  onStockUpdate?: () => void; // Callback para atualizar estoque
}

export const ServiceCompletionDialog: React.FC<ServiceCompletionDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
  onStockUpdate
}) => {
  const { user } = useAuth();
  const { emitStockEvent } = useStockEventEmitter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stockUsage, setStockUsage] = useState<'no_stock' | 'used_stock'>('no_stock');
  const [usedItems, setUsedItems] = useState<UsedStockItem[]>([]);
  const [availableStock, setAvailableStock] = useState<TechnicianStock[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [requestCustomerRating, setRequestCustomerRating] = useState(true);

  // Carregar estoque disponível
  useEffect(() => {
    const loadStock = async () => {
      if (user?.id && open) {
        const stock = await technicianStockService.getTechnicianStock(user.id);
        setAvailableStock(stock.filter(item => item.current_quantity > 0));
      }
    };
    loadStock();
  }, [user?.id, open]);

  // Resetar campos quando dialog abre
  useEffect(() => {
    if (open) {
      setStockUsage('no_stock');
      setUsedItems([]);
      setCompletionNotes('');
      setRequestCustomerRating(true);
    }
  }, [open]);

  const handleAddStockItem = () => {
    if (availableStock.length === 0) {
      toast.error('Nenhum item disponível no estoque.');
      return;
    }

    const firstAvailable = availableStock[0];
    const newItem: UsedStockItem = {
      code: firstAvailable.item.code,
      name: firstAvailable.item.name,
      quantity: 1,
      unitPrice: firstAvailable.item.sale_price,
      total: firstAvailable.item.sale_price
    };

    setUsedItems([...usedItems, newItem]);
  };

  const handleRemoveStockItem = (index: number) => {
    setUsedItems(usedItems.filter((_, i) => i !== index));
  };

  const handleUpdateStockItem = (index: number, field: keyof UsedStockItem, value: any) => {
    const updated = [...usedItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalcular total se mudou quantidade
    if (field === 'quantity') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    
    // Atualizar nome se mudou código
    if (field === 'code') {
      const stockItem = availableStock.find(item => item.item.code === value);
      if (stockItem) {
        updated[index].name = stockItem.item.name;
        updated[index].unitPrice = stockItem.item.sale_price;
        updated[index].total = updated[index].quantity * stockItem.item.sale_price;
      }
    }
    
    setUsedItems(updated);
  };

  const handleSubmit = async () => {
    if (!user?.id || !completionNotes.trim()) {
      toast.error('Preencha as observações finais.');
      return;
    }

    // Validar itens de estoque se foi selecionado
    if (stockUsage === 'used_stock') {
      if (usedItems.length === 0) {
        toast.error('Adicione pelo menos um item usado do estoque.');
        return;
      }

      // Verificar se há quantidade suficiente
      for (const usedItem of usedItems) {
        const stockItem = availableStock.find(item => item.item.code === usedItem.code);
        if (!stockItem || stockItem.current_quantity < usedItem.quantity) {
          toast.error(`Quantidade insuficiente de ${usedItem.name} no estoque.`);
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      // 1. Consumir itens do estoque se necessário
      if (stockUsage === 'used_stock' && usedItems.length > 0) {
        for (const item of usedItems) {
          const success = await technicianStockService.consumeStock(
            user.id,
            item.code,
            item.quantity,
            order.id,
            `Usado no atendimento - ${order.clientName}`,
            order.address || order.pickupAddress
          );

          if (!success) {
            toast.error(`Erro ao consumir ${item.name} do estoque.`);
            return;
          }
        }
      }

      // 2. Enviar link do Google Reviews se solicitado
      if (requestCustomerRating) {
        try {
          console.log('📱 Enviando link do Google Reviews para:', order.clientName);

          const success = await sendGoogleReviewsRequest(
            order.clientName,
            order.clientPhone,
            order.clientEmail,
            order.id
          );

          if (success) {
            console.log('✅ Link do Google Reviews enviado com sucesso!');
          } else {
            console.warn('⚠️ Falha ao enviar link do Google Reviews (continuando)');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao enviar link de avaliação (continuando):', error);
        }
      }

      // 3. Finalizar o serviço
      toast.success('Serviço finalizado com sucesso!');

      // 4. Emitir evento de atualização de estoque
      if (user?.id && stockUsage === 'used_stock' && usedItems.length > 0) {
        console.log('🔔 Emitindo eventos de consumo de estoque');
        usedItems.forEach(item => {
          emitStockEvent(
            'stock_consumed',
            user.id,
            'ServiceCompletionDialog',
            {
              itemCode: item.code,
              quantity: item.quantity
            }
          );
        });

        // Emitir evento genérico de atualização
        setTimeout(() => {
          emitStockEvent(
            'stock_updated',
            user.id,
            'ServiceCompletionDialog'
          );

          // Disparar evento customizado para forçar atualização
          window.dispatchEvent(new CustomEvent('stockUpdated', {
            detail: { source: 'ServiceCompletionDialog', technicianId: user.id }
          }));
        }, 100);
      }

      // 5. Atualizar cache do estoque se callback fornecido
      if (onStockUpdate) {
        console.log('🔄 Atualizando cache do estoque após conclusão do serviço');
        setTimeout(() => {
          onStockUpdate();
        }, 200);
      }

      onSuccess();

    } catch (error) {
      console.error('Erro ao finalizar serviço:', error);
      toast.error('Erro ao finalizar serviço.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalStockValue = usedItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Finalizar Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Serviço */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cliente:</span> {order.clientName}
                </div>
                <div>
                  <span className="font-medium">Equipamento:</span> {order.equipmentType}
                </div>
                <div>
                  <span className="font-medium">OS:</span> #{order.id.slice(-8)}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {order.serviceAttendanceType}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Utilização de Estoque */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Utilização de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={stockUsage} onValueChange={(value: any) => setStockUsage(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no_stock" id="no_stock" />
                  <Label htmlFor="no_stock">Não utilizei peças do estoque</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="used_stock" id="used_stock" />
                  <Label htmlFor="used_stock">Utilizei peças da van</Label>
                </div>
              </RadioGroup>

              {stockUsage === 'used_stock' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Peças Utilizadas:</h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddStockItem}
                      disabled={availableStock.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Peça
                    </Button>
                  </div>

                  {usedItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhuma peça adicionada. Clique em "Adicionar Peça" para começar.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {usedItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1 grid grid-cols-4 gap-3">
                            <Select
                              value={item.code}
                              onValueChange={(value) => handleUpdateStockItem(index, 'code', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStock.map((stockItem) => (
                                  <SelectItem key={stockItem.item.code} value={stockItem.item.code}>
                                    {stockItem.item.name} ({stockItem.current_quantity} un.)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateStockItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="Qtd"
                            />

                            <div className="text-sm text-gray-600 flex items-center">
                              R$ {item.unitPrice.toFixed(2)}
                            </div>

                            <div className="text-sm font-medium flex items-center">
                              R$ {item.total.toFixed(2)}
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveStockItem(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-medium">Total em Peças:</span>
                        <span className="font-bold text-lg">R$ {totalStockValue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitação de Avaliação do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                Avaliação do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="requestRating"
                  checked={requestCustomerRating}
                  onChange={(e) => setRequestCustomerRating(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="requestRating" className="font-medium">
                    Solicitar avaliação do cliente
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Link do Google Reviews será enviado para o cliente por SMS/Email
                  </p>
                </div>
              </div>

              {requestCustomerRating && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Como funciona:</span>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>• Cliente receberá link do Google Reviews por SMS/Email</div>
                    <div>• Poderá avaliar a EletroFix Hub Pro de 1 a 5 estrelas</div>
                    <div>• Avaliação aparecerá no Google Maps da empresa</div>
                    <div>• Feedback público ajuda outros clientes</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações Finais */}
          <div>
            <Label htmlFor="completionNotes">Observações Finais *</Label>
            <Textarea
              id="completionNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Descreva o que foi realizado, problemas encontrados, recomendações para o cliente..."
              rows={4}
            />
          </div>

          {/* Resumo */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">Resumo da Finalização</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status final:</span>
                  <Badge className="bg-green-100 text-green-800">Concluído</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Peças utilizadas:</span>
                  <span>{stockUsage === 'used_stock' ? `${usedItems.length} item(ns)` : 'Nenhuma'}</span>
                </div>
                {stockUsage === 'used_stock' && totalStockValue > 0 && (
                  <div className="flex justify-between">
                    <span>Valor em peças:</span>
                    <span className="font-medium">R$ {totalStockValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Google Reviews:</span>
                  <span>{requestCustomerRating ? 'Link será enviado' : 'Não solicitado'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
            disabled={isProcessing || !completionNotes.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Serviço
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
