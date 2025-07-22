import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderValueHistoryService } from '@/services/orderValueHistory/orderValueHistoryService';
import { OrderValueChange } from '@/services/orderValueHistory/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  DollarSign, 
  History, 
  Save, 
  X, 
  Clock,
  User,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditOrderValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrderId: string;
  currentValue: number | null;
  clientName: string;
  onValueUpdated: (newValue: number) => void;
}

export const EditOrderValueModal: React.FC<EditOrderValueModalProps> = ({
  isOpen,
  onClose,
  serviceOrderId,
  currentValue,
  clientName,
  onValueUpdated
}) => {
  const { user } = useAuth();
  const [newValue, setNewValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [valueHistory, setValueHistory] = useState<OrderValueChange[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Carregar histórico quando o modal abrir
  useEffect(() => {
    if (isOpen && serviceOrderId) {
      loadValueHistory();
      // Definir valor atual no input
      if (currentValue) {
        setNewValue(currentValue.toFixed(2).replace('.', ','));
      }
    }
  }, [isOpen, serviceOrderId, currentValue]);

  const loadValueHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await orderValueHistoryService.getValueHistory(serviceOrderId);
      setValueHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleValueChange = (value: string) => {
    // Permitir apenas números, vírgula e ponto
    const cleanValue = value.replace(/[^\d,\.]/g, '');
    setNewValue(cleanValue);
  };

  const parseValue = (value: string): number => {
    return parseFloat(value.replace(',', '.'));
  };

  const formatCurrency = (value: number | null): string => {
    if (!value && value !== 0) return 'R$ 0,00';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const handleSave = async () => {
    if (!newValue.trim()) {
      toast.error('Digite um valor válido');
      return;
    }

    if (!changeReason.trim()) {
      toast.error('Digite o motivo da alteração');
      return;
    }

    const numericValue = parseValue(newValue);
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (numericValue === currentValue) {
      toast.error('O novo valor deve ser diferente do atual');
      return;
    }

    setIsLoading(true);
    try {
      const success = await orderValueHistoryService.updateOrderValue(
        serviceOrderId,
        numericValue,
        changeReason,
        user?.name || 'Usuário desconhecido',
        currentValue
      );

      if (success) {
        onValueUpdated(numericValue);
        await loadValueHistory(); // Recarregar histórico
        setChangeReason('');
        toast.success('Valor atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao atualizar valor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewValue('');
    setChangeReason('');
    setValueHistory([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Alterar Valor da OS - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          {/* Valor Atual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Valor Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentValue)}
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Alteração */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Novo Valor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newValue">Valor (R$)</Label>
                <Input
                  id="newValue"
                  value={newValue}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0,00"
                  className="text-lg font-medium"
                />
              </div>

              <div>
                <Label htmlFor="changeReason">Motivo da Alteração *</Label>
                <Textarea
                  id="changeReason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Descreva o motivo da alteração do valor..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alteração
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Alterações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600" />
                Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                  <span className="ml-2">Carregando histórico...</span>
                </div>
              ) : valueHistory.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma alteração registrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {valueHistory.map((change, index) => (
                    <div key={change.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {change.newValue > (change.previousValue || 0) ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">
                            {formatCurrency(change.previousValue)} → {formatCurrency(change.newValue)}
                          </span>
                        </div>
                        <Badge variant="outline">
                          #{valueHistory.length - index}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          <span>{change.changeReason}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{change.changedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(change.changedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
