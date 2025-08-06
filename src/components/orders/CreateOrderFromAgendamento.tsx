import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AgendamentoAI } from '@/services/agendamentos';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';
import { ServiceOrder } from '@/types';
import { useGoogleAdsTracking } from '@/hooks/useGoogleAdsTracking';
import { OrderRelationshipService } from '@/services/orderRelationshipService';
import { Calendar, MapPin, Phone, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CreateOrderFromAgendamentoProps {
  agendamento: AgendamentoAI;
  onOrderCreated?: (serviceOrder: ServiceOrder, updatedAgendamento: AgendamentoAI) => void;
  onCancel?: () => void;
}

export const CreateOrderFromAgendamento: React.FC<CreateOrderFromAgendamentoProps> = ({
  agendamento,
  onOrderCreated,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { recordSchedulingConversion, recordSecondPhaseConversion } = useGoogleAdsTracking();
  const [formData, setFormData] = useState({
    equipment: '',
    problem_description: '',
    technician_id: '',
    priority: agendamento.urgente ? 'high' : 'medium',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipment.trim() || !formData.problem_description.trim()) {
      toast.error('Por favor, preencha equipamento e descrição do problema');
      return;
    }

    setIsLoading(true);

    try {
      console.log(`🚀 Criando OS a partir do agendamento ${agendamento.id}`);

      const result = await orderLifecycleService.createServiceOrderFromAgendamento(
        agendamento.id,
        {
          equipment: formData.equipment,
          problem_description: formData.problem_description,
          priority: formData.priority as 'low' | 'medium' | 'high',
          notes: formData.notes
        },
        formData.technician_id || undefined
      );

      toast.success(`Ordem de serviço ${result.serviceOrder.id} criada com sucesso!`);

      // Tentar vincular automaticamente se for coleta conserto
      if (result.serviceOrder.serviceAttendanceType === 'coleta_conserto') {
        const linkResult = await OrderRelationshipService.autoLinkChildOrder(result.serviceOrder);

        if (linkResult.linked && linkResult.parentOrder) {
          toast.success(`Ordem vinculada automaticamente ao diagnóstico ${linkResult.parentOrder.id.slice(0, 8)}`);

          // Para segunda fase, usar conversão especial
          await recordSecondPhaseConversion(
            result.serviceOrder.id,
            linkResult.parentOrder.id,
            result.serviceOrder.initialCost || 0,
            result.serviceOrder.equipmentType,
            {
              equipmentBrand: result.serviceOrder.equipmentBrand,
              equipmentModel: result.serviceOrder.equipmentModel,
              problemDescription: result.serviceOrder.description,
              clientName: result.serviceOrder.clientName,
              clientPhone: result.serviceOrder.clientPhone,
              serviceAttendanceType: result.serviceOrder.serviceAttendanceType,
              initialCost: result.serviceOrder.initialCost,
              finalCost: result.serviceOrder.finalCost
            }
          );
        } else {
          // Conversão normal se não conseguiu vincular
          await recordSchedulingConversion(
            result.serviceOrder.id,
            result.serviceOrder.initialCost || 0,
            result.serviceOrder.equipmentType,
            {
              equipmentBrand: result.serviceOrder.equipmentBrand,
              equipmentModel: result.serviceOrder.equipmentModel,
              problemDescription: result.serviceOrder.description,
              clientName: result.serviceOrder.clientName,
              clientPhone: result.serviceOrder.clientPhone,
              serviceAttendanceType: result.serviceOrder.serviceAttendanceType,
              initialCost: result.serviceOrder.initialCost,
              finalCost: result.serviceOrder.finalCost
            }
          );
        }
      } else {
        // Conversão normal para outros tipos
        await recordSchedulingConversion(
          result.serviceOrder.id,
          result.serviceOrder.initialCost || 0,
          result.serviceOrder.equipmentType,
          {
            equipmentBrand: result.serviceOrder.equipmentBrand,
            equipmentModel: result.serviceOrder.equipmentModel,
            problemDescription: result.serviceOrder.description,
            clientName: result.serviceOrder.clientName,
            clientPhone: result.serviceOrder.clientPhone,
            serviceAttendanceType: result.serviceOrder.serviceAttendanceType,
            initialCost: result.serviceOrder.initialCost,
            finalCost: result.serviceOrder.finalCost
          }
        );
      }

      if (onOrderCreated) {
        onOrderCreated(result.serviceOrder, result.updatedAgendamento);
      }

    } catch (error) {
      console.error('❌ Erro ao criar OS:', error);
      toast.error('Erro ao criar ordem de serviço');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      'roteirizado': { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      'confirmado': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'convertido': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      'cancelado': { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Informações do Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Criar OS a partir do Agendamento
          </CardTitle>
          <CardDescription>
            Convertendo agendamento confirmado em ordem de serviço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{agendamento.nome}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div>{getStatusBadge(agendamento.status)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{agendamento.telefone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Agendada</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>
                  {agendamento.data_agendada 
                    ? format(new Date(agendamento.data_agendada), 'dd/MM/yyyy HH:mm')
                    : 'Não definida'
                  }
                </span>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Endereço</Label>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{agendamento.endereco}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário da OS */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Ordem de Serviço</CardTitle>
          <CardDescription>
            Preencha as informações específicas da ordem de serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento *</Label>
                <Input
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  placeholder="Ex: Geladeira Brastemp 450L"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem_description">Descrição do Problema *</Label>
              <Textarea
                id="problem_description"
                value={formData.problem_description}
                onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                placeholder="Descreva detalhadamente o problema relatado pelo cliente..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais, instruções especiais, etc."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Criando OS...' : 'Criar Ordem de Serviço'}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Aviso sobre o processo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                O que acontece após criar a OS:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• O agendamento será marcado como "convertido"</li>
                <li>• Não aparecerá mais nas listas de roteirização</li>
                <li>• Histórico será mantido para relatórios</li>
                <li>• A OS entrará no fluxo operacional normal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
