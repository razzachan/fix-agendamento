import React, { useState, useEffect } from 'react';
import { format, addMinutes, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Navigation,
  Loader2,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import { AgendamentoAI } from '@/services/agendamentos';
import { Technician } from '@/types';
import { technicianQueryService } from '@/services/technician/technicianQueryService';
import { OptimizedRoute } from '@/services/routing/unifiedRoutingService';
import { calendarAvailabilityService, AvailabilityCheck } from '@/services/calendar/CalendarAvailabilityService';
import WeeklyRouteCalendar from '@/components/calendar/WeeklyRouteCalendar';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import MultipleEquipmentModal from './MultipleEquipmentModal';
import SingleEquipmentModal from './SingleEquipmentModal';
import CreateServiceOrderDialog from './CreateServiceOrderDialog';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';

interface ApplyRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: OptimizedRoute | null;
  onApply: (selectedAgendamentos: AgendamentoAI[], technicianId: string, scheduleData: ScheduleData[], selectedDate: string) => Promise<void>;
}

interface ScheduleData {
  agendamentoId: number;
  scheduledTime: string;
  estimatedDuration: number;
  selectedDate: string;
}

interface AgendamentoWithSchedule extends AgendamentoAI {
  isSelected: boolean;
  scheduledTime: string;
  estimatedDuration: number;
  sequenceOrder: number;
}

const ApplyRouteModal: React.FC<ApplyRouteModalProps> = ({
  isOpen,
  onClose,
  route,
  onApply
}) => {
  // Log básico para verificar se o componente está sendo renderizado
  console.log('🔥 ApplyRouteModal renderizado! isOpen:', isOpen, 'route:', route?.logisticsGroup);
  // Estados
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [agendamentosWithSchedule, setAgendamentosWithSchedule] = useState<AgendamentoWithSchedule[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd')); // Padrão: amanhã
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityCheck | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Estados para drag & drop
  const [draggedAgendamento, setDraggedAgendamento] = useState<{ id: number; name: string } | null>(null);
  const [multipleEquipmentModal, setMultipleEquipmentModal] = useState<{
    isOpen: boolean;
    agendamento: AgendamentoAI | null;
    scheduledDate: string;
    scheduledTime: string;
  }>({
    isOpen: false,
    agendamento: null,
    scheduledDate: '',
    scheduledTime: ''
  });

  const [singleEquipmentModal, setSingleEquipmentModal] = useState<{
    isOpen: boolean;
    agendamento: AgendamentoAI | null;
    scheduledDate: string;
    scheduledTime: string;
  }>({
    isOpen: false,
    agendamento: null,
    scheduledDate: '',
    scheduledTime: ''
  });

  // Estado para o diálogo de criação de OS
  const [createOrderDialog, setCreateOrderDialog] = useState<{
    isOpen: boolean;
    agendamento: AgendamentoAI | null;
  }>({
    isOpen: false,
    agendamento: null,
  });


  const [calendarAvailabilityData, setCalendarAvailabilityData] = useState<{ [key: string]: { available: number; total: number } }>({});

  // Carregar técnicos
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        console.log('🔧 Carregando técnicos para modal de aplicação...');
        const techList = await technicianQueryService.getAll();
        console.log('🔧 Técnicos carregados:', techList.length);

        // Filtrar apenas técnicos ativos
        const activeTechnicians = techList.filter(tech => tech.active !== false);
        console.log('🔧 Técnicos ativos:', activeTechnicians.length);

        setTechnicians(activeTechnicians);
      } catch (error) {
        console.error('❌ Erro ao carregar técnicos:', error);
        toast.error('Erro ao carregar técnicos');
      }
    };
    loadTechnicians();
  }, []);

  // Inicializar dados quando rota muda
  useEffect(() => {
    console.log('🔧 ApplyRouteModal useEffect - route:', route, 'isOpen:', isOpen);
    if (route && isOpen) {
      console.log('🔧 Inicializando modal com rota:', route.logisticsGroup, 'agendamentos:', route.sequence.length);
      toast.info(`🔧 Modal aberto! Rota: ${route.logisticsGroup}, ${route.sequence.length} agendamentos`, { duration: 5000 });

      // Sugerir técnico se disponível
      if (route.suggestedTechnicianId) {
        setSelectedTechnicianId(route.suggestedTechnicianId);
      }

      // Criar agendamentos sem horários definidos inicialmente
      const agendamentosWithTimes = route.sequence.map((agendamento, index) => {
        const waypoint = route.waypoints[index];
        return {
          ...agendamento,
          isSelected: false, // Iniciar desmarcados para aparecerem na lista
          scheduledTime: '', // Sem horário inicial para aparecerem na lista
          estimatedDuration: waypoint?.serviceTime || 45,
          sequenceOrder: index + 1
        };
      });

      console.log('🔧 Agendamentos processados:', agendamentosWithTimes.length);
      setAgendamentosWithSchedule(agendamentosWithTimes);
    }
  }, [route, isOpen]);



  // Verificar disponibilidade quando técnico ou data mudarem
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedTechnicianId || !selectedDate) {
        setAvailabilityCheck(null);
        return;
      }

      console.log(`🔍 ApplyRouteModal: Verificando disponibilidade para técnico "${selectedTechnicianId}" na data "${selectedDate}"`);

      // DEBUG: Buscar nome do técnico
      const selectedTech = technicians.find(t => t.id === selectedTechnicianId);
      console.log(`🔍 ApplyRouteModal: Técnico selecionado:`, selectedTech);

      setIsCheckingAvailability(true);
      try {
        const availability = await calendarAvailabilityService.checkTechnicianAvailability(
          selectedTechnicianId,
          selectedDate
        );
        setAvailabilityCheck(availability);

        console.log(`📅 ApplyRouteModal: Disponibilidade verificada: ${availability.totalAvailable} slots livres`);
      } catch (error) {
        console.error('❌ ApplyRouteModal: Erro ao verificar disponibilidade:', error);
        toast.error('Erro ao verificar disponibilidade do calendário');
        setAvailabilityCheck(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [selectedTechnicianId, selectedDate, technicians]);

  // Carregar dados de disponibilidade para o calendário (múltiplas datas)
  useEffect(() => {
    const loadCalendarAvailability = async () => {
      if (!selectedTechnicianId) {
        setCalendarAvailabilityData({});
        return;
      }

      try {
        const today = new Date();
        const endDate = addDays(today, 30); // Próximos 30 dias
        const availabilityData: { [key: string]: { available: number; total: number } } = {};

        // Carregar disponibilidade para os próximos 30 dias
        for (let i = 0; i <= 30; i++) {
          const date = addDays(today, i);
          const dateKey = format(date, 'yyyy-MM-dd');

          try {
            const availability = await calendarAvailabilityService.checkTechnicianAvailability(
              selectedTechnicianId,
              dateKey
            );
            availabilityData[dateKey] = {
              available: availability.totalAvailable,
              total: availability.slots.length
            };
          } catch (error) {
            // Em caso de erro, assumir disponibilidade padrão
            availabilityData[dateKey] = { available: 9, total: 10 };
          }
        }

        setCalendarAvailabilityData(availabilityData);
      } catch (error) {
        console.error('Erro ao carregar disponibilidade do calendário:', error);
      }
    };

    loadCalendarAvailability();
  }, [selectedTechnicianId]);

  // Toggle seleção de agendamento
  const toggleAgendamentoSelection = (agendamentoId: number) => {
    setAgendamentosWithSchedule(prev =>
      prev.map(ag =>
        ag.id === agendamentoId
          ? { ...ag, isSelected: !ag.isSelected }
          : ag
      )
    );
  };

  // Selecionar/deselecionar todos (apenas cards visíveis)
  const toggleSelectAll = () => {
    const availableAgendamentos = agendamentosWithSchedule.filter(ag => !ag.scheduledTime || ag.scheduledTime === '');
    const allAvailableSelected = availableAgendamentos.every(ag => ag.isSelected);

    setAgendamentosWithSchedule(prev =>
      prev.map(ag => {
        // Só alterar o estado dos agendamentos disponíveis (visíveis)
        const isAvailable = !ag.scheduledTime || ag.scheduledTime === '';
        if (isAvailable) {
          return { ...ag, isSelected: !allAvailableSelected };
        }
        return ag;
      })
    );
  };

  // Atualizar horário de um agendamento específico
  const updateScheduledTime = (agendamentoId: number, newTime: string) => {
    setAgendamentosWithSchedule(prev =>
      prev.map(ag =>
        ag.id === agendamentoId
          ? { ...ag, scheduledTime: newTime }
          : ag
      )
    );
  };

  // Mover agendamento na sequência
  const moveAgendamento = (agendamentoId: number, direction: 'up' | 'down') => {
    const currentIndex = agendamentosWithSchedule.findIndex(ag => ag.id === agendamentoId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= agendamentosWithSchedule.length) return;

    const newAgendamentos = [...agendamentosWithSchedule];
    [newAgendamentos[currentIndex], newAgendamentos[newIndex]] =
    [newAgendamentos[newIndex], newAgendamentos[currentIndex]];

    // Atualizar ordem de sequência
    newAgendamentos.forEach((ag, index) => {
      ag.sequenceOrder = index + 1;
    });

    setAgendamentosWithSchedule(newAgendamentos);
  };

  // Lidar com seleção de data do calendário
  const handleCalendarDateSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateString);
  };

  // Funções para drag & drop
  const handleAgendamentoDragStart = (agendamento: AgendamentoWithSchedule) => {
    setDraggedAgendamento({ id: agendamento.id, name: agendamento.nome });

    // Fallback para limpar o estado após 10 segundos (caso algo dê errado)
    setTimeout(() => {
      setDraggedAgendamento(null);
    }, 10000);
  };

  const handleAgendamentoDragEnd = () => {
    setDraggedAgendamento(null);
  };

  // Funções para lidar com múltiplos equipamentos
  const handleCreateMultipleOrders = async (groups: Array<{
    equipments: string[];
    problems: string[];
    attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    technicianId?: string;
    notes?: string;
    estimatedValue?: number;
  }>) => {
    if (!multipleEquipmentModal.agendamento) {
      console.error('❌ [handleCreateMultipleOrders] Agendamento não encontrado no modal');
      return;
    }

    try {
      console.log('🚀 [handleCreateMultipleOrders] Iniciando criação de múltiplas OS');
      console.log('🔍 [handleCreateMultipleOrders] Agendamento:', multipleEquipmentModal.agendamento);
      console.log('🔍 [handleCreateMultipleOrders] ID do agendamento:', multipleEquipmentModal.agendamento.id, 'tipo:', typeof multipleEquipmentModal.agendamento.id);
      console.log('🔍 [handleCreateMultipleOrders] Groups:', groups);

      const result = await orderLifecycleService.createMultipleServiceOrdersFromAgendamento(
        multipleEquipmentModal.agendamento.id,
        groups.map(group => ({
          ...group,
          technicianId: selectedTechnicianId
        })),
        multipleEquipmentModal.scheduledDate,
        multipleEquipmentModal.scheduledTime
      );

      toast.success(
        `🎉 ${result.serviceOrders.length} ordens de serviço criadas com sucesso!`,
        { duration: 4000 }
      );

      // Remover agendamento da lista (foi convertido)
      setAgendamentosWithSchedule(prev =>
        prev.filter(ag => ag.id !== multipleEquipmentModal.agendamento?.id)
      );

      // Fechar modal
      closeMultipleEquipmentModal();

      // Continuar processando outros agendamentos se houver
      await continueProcessingAfterMultipleEquipment();

    } catch (error) {
      console.error('Erro ao criar múltiplas OS:', error);
      toast.error('Erro ao criar ordens de serviço');
    }
  };

  const handleCreateSingleOrderFromMultiple = async () => {
    if (!multipleEquipmentModal.agendamento) return;

    try {
      // Criar OS única com todos os equipamentos
      const result = await orderLifecycleService.createServiceOrderFromAgendamento(
        multipleEquipmentModal.agendamento.id,
        {
          equipment: 'Múltiplos equipamentos',
          problem_description: 'Múltiplos problemas - ver detalhes na OS',
          priority: multipleEquipmentModal.agendamento.urgente ? 'high' : 'medium',
          notes: 'OS criada com múltiplos equipamentos',
          technicianId: selectedTechnicianId,
          scheduledDate: multipleEquipmentModal.scheduledDate,
          scheduledTime: multipleEquipmentModal.scheduledTime
        }
      );

      toast.success('Ordem de serviço única criada com sucesso!');

      // Remover agendamento da lista (foi convertido)
      setAgendamentosWithSchedule(prev =>
        prev.filter(ag => ag.id !== multipleEquipmentModal.agendamento?.id)
      );

      // Fechar modal
      closeMultipleEquipmentModal();

      // Continuar processando outros agendamentos se houver
      await continueProcessingAfterMultipleEquipment();

    } catch (error) {
      console.error('Erro ao criar OS única:', error);
      toast.error('Erro ao criar ordem de serviço');
    }
  };

  const closeMultipleEquipmentModal = () => {
    setMultipleEquipmentModal({
      isOpen: false,
      agendamento: null,
      scheduledDate: '',
      scheduledTime: ''
    });
  };

  const closeSingleEquipmentModal = () => {
    setSingleEquipmentModal({
      isOpen: false,
      agendamento: null,
      scheduledDate: '',
      scheduledTime: ''
    });
  };

  // Função para lidar com criação de OS única
  const handleCreateSingleOrder = async (orderData: {
    attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    estimatedValue?: number;
    notes?: string;
  }) => {
    if (!singleEquipmentModal.agendamento) return;

    try {
      const result = await orderLifecycleService.createServiceOrderFromAgendamento(
        singleEquipmentModal.agendamento.id,
        {
          equipment: singleEquipmentModal.agendamento.equipamento || 'Equipamento não especificado',
          problem_description: singleEquipmentModal.agendamento.problema || 'Problema não especificado',
          priority: singleEquipmentModal.agendamento.urgente ? 'high' : 'medium',
          scheduled_date: singleEquipmentModal.scheduledDate,
          scheduled_time: singleEquipmentModal.scheduledTime,
          service_attendance_type: orderData.attendanceType,
          estimated_cost: orderData.estimatedValue,
          notes: orderData.notes,
          technicianId: selectedTechnicianId
        }
      );

      toast.success('Ordem de serviço criada com sucesso!');

      // Remover agendamento da lista (foi convertido)
      setAgendamentosWithSchedule(prev =>
        prev.filter(ag => ag.id !== singleEquipmentModal.agendamento?.id)
      );

      // Fechar modal
      closeSingleEquipmentModal();

      // Continuar processando outros agendamentos se houver
      await continueProcessingAfterSingleEquipment();

    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error('Erro ao criar ordem de serviço');
    }
  };

  // Função para lidar com criação de OS a partir do diálogo
  const handleCreateServiceOrder = async (
    agendamentoId: string,
    scheduledDate: string | null,
    scheduledTime: string | null,
    existingClientId?: string,
    multipleEquipmentData?: {
      hasMultipleEquipments: boolean;
      creationMode: 'single' | 'multiple';
      suggestedGroups: Array<{
        equipments: string[];
        problems: string[];
        attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
        reasoning: string;
      }>;
    }
  ) => {
    if (!createOrderDialog.agendamento) return;

    try {
      const agendamento = createOrderDialog.agendamento;

      // Verificar se tem múltiplos equipamentos e como proceder
      if (multipleEquipmentData?.hasMultipleEquipments) {
        if (multipleEquipmentData.creationMode === 'single') {
          // Criar OS única com todos os equipamentos
          const allEquipments = multipleEquipmentData.suggestedGroups.flatMap(g => g.equipments);
          const allProblems = multipleEquipmentData.suggestedGroups.flatMap(g => g.problems);

          const result = await orderLifecycleService.createServiceOrderFromAgendamento(
            agendamento.id,
            {
              equipment: `Múltiplos equipamentos (${allEquipments.length})`,
              problem_description: allProblems.join('; '),
              priority: agendamento.urgente ? 'high' : 'medium',
              notes: 'OS criada com múltiplos equipamentos',
              scheduled_date: scheduledDate,
              scheduled_time: scheduledTime
            }
          );

          toast.success('Ordem de serviço única criada com sucesso!');
        } else {
          // Criar múltiplas OS baseadas nos agrupamentos sugeridos
          const result = await orderLifecycleService.createMultipleServiceOrdersFromAgendamento(
            agendamento.id,
            multipleEquipmentData.suggestedGroups.map(group => ({
              equipments: group.equipments,
              problems: group.problems,
              attendanceType: group.attendanceType,
              technicianId: selectedTechnicianId
            })),
            scheduledDate || undefined,
            scheduledTime || undefined
          );

          toast.success(
            `🎉 ${result.serviceOrders.length} ordens de serviço criadas com sucesso!`,
            { duration: 4000 }
          );
        }
      } else {
        // Criar OS única para equipamento único
        const result = await orderLifecycleService.createServiceOrderFromAgendamento(
          agendamento.id,
          {
            equipment: agendamento.equipamento || 'Equipamento não especificado',
            problem_description: agendamento.problema || 'Problema não especificado',
            priority: agendamento.urgente ? 'high' : 'medium',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime
          }
        );

        toast.success('Ordem de serviço criada com sucesso!');
      }

      // Remover agendamento da lista (foi convertido)
      setAgendamentosWithSchedule(prev =>
        prev.filter(ag => ag.id !== agendamento.id)
      );

      // Fechar diálogo
      setCreateOrderDialog({
        isOpen: false,
        agendamento: null
      });

      // Continuar processando outros agendamentos se houver
      await continueProcessingAfterMultipleEquipment();

    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error('Erro ao criar ordem de serviço');
    }
  };

  // Continuar processando agendamentos após processar equipamento único
  const continueProcessingAfterSingleEquipment = async () => {
    try {
      // Buscar agendamentos selecionados restantes
      const remainingSelectedAgendamentos = agendamentosWithSchedule.filter(ag => ag.isSelected);

      // Verificar se ainda há agendamentos com múltiplos equipamentos
      const remainingMultipleEquipments = remainingSelectedAgendamentos.filter(ag =>
        orderLifecycleService.hasMultipleEquipments(ag)
      );

      if (remainingMultipleEquipments.length > 0) {
        // Processar o próximo agendamento com múltiplos equipamentos
        const nextAgendamento = remainingMultipleEquipments[0];

        setMultipleEquipmentModal({
          isOpen: true,
          agendamento: nextAgendamento,
          scheduledDate: selectedDate,
          scheduledTime: nextAgendamento.scheduledTime
        });

        return;
      }

      // Verificar se ainda há agendamentos únicos
      const remainingSingleEquipments = remainingSelectedAgendamentos.filter(ag =>
        !orderLifecycleService.hasMultipleEquipments(ag)
      );

      if (remainingSingleEquipments.length > 0) {
        // Processar o próximo agendamento único
        const nextAgendamento = remainingSingleEquipments[0];

        setSingleEquipmentModal({
          isOpen: true,
          agendamento: nextAgendamento,
          scheduledDate: selectedDate,
          scheduledTime: nextAgendamento.scheduledTime
        });

        return;
      }

      // Se não há mais agendamentos, finalizar
      toast.success('🎉 Todos os agendamentos foram processados com sucesso!');
      onClose();

    } catch (error) {
      console.error('Erro ao continuar processamento:', error);
      toast.error('Erro ao processar agendamentos restantes');
    }
  };

  // Continuar processando agendamentos após processar múltiplos equipamentos
  const continueProcessingAfterMultipleEquipment = async () => {
    try {
      // Buscar agendamentos selecionados restantes
      const remainingSelectedAgendamentos = agendamentosWithSchedule.filter(ag => ag.isSelected);

      // Verificar se ainda há agendamentos com múltiplos equipamentos
      const remainingMultipleEquipments = remainingSelectedAgendamentos.filter(ag =>
        orderLifecycleService.hasMultipleEquipments(ag)
      );

      if (remainingMultipleEquipments.length > 0) {
        // Processar o próximo agendamento com múltiplos equipamentos
        const nextAgendamento = remainingMultipleEquipments[0];

        setMultipleEquipmentModal({
          isOpen: true,
          agendamento: nextAgendamento,
          scheduledDate: selectedDate,
          scheduledTime: nextAgendamento.scheduledTime
        });

        return;
      }

      // Processar agendamentos normais restantes
      const normalAgendamentos = remainingSelectedAgendamentos.filter(ag =>
        !orderLifecycleService.hasMultipleEquipments(ag)
      );

      if (normalAgendamentos.length > 0) {
        const scheduleData: ScheduleData[] = normalAgendamentos.map(ag => ({
          agendamentoId: ag.id,
          scheduledTime: ag.scheduledTime,
          estimatedDuration: ag.estimatedDuration,
          selectedDate: selectedDate
        }));

        await onApply(normalAgendamentos, selectedTechnicianId, scheduleData, selectedDate);

        toast.success(
          `🎉 Rota aplicada com sucesso! ${normalAgendamentos.length} agendamentos confirmados para ${format(parseISO(selectedDate), 'dd/MM/yyyy', { locale: ptBR })}`,
          { duration: 4000 }
        );
      } else {
        toast.success('🎉 Todos os agendamentos foram processados com sucesso!');
      }

      // Fechar modal principal se não há mais agendamentos para processar
      if (remainingSelectedAgendamentos.length === 0) {
        onClose();
      }

    } catch (error) {
      console.error('Erro ao continuar processamento:', error);
      toast.error('Erro ao processar agendamentos restantes');
    }
  };

  const handleAgendamentoDrop = (agendamentoId: number, date: Date, time: string) => {
    const dateString = format(date, 'yyyy-MM-dd');

    // Verificar se já existe outro agendamento no mesmo horário
    const conflictingAgendamento = agendamentosWithSchedule.find(
      ag => ag.id !== agendamentoId &&
           ag.isSelected &&
           ag.scheduledTime === time &&
           selectedDate === dateString
    );

    if (conflictingAgendamento) {
      toast.error(
        `⚠️ Conflito de horário! ${conflictingAgendamento.nome} já está agendado para ${time}`,
        {
          duration: 4000,
          style: {
            background: '#EF4444',
            color: 'white',
          },
        }
      );
      // Limpar estado de drag mesmo em caso de erro
      setDraggedAgendamento(null);
      return;
    }

    // Verificar se a data do drop é diferente da data selecionada
    if (dateString !== selectedDate) {
      // Se for um drag manual (não otimização), permitir mudança de data
      if (draggedAgendamento) {
        setSelectedDate(dateString);
        toast.info(
          `📅 Data alterada para ${format(date, 'dd/MM/yyyy')}`,
          {
            duration: 2000,
            style: {
              background: '#3B82F6',
              color: 'white',
            },
          }
        );
      } else {
        // Se for otimização automática, não permitir mudança de data
        console.warn(`⚠️ Tentativa de mover agendamento para data diferente durante otimização: ${dateString} vs ${selectedDate}`);
        return;
      }
    }

    // Buscar o agendamento completo
    const agendamento = agendamentosWithSchedule.find(ag => ag.id === agendamentoId);
    if (!agendamento) {
      console.error('Agendamento não encontrado:', agendamentoId);
      setDraggedAgendamento(null);
      return;
    }

    // Verificar se possui múltiplos equipamentos
    const hasMultipleEquipments = orderLifecycleService.hasMultipleEquipments(agendamento);

    if (hasMultipleEquipments) {
      // Abrir modal de múltiplos equipamentos
      setMultipleEquipmentModal({
        isOpen: true,
        agendamento: agendamento,
        scheduledDate: dateString,
        scheduledTime: time
      });
      setDraggedAgendamento(null);
      return;
    }

    // Abrir modal de equipamento único para configuração
    setSingleEquipmentModal({
      isOpen: true,
      agendamento: agendamento,
      scheduledDate: dateString,
      scheduledTime: time
    });
    setDraggedAgendamento(null);
  };

  // Aplicar rota
  const handleApplyRoute = async () => {
    console.log('🚀 [handleApplyRoute] Função chamada!');
    alert('🚀 Função handleApplyRoute chamada!');

    if (!selectedTechnicianId) {
      toast.error('Selecione um técnico para a rota');
      return;
    }

    if (!selectedDate) {
      toast.error('Selecione uma data para os agendamentos');
      return;
    }

    const selectedAgendamentos = agendamentosWithSchedule.filter(ag => ag.isSelected);

    // Log seguro dos agendamentos selecionados
    const nomesSelecionados = selectedAgendamentos.map(ag => ag.nome).join(', ');
    console.log('📋 Agendamentos selecionados:', nomesSelecionados);
    console.log('🎯 Teste Multiplos Equipamentos na lista?', nomesSelecionados.includes('Teste Multiplos Equipamentos'));

    // Alert para debug
    alert(`📋 Selecionados: ${nomesSelecionados}`);

    if (selectedAgendamentos.length === 0) {
      toast.error('Selecione pelo menos um agendamento');
      return;
    }

    // 🔥 PRIMEIRA PRIORIDADE: Verificar múltiplos equipamentos ANTES de qualquer validação
    console.log('🔍 Verificando agendamentos selecionados:', selectedAgendamentos.map(ag => ({
      nome: ag.nome,
      equipamentos: ag.equipamentos,
      equipamento: ag.equipamento
    })));

    const agendamentosWithMultipleEquipments = selectedAgendamentos.filter(ag => {
      console.log('🔍 Verificando agendamento:', ag.nome, 'equipamentos:', ag.equipamentos, 'tipo:', typeof ag.equipamentos);

      const hasMultiple = orderLifecycleService.hasMultipleEquipments(ag);
      console.log('🎯 Tem múltiplos equipamentos?', hasMultiple);

      return hasMultiple;
    });

    if (agendamentosWithMultipleEquipments.length > 0) {
      // Se há agendamentos com múltiplos equipamentos, abrir modal específico
      console.log('🔄 Detectados agendamentos com múltiplos equipamentos:', agendamentosWithMultipleEquipments.length);

      const firstMultipleEquipmentAgendamento = agendamentosWithMultipleEquipments[0];

      setMultipleEquipmentModal({
        isOpen: true,
        agendamento: firstMultipleEquipmentAgendamento,
        scheduledDate: selectedDate,
        scheduledTime: firstMultipleEquipmentAgendamento.scheduledTime
      });

      return;
    }

    // Verificar se há agendamentos únicos
    const agendamentosWithSingleEquipment = selectedAgendamentos.filter(ag =>
      !orderLifecycleService.hasMultipleEquipments(ag)
    );

    if (agendamentosWithSingleEquipment.length > 0) {
      // Se há agendamentos únicos, abrir modal específico
      console.log('🔄 Detectados agendamentos com equipamento único:', agendamentosWithSingleEquipment.length);

      const firstSingleEquipmentAgendamento = agendamentosWithSingleEquipment[0];

      setSingleEquipmentModal({
        isOpen: true,
        agendamento: firstSingleEquipmentAgendamento,
        scheduledDate: selectedDate,
        scheduledTime: firstSingleEquipmentAgendamento.scheduledTime
      });

      return;
    }

    // Se chegou aqui, não há agendamentos para processar
    toast.warning('❌ Nenhum agendamento válido encontrado.', { duration: 4000 });
  };

  // Estatísticas da seleção
  const selectedCount = agendamentosWithSchedule.filter(ag => ag.isSelected).length;
  const totalCount = agendamentosWithSchedule.length;
  const selectedTechnician = technicians.find(tech => tech.id === selectedTechnicianId);

  if (!route) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Aplicar Rota - Grupo {route.logisticsGroup}
          </DialogTitle>
          <DialogDescription>
            Selecione os agendamentos e configure os horários para aplicar a rota otimizada
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Resumo da rota */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
              <div className="text-xs text-gray-600">Selecionados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{route.totalDistance} km</div>
              <div className="text-xs text-gray-600">Distância</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.ceil(route.totalTime / 60)}h {route.totalTime % 60}min
              </div>
              <div className="text-xs text-gray-600">Tempo Est.</div>
            </div>
          </div>

          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="technician">Técnico Responsável</Label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {tech.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedDate">Data dos Agendamentos</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')} // Não permitir datas passadas
              />
            </div>
          </div>

          {/* Calendário Visual - Semanal */}
          {selectedTechnicianId && (
            <div className="max-w-4xl mx-auto">
              <WeeklyRouteCalendar
                selectedDate={selectedDate ? parseISO(selectedDate) : undefined}
                onDateSelect={handleCalendarDateSelect}
                availabilityData={calendarAvailabilityData}
                isLoading={isCheckingAvailability}
                technicianId={selectedTechnicianId}
                className="compact-calendar"
                onAgendamentoDrop={handleAgendamentoDrop}
                onAgendamentoDragStart={handleAgendamentoDragStart}
                onAgendamentoDragEnd={handleAgendamentoDragEnd}
                draggedAgendamento={draggedAgendamento}
                agendamentos={agendamentosWithSchedule.map(ag => ({
                  id: ag.id,
                  nome: ag.nome,
                  scheduledTime: ag.scheduledTime,
                  isSelected: ag.isSelected,
                  sequenceOrder: ag.sequenceOrder
                }))}
                selectedDateString={selectedDate}
              />
            </div>
          )}



          {/* Indicador de disponibilidade */}
          {selectedTechnicianId && selectedDate && (
            <div className={`border rounded-lg p-3 ${
              isCheckingAvailability
                ? 'bg-yellow-50 border-yellow-200'
                : availabilityCheck?.totalAvailable === 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {isCheckingAvailability ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Verificando disponibilidade...</span>
                  </>
                ) : availabilityCheck ? (
                  <>
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Disponibilidade: {availabilityCheck.totalAvailable} slots livres de {availabilityCheck.slots.length} total
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Erro ao verificar disponibilidade</span>
                  </>
                )}
              </div>

              {availabilityCheck && availabilityCheck.totalAvailable === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Nenhum horário disponível para esta data. Selecione outra data ou técnico.
                </p>
              )}
            </div>
          )}

          {/* Controles de seleção */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {agendamentosWithSchedule.filter(ag => !ag.scheduledTime || ag.scheduledTime === '').every(ag => ag.isSelected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>

            <Badge variant="secondary">
              {agendamentosWithSchedule.filter(ag => !ag.scheduledTime || ag.scheduledTime === '').length} disponíveis
            </Badge>
          </div>

          <Separator />

          {/* Lista de agendamentos */}
          <ScrollArea className="flex-1 h-[300px]">
            <div className="space-y-3">
              {agendamentosWithSchedule
                .filter(agendamento => !agendamento.scheduledTime || agendamento.scheduledTime === '')
                .map((agendamento, index) => (
                <div
                  key={agendamento.id}
                  draggable
                  onDragStart={() => handleAgendamentoDragStart(agendamento)}
                  onDragEnd={handleAgendamentoDragEnd}
                  className={`p-4 border rounded-lg transition-all cursor-move ${
                    agendamento.isSelected
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  } ${
                    draggedAgendamento?.id === agendamento.id
                      ? 'opacity-50 scale-95 border-dashed'
                      : 'hover:shadow-md hover:border-blue-300'
                  }`}
                  title="Arraste para o calendário para agendar"
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <Checkbox
                        checked={agendamento.isSelected}
                        onCheckedChange={() => toggleAgendamentoSelection(agendamento.id)}
                      />
                    </div>

                    {/* Ordem na sequência */}
                    <div className="flex flex-col items-center gap-1">
                      <DisplayNumber
                        item={{...agendamento, isPreSchedule: true}}
                        index={agendamento.sequenceOrder - 1}
                        variant="badge"
                        size="sm"
                        showIcon={true}
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveAgendamento(agendamento.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveAgendamento(agendamento.id, 'down')}
                          disabled={index === agendamentosWithSchedule.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações do agendamento */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{agendamento.nome}</h4>
                          {agendamento.urgente && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <Input
                            type="time"
                            value={agendamento.scheduledTime}
                            onChange={(e) => updateScheduledTime(agendamento.id, e.target.value)}
                            className={`w-20 h-8 text-xs ${
                              agendamento.isSelected && availabilityCheck && selectedTechnicianId && selectedDate
                                ? (() => {
                                    const hour = parseInt(agendamento.scheduledTime.split(':')[0]);
                                    const slot = availabilityCheck.slots.find(s => s.hour === hour);
                                    return slot && !slot.isAvailable ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50';
                                  })()
                                : ''
                            }`}
                            disabled={!agendamento.isSelected}
                            step="3600" // Intervalos de 1 hora
                          />
                          {agendamento.isSelected && availabilityCheck && selectedTechnicianId && selectedDate && (() => {
                            const hour = parseInt(agendamento.scheduledTime.split(':')[0]);
                            const slot = availabilityCheck.slots.find(s => s.hour === hour);
                            if (slot && !slot.isAvailable) {
                              return (
                                <AlertTriangle className="h-3 w-3 text-red-500" title={slot.reason} />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{agendamento.endereco}</span>
                      </div>

                      <div className="text-sm text-gray-600">
                        <strong>Problema:</strong> {agendamento.problema_relatado}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Duração: {agendamento.estimatedDuration} min</span>
                        <span>Tel: {agendamento.telefone}</span>
                        {agendamento.data_preferida && (
                          <span>Pref: {format(parseISO(agendamento.data_preferida), 'dd/MM', { locale: ptBR })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedTechnician && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Técnico: {selectedTechnician.name}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isApplying}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.info('🔘 Botão "Aplicar Rota" clicado!', { duration: 5000 });
                if (isApplying) {
                  toast.warning('⏳ Já está aplicando...', { duration: 3000 });
                  return;
                }
                if (!selectedTechnicianId) {
                  toast.warning('👤 Nenhum técnico selecionado!', { duration: 3000 });
                  return;
                }
                if (selectedCount === 0) {
                  toast.warning('📋 Nenhum agendamento selecionado!', { duration: 3000 });
                  return;
                }
                handleApplyRoute();
              }}
              disabled={isApplying || !selectedTechnicianId || selectedCount === 0}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aplicar Rota ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Modal de Múltiplos Equipamentos */}
      <MultipleEquipmentModal
        isOpen={multipleEquipmentModal.isOpen}
        onClose={closeMultipleEquipmentModal}
        agendamento={multipleEquipmentModal.agendamento}
        scheduledDate={multipleEquipmentModal.scheduledDate}
        scheduledTime={multipleEquipmentModal.scheduledTime}
        onCreateMultipleOrders={handleCreateMultipleOrders}
        onCreateSingleOrder={handleCreateSingleOrderFromMultiple}
      />

      {/* Modal de Equipamento Único */}
      <SingleEquipmentModal
        isOpen={singleEquipmentModal.isOpen}
        onClose={closeSingleEquipmentModal}
        agendamento={singleEquipmentModal.agendamento}
        scheduledDate={singleEquipmentModal.scheduledDate}
        scheduledTime={singleEquipmentModal.scheduledTime}
        onCreateOrder={handleCreateSingleOrder}
      />

      {/* Diálogo de Criação de Ordem de Serviço */}
      <CreateServiceOrderDialog
        isOpen={createOrderDialog.isOpen}
        onClose={() => setCreateOrderDialog({ isOpen: false, agendamento: null })}
        onConfirm={handleCreateServiceOrder}
        agendamento={createOrderDialog.agendamento}
      />
    </Dialog>
  );
};

export default ApplyRouteModal;
