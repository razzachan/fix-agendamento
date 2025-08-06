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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AgendamentoAI } from '@/services/agendamentos';
import {
  Package,
  Wrench,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Split,
  Merge,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { conflictValidationService, ConflictValidationResult } from '@/services/routing/conflictValidationService';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';
import { useGoogleAdsTracking } from '@/hooks/useGoogleAdsTracking';

interface EquipmentGroup {
  equipments: string[];
  problems: string[];
  attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  technicianId?: string;
  notes?: string;
  estimatedValue?: number;
}

interface MultipleEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: AgendamentoAI | null;
  scheduledDate: string;
  scheduledTime: string;
  preSelectedTechnicianId?: string;
  onCreateMultipleOrders?: (groups: EquipmentGroup[]) => Promise<void>;
  onCreateSingleOrder?: () => Promise<void>;
  onOrdersCreated?: () => void;
}

const MultipleEquipmentModal: React.FC<MultipleEquipmentModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  scheduledDate,
  scheduledTime,
  preSelectedTechnicianId,
  onCreateMultipleOrders,
  onCreateSingleOrder,
  onOrdersCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [creationMode, setCreationMode] = useState<'single' | 'multiple'>('multiple');
  const [equipmentGroups, setEquipmentGroups] = useState<EquipmentGroup[]>([]);
  const [validationResult, setValidationResult] = useState<ConflictValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { recordSchedulingConversion } = useGoogleAdsTracking();

  // Parse equipamentos e problemas
  const parseEquipamentos = (equipamentos: any): string[] => {
    if (Array.isArray(equipamentos)) return equipamentos;
    if (typeof equipamentos === 'string') {
      try {
        const parsed = JSON.parse(equipamentos);
        return Array.isArray(parsed) ? parsed : [equipamentos];
      } catch {
        return [equipamentos];
      }
    }
    return [];
  };

  const parseProblemas = (problemas: any): string[] => {
    if (Array.isArray(problemas)) return problemas;
    if (typeof problemas === 'string') {
      try {
        const parsed = JSON.parse(problemas);
        return Array.isArray(parsed) ? parsed : [problemas];
      } catch {
        return [problemas];
      }
    }
    return [];
  };

  // Inicializar grupos quando o modal abrir
  useEffect(() => {
    if (isOpen && agendamento) {
      const equipamentos = parseEquipamentos(agendamento.equipamentos || agendamento.equipamento);
      const problemas = parseProblemas(agendamento.problemas || agendamento.problema);

      // Criar um grupo para cada equipamento
      const initialGroups: EquipmentGroup[] = equipamentos.map((equipment, index) => ({
        equipments: [equipment],
        problems: [problemas[index] || problemas[0] || 'Problema não especificado'],
        attendanceType: agendamento.tipo_servico === 'in-home' ? 'em_domicilio' : 'coleta_diagnostico',
        notes: ''
      }));

      setEquipmentGroups(initialGroups);

      // Validar conflitos automaticamente
      if (initialGroups.length > 0) {
        validateConflicts(initialGroups);
      }
    }
  }, [isOpen, agendamento]);

  // Validar conflitos
  const validateConflicts = async (groups: EquipmentGroup[]) => {
    if (!agendamento) return;

    setIsValidating(true);
    try {
      const result = await conflictValidationService.validateMultipleOrderCreation(
        agendamento,
        groups,
        scheduledDate,
        scheduledTime
      );
      setValidationResult(result);
    } catch (error) {
      console.error('Erro na validação:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAttendanceTypeChange = (groupIndex: number, type: string) => {
    const newGroups = equipmentGroups.map((group, index) =>
      index === groupIndex
        ? { ...group, attendanceType: type as 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' }
        : group
    );
    setEquipmentGroups(newGroups);
    validateConflicts(newGroups);
  };

  const handleNotesChange = (groupIndex: number, notes: string) => {
    const newGroups = equipmentGroups.map((group, index) =>
      index === groupIndex
        ? { ...group, notes }
        : group
    );
    setEquipmentGroups(newGroups);
  };

  const handleEstimatedValueChange = (groupIndex: number, value: string) => {
    // Remove tudo exceto números, vírgula e ponto
    let cleanValue = value.replace(/[^\d,\.]/g, '');

    // Se o valor estiver vazio, definir como undefined
    if (cleanValue === '') {
      const newGroups = equipmentGroups.map((group, index) =>
        index === groupIndex
          ? { ...group, estimatedValue: undefined }
          : group
      );
      setEquipmentGroups(newGroups);
      return;
    }

    // Substituir vírgula por ponto para cálculos internos
    const numericValue = parseFloat(cleanValue.replace(',', '.'));

    // Verificar se é um número válido
    if (isNaN(numericValue)) return;

    const newGroups = equipmentGroups.map((group, index) =>
      index === groupIndex
        ? { ...group, estimatedValue: numericValue }
        : group
    );
    setEquipmentGroups(newGroups);
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





  const handleCreateSingle = async () => {
    if (!agendamento) return;

    setIsLoading(true);
    try {
      if (onCreateSingleOrder) {
        await onCreateSingleOrder();
      } else {
        // Usar orderLifecycleService diretamente
        const firstGroup = equipmentGroups[0];
        const result = await orderLifecycleService.createServiceOrderFromAgendamento(
          agendamento.id,
          firstGroup?.attendanceType || 'em_domicilio',
          scheduledDate,
          scheduledTime,
          preSelectedTechnicianId,
          firstGroup?.notes,
          firstGroup?.estimatedValue
        );

        toast.success('Ordem de serviço criada com sucesso!');

        // Registrar conversão de agendamento no Google Ads
        if (result?.serviceOrder) {
          await recordSchedulingConversion(
            result.serviceOrder.id,
            firstGroup?.estimatedValue || 0
          );
        }

        if (onOrdersCreated) {
          onOrdersCreated();
        }
      }

      onClose();
    } catch (error) {
      console.error('Erro ao criar OS única:', error);
      toast.error('Erro ao criar ordem de serviço');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMultiple = async () => {
    if (!agendamento) return;

    setIsLoading(true);
    try {
      if (onCreateMultipleOrders) {
        await onCreateMultipleOrders(equipmentGroups);
      } else {
        // Usar orderLifecycleService diretamente
        await orderLifecycleService.createMultipleServiceOrdersFromAgendamento(
          agendamento.id,
          equipmentGroups.map(group => ({
            ...group,
            technicianId: preSelectedTechnicianId
          })),
          scheduledDate,
          scheduledTime
        );

        toast.success('Ordens de serviço criadas com sucesso!');

        if (onOrdersCreated) {
          onOrdersCreated();
        }
      }

      onClose();
    } catch (error) {
      console.error('Erro ao criar múltiplas OS:', error);
      toast.error('Erro ao criar ordens de serviço');
    } finally {
      setIsLoading(false);
    }
  };

  if (!agendamento) return null;

  const equipamentos = parseEquipamentos(agendamento.equipamentos || agendamento.equipamento);
  const hasMultipleEquipments = equipamentos.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#e5b034]" />
            Múltiplos Equipamentos Detectados
          </DialogTitle>
          <DialogDescription>
            Este pré-agendamento possui {equipamentos.length} equipamentos. 
            Escolha como deseja criar as ordens de serviço.
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
              </div>
            </CardContent>
          </Card>

          {/* Opções de Criação */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Como deseja proceder?</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção: OS Única */}
              <Card 
                className={`cursor-pointer transition-all ${
                  creationMode === 'single' 
                    ? 'border-[#e5b034] bg-[#e5b034]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCreationMode('single')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Merge className="h-5 w-5 text-blue-600" />
                    <h5 className="font-medium">OS Única</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Criar uma única ordem de serviço com todos os equipamentos
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">1 OS</Badge>
                    <Badge variant="outline">Mesmo técnico</Badge>
                    <Badge variant="outline">Mesmo tipo</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Opção: Múltiplas OS */}
              <Card 
                className={`cursor-pointer transition-all ${
                  creationMode === 'multiple' 
                    ? 'border-[#e5b034] bg-[#e5b034]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCreationMode('multiple')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Split className="h-5 w-5 text-green-600" />
                    <h5 className="font-medium">Múltiplas OS</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Criar uma OS para cada equipamento com tipos específicos
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{equipamentos.length} OS</Badge>
                    <Badge variant="outline">Tipos específicos</Badge>
                    <Badge variant="outline">Flexível</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resultados da Validação */}
          {validationResult && (validationResult.conflicts.length > 0 || validationResult.suggestions.length > 0) && (
            <div className="space-y-3">
              <Separator />
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                {validationResult.hasConflicts ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                )}
                Validação de Conflitos
              </h4>

              {/* Conflitos */}
              {validationResult.conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    conflict.severity === 'error'
                      ? 'bg-red-50 border-l-red-500 text-red-800'
                      : conflict.severity === 'warning'
                      ? 'bg-yellow-50 border-l-yellow-500 text-yellow-800'
                      : 'bg-blue-50 border-l-blue-500 text-blue-800'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">{conflict.message}</div>
                  {conflict.affectedItems.length > 0 && (
                    <div className="text-xs opacity-75">
                      Afetados: {conflict.affectedItems.join(', ')}
                    </div>
                  )}
                </div>
              ))}

              {/* Sugestões */}
              {validationResult.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-green-50 border-l-4 border-l-green-500 text-green-800 rounded-lg">
                  <div className="text-sm">{suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Configuração para Múltiplas OS */}
          {creationMode === 'multiple' && (
            <div className="space-y-4">
              <Separator />
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Configurar Equipamentos
                {isValidating && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </h4>
              
              <div className="space-y-4">
                {equipmentGroups.map((group, index) => (
                  <Card key={index} className="border-l-4 border-l-[#e5b034]">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">
                            OS #{index + 1}: {group.equipments[0]}
                          </h5>
                          <Badge variant="outline">
                            {group.problems[0]}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Tipo de Atendimento
                            </label>
                            <Select
                              value={group.attendanceType}
                              onValueChange={(value) => handleAttendanceTypeChange(index, value)}
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
                                value={getInputValue(group.estimatedValue)}
                                onChange={(e) => handleEstimatedValueChange(index, e.target.value)}
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
                              <strong>Fluxo de Pagamento:</strong> {getPaymentDescription(group.attendanceType)}
                              {group.attendanceType === 'coleta_diagnostico' && group.estimatedValue && (
                                <div className="mt-1 text-xs">
                                  <span className="font-medium">Total estimado:</span> R$ {formatCurrency(350 + group.estimatedValue)}
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
                            value={group.notes || ''}
                            onChange={(e) => handleNotesChange(index, e.target.value)}
                            className="min-h-[38px]"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {creationMode === 'single' 
              ? `Será criada 1 OS com ${equipamentos.length} equipamentos`
              : `Serão criadas ${equipamentos.length} OS individuais`
            }
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={creationMode === 'single' ? handleCreateSingle : handleCreateMultiple}
              disabled={isLoading || (validationResult?.hasConflicts && validationResult.conflicts.some(c => c.severity === 'error'))}
              className={`${
                validationResult?.hasConflicts && validationResult.conflicts.some(c => c.severity === 'error')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#e5b034] hover:bg-[#d4a02a]'
              } text-white`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {creationMode === 'single' ? 'Criar OS Única' : 'Criar Múltiplas OS'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultipleEquipmentModal;
