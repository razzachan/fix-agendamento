import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AgendamentoAI } from '@/services/agendamentos';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';
import { toast } from 'sonner';
import {
  Package,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';

interface SingleEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: AgendamentoAI | null;
  scheduledDate: string;
  scheduledTime: string;
  preSelectedTechnicianId?: string;
  onCreateOrder?: (orderData: {
    attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    estimatedValue?: number;
    notes?: string;
  }) => Promise<void>;
  onOrderCreated?: () => void;
}

const SingleEquipmentModal: React.FC<SingleEquipmentModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  scheduledDate,
  scheduledTime,
  preSelectedTechnicianId,
  onCreateOrder,
  onOrderCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceType, setAttendanceType] = useState<'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'>('em_domicilio');
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  // Inicializar tipo de atendimento baseado no agendamento
  useEffect(() => {
    if (isOpen && agendamento) {
      const defaultType = agendamento.tipo_servico === 'in-home' ? 'em_domicilio' : 'coleta_diagnostico';
      setAttendanceType(defaultType);
      setEstimatedValue(undefined);
      setNotes('');
    }
  }, [isOpen, agendamento]);

  const handleEstimatedValueChange = (value: string) => {
    // Remove tudo exceto números, vírgula e ponto
    let cleanValue = value.replace(/[^\d,\.]/g, '');

    // Se o valor estiver vazio, definir como undefined
    if (cleanValue === '') {
      setEstimatedValue(undefined);
      return;
    }

    // Substituir vírgula por ponto para cálculos internos
    const numericValue = parseFloat(cleanValue.replace(',', '.'));

    // Verificar se é um número válido
    if (isNaN(numericValue)) return;

    setEstimatedValue(numericValue);
  };

  // Função para formatar valor monetário para exibição
  const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para obter o valor formatado para o input
  const getInputValue = (value?: number) => {
    if (!value && value !== 0) return '';
    return value.toString().replace('.', ',');
  };

  // Função para obter descrição do tipo de pagamento
  const getPaymentDescription = (attendanceType: string) => {
    switch (attendanceType) {
      case 'coleta_diagnostico':
        return 'R$ 350 na coleta + valor do orçamento na entrega';
      case 'coleta_conserto':
        return '50% na coleta + 50% na entrega';
      case 'em_domicilio':
        return '100% pago na conclusão do serviço';
      default:
        return '';
    }
  };

  const handleCreateOrder = async () => {
    if (!agendamento) return;

    setIsLoading(true);
    try {
      if (onCreateOrder) {
        // Usar callback fornecido
        await onCreateOrder({
          attendanceType,
          estimatedValue,
          notes
        });
      } else {
        // Usar orderLifecycleService diretamente
        await orderLifecycleService.createServiceOrderFromAgendamento(
          agendamento.id,
          attendanceType,
          scheduledDate,
          scheduledTime,
          preSelectedTechnicianId,
          notes,
          estimatedValue
        );

        toast.success('Ordem de serviço criada com sucesso!');

        if (onOrderCreated) {
          onOrderCreated();
        }
      }

      onClose();
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      toast.error('Erro ao criar ordem de serviço');
    } finally {
      setIsLoading(false);
    }
  };

  if (!agendamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#e5b034]" />
            Configurar Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes para criar a ordem de serviço.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Agendamento */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cliente:</span> {agendamento.nome}
                </div>
                <div>
                  <span className="font-medium">Data/Hora:</span> {scheduledDate} às {scheduledTime}
                </div>
                <div>
                  <span className="font-medium">Telefone:</span> 
                  <span className={agendamento.telefone ? 'text-gray-900' : 'text-gray-500 italic'}>
                    {agendamento.telefone || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Email:</span> 
                  <span className={agendamento.email ? 'text-gray-900' : 'text-gray-500 italic'}>
                    {agendamento.email || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">CPF:</span> 
                  <span className={agendamento.cpf ? 'text-gray-900' : 'text-gray-500 italic'}>
                    {agendamento.cpf || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Urgente:</span> 
                  <Badge variant={agendamento.urgente ? "destructive" : "secondary"} className="ml-2">
                    {agendamento.urgente ? 'Sim' : 'Não'}
                  </Badge>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-medium">Endereço:</span> {agendamento.endereco}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-medium">Equipamento:</span> {agendamento.equipamento}
                </div>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-medium">Problema:</span> {agendamento.problema}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração da OS */}
          <Card className="border-l-4 border-l-[#e5b034]">
            <CardContent className="p-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Configuração da Ordem de Serviço</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Tipo de Atendimento
                    </label>
                    <Select
                      value={attendanceType}
                      onValueChange={(value) => setAttendanceType(value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_domicilio">Em Domicílio</SelectItem>
                        <SelectItem value="coleta_diagnostico">Coleta para Diagnóstico</SelectItem>
                        <SelectItem value="coleta_conserto">Coleta para Conserto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Valor Estimado (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        R$
                      </span>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={getInputValue(estimatedValue)}
                        onChange={(e) => handleEstimatedValueChange(e.target.value)}
                        className="pl-10 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Informação sobre o fluxo de pagamento */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <strong>Fluxo de Pagamento:</strong> {getPaymentDescription(attendanceType)}
                      {attendanceType === 'coleta_diagnostico' && estimatedValue && (
                        <div className="mt-1 text-xs">
                          <span className="font-medium">Total estimado:</span> R$ {formatCurrency(350 + estimatedValue)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Observações
                  </label>
                  <Textarea
                    placeholder="Observações específicas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Será criada 1 ordem de serviço
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={isLoading}
              className="bg-[#e5b034] hover:bg-[#d4a02a] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Criar Ordem de Serviço
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SingleEquipmentModal;
