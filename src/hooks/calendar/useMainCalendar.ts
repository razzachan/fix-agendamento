import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Technician, User } from '@/types';
import { technicianService } from '@/services/technician';
import { isSameDay, format } from 'date-fns';
import { toast } from 'sonner';
import { useCalendarEvents } from '@/hooks/calendar/useCalendarEvents';
import { convertToLegacyCalendarEvent } from '@/utils/calendarStatusMapping';

interface UseMainCalendarProps {
  startDate: Date;
  endDate: Date;
  technicianId: string;
  user: User | null;
}

interface UseMainCalendarReturn {
  events: CalendarEvent[];
  technicians: Technician[];
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  getEventsForDay: (date: Date) => CalendarEvent[];
  getEventsByTimeSlot: (date: Date, hour: number) => CalendarEvent[];
}

export const useMainCalendar = ({
  startDate,
  endDate,
  technicianId,
  user
}: UseMainCalendarProps): UseMainCalendarReturn => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Mapear status de ordem de serviço para status de calendário com cores específicas para coleta diagnóstico
  const mapServiceOrderStatusToCalendarStatus = (status: string): 'confirmed' | 'completed' | 'cancelled' | 'suggested' | 'in_progress' | 'at_workshop' | 'diagnosis' | 'awaiting_approval' | 'in_repair' | 'ready_delivery' => {
    switch (status) {
      // 🔵 AZUL - Agendado/Confirmado
      case 'pending':
      case 'scheduled':
      case 'scheduled_collection':
        return 'confirmed';

      // 🟣 ROXO - Em trânsito/coleta
      case 'on_the_way':
      case 'collected':
      case 'collected_for_diagnosis':
        return 'in_progress';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop':
      case 'received_at_workshop':
        return 'at_workshop';

      // 🔵 CIANO - Em diagnóstico
      case 'in_progress': // Quando é coleta diagnóstico, in_progress = diagnóstico
        return 'diagnosis';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'diagnosis_completed':
      case 'quote_sent':
        return 'awaiting_approval';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'quote_approved':
      case 'needs_workshop':
      case 'in_repair':
        return 'in_repair';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_for_delivery':
      case 'collected_for_delivery':
      case 'on_the_way_to_deliver':
      case 'payment_pending':
        return 'ready_delivery';

      // ✅ VERDE ESCURO - Concluído
      case 'completed':
      case 'delivered':
        return 'completed';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled':
      case 'quote_rejected':
      case 'returned':
        return 'cancelled';

      default:
        return 'suggested';
    }
  };

  // Converter ScheduledService para CalendarEvent
  const convertToCalendarEvent = (service: ScheduledService, relatedOrder?: ServiceOrder): CalendarEvent => {
    // 🔧 CORREÇÃO UTC: Sempre preservar horário visual para todos os eventos
    // Isso evita problemas de timezone onde 15h vira 18h na visualização

    const startTime = createDateFromUTCString(service.scheduledStartTime);
    const endTime = createDateFromUTCString(service.scheduledEndTime);

    console.log(`🕐 [convertToCalendarEvent] ${service.clientName}:`);
    console.log(`🕐 [convertToCalendarEvent] UTC original: ${service.scheduledStartTime}`);
    console.log(`🕐 [convertToCalendarEvent] Local convertido: ${startTime.toISOString()}`);

    // Extrair equipamento e problema da description se não estiverem disponíveis no relatedOrder
    let equipment = relatedOrder?.equipment || 'Equipamento não especificado';
    let problem = relatedOrder?.problem || service.description;

    // Se não há equipment válido, tentar extrair da description (formato: "Equipamento - Problema")
    if ((!relatedOrder?.equipment || equipment === 'Equipamento não especificado') && service.description && service.description.includes(' - ')) {
      const parts = service.description.split(' - ');
      if (parts.length >= 2) {
        equipment = parts[0].trim();
        problem = parts.slice(1).join(' - ').trim(); // Caso haja múltiplos " - "

      }
    }

    return {
      // 🔧 CORREÇÃO: Usar ID original do scheduled_service para evitar duplicatas
      id: service.id,
      startTime,
      endTime,
      clientName: service.clientName,
      technicianId: service.technicianId || '',
      technicianName: service.technicianName || 'Não atribuído',
      equipment,
      problem,
      address: service.address,
      status: service.status === 'scheduled' ? 'confirmed' :
              service.status === 'confirmed' ? 'confirmed' :  // ✅ ADICIONAR MAPEAMENTO PARA 'confirmed'
              service.status === 'completed' ? 'completed' :
              service.status === 'cancelled' ? 'cancelled' :
              service.status === 'in_progress' ? 'in_progress' : 'suggested',
      isUrgent: relatedOrder?.isUrgent || false,
      serviceOrderId: service.serviceOrderId || undefined,
      logisticsGroup: relatedOrder?.logisticsGroup as 'A' | 'B' | 'C' || undefined,
      finalCost: service.finalCost || relatedOrder?.finalCost, // ✅ Incluir valor da OS
      clientPhone: service.clientPhone || relatedOrder?.clientPhone // ✅ Incluir telefone do cliente
    };
  };

  // Buscar ordens de serviço (apenas uma vez)
  const fetchServiceOrders = useCallback(async () => {
    try {
      console.log('📋 [useMainCalendar] Buscando ordens de serviço...');
      const orders = await serviceOrderService.getAll();
      setServiceOrders(orders);
      console.log(`📋 [useMainCalendar] ${orders.length} ordens de serviço carregadas`);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
    }
  }, []);

  // Buscar técnicos
  const fetchTechnicians = useCallback(async () => {
    if (user?.role !== 'admin') return;

    try {
      const techsData = await technicianService.getAll();
      setTechnicians(techsData);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
      toast.error('Erro ao carregar lista de técnicos');
    }
  }, [user?.role]);

  // Buscar eventos do calendário com controle de estado
  const fetchEvents = useCallback(async () => {
    if (!user || isFetching) return;

    setIsFetching(true);
    setIsLoading(true);
    setError(null);

    try {
      console.warn(`🔍 [useMainCalendar] === BUSCANDO EVENTOS ===`);
      console.warn(`🔍 [useMainCalendar] Range: ${format(startDate, 'dd/MM/yyyy HH:mm')} até ${format(endDate, 'dd/MM/yyyy HH:mm')}`);
      console.warn(`🔍 [useMainCalendar] Range ISO: ${startDate.toISOString()} até ${endDate.toISOString()}`);
      console.warn(`🔍 [useMainCalendar] TechnicianId: ${technicianId}, User role: ${user?.role}`);
      console.warn(`🔍 [useMainCalendar] Data do Giovani: 2025-07-26T15:00:00.000Z`);
      console.warn(`🔍 [useMainCalendar] Giovani está no range: ${new Date('2025-07-26T15:00:00.000Z') >= startDate && new Date('2025-07-26T15:00:00.000Z') <= endDate}`);

      let scheduledServices: ScheduledService[] = [];

      if (user?.role === 'admin') {
        if (technicianId === 'all') {
          // Admin vendo todos os técnicos
          console.log('🔍 [useMainCalendar] Admin buscando dados de todos os técnicos');

          // 1. Buscar todos os serviços no intervalo de datas (excluindo cancelados)
          const allScheduledServicesRaw = await scheduledServiceService.getByDateRange(startDate, endDate);
          const allScheduledServices = allScheduledServicesRaw.filter(service => {
            if (service.status === 'cancelled') {
              return false;
            }

            // Verificar se a ordem de serviço correspondente está cancelada
            if (service.serviceOrderId) {
              const correspondingOrder = serviceOrders.find(order => order.id === service.serviceOrderId);
              if (correspondingOrder && (correspondingOrder.status === 'cancelled' || correspondingOrder.status === 'quote_rejected' || correspondingOrder.status === 'returned')) {
                return false;
              }
            }
            return true;
          });
          console.log(`📋 [useMainCalendar] Encontrados ${allScheduledServices.length} serviços em scheduled_services (todos os técnicos, excluindo cancelados)`);

          // 2. Buscar ordens de serviço SEM agendamento específico (órfãs)
          const orphanOrders = serviceOrders.filter(order => {
            // Excluir ordens canceladas
            if (order.status === 'cancelled' || order.status === 'quote_rejected' || order.status === 'returned') {
              return false;
            }

            // Verificar se tem data agendada no intervalo
            if (!order.scheduledDate) return false;

            const orderDate = new Date(order.scheduledDate);
            const inRange = orderDate >= startDate && orderDate <= endDate;

            if (!inRange) return false;

            // 🔧 ANTI-DUPLICAÇÃO MELHORADA: Verificar se já existe agendamento específico
            const hasScheduledService = allScheduledServices.some(service =>
              service.serviceOrderId === order.id
            );

            if (hasScheduledService) {
              console.log(`🚫 [ANTI-DUPLICAÇÃO] Ordem ${order.id} já tem agendamento específico em scheduled_services - ignorando da service_orders`);
              return false;
            }

            console.log(`📋 [ÓRFÃ] Ordem ${order.id} sem agendamento específico - incluindo no calendário`);
            return true;
          });

          console.log(`📋 [useMainCalendar] Encontradas ${orphanOrders.length} ordens órfãs (sem agendamento específico)`);

          // DEBUG: Log das ordens órfãs
          orphanOrders.forEach(order => {
            console.log(`📋 [DEBUG] Ordem órfã: ${order.id} - ${order.clientName} - ${order.scheduledDate}`);
          });

          // 3. Converter ordens órfãs para formato de serviços agendados
          const ordersAsServices = orphanOrders.map(order => {
            // Calcular horário de fim (1 hora após o início)
            const startTime = new Date(order.scheduledDate!);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);

            const event = {
              id: `order-${order.id}`, // Prefixo para distinguir de scheduled_services
              serviceOrderId: order.id,
              technicianId: order.technicianId!,
              technicianName: order.technicianName!,
              clientId: order.clientId,
              clientName: order.clientName,
              scheduledStartTime: order.scheduledDate!,
              scheduledEndTime: endTime.toISOString(),
              address: order.pickupAddress || order.clientFullAddress || '',
              description: `${order.equipmentType} - ${order.description}`,
              status: mapServiceOrderStatusToCalendarStatus(order.status),
              createdAt: order.createdAt
            };

            console.log(`🎯 [DEBUG] Evento criado: ${event.id} - ${event.clientName} - ${event.scheduledStartTime}`);
            return event;
          });

          console.log(`🔄 [useMainCalendar] Convertidas ${ordersAsServices.length} ordens para formato de serviços (todos os técnicos)`);

          // 4. Combinar ambas as fontes
          scheduledServices = [...allScheduledServices, ...ordersAsServices];
          console.log(`✅ [useMainCalendar] Total de ${scheduledServices.length} itens para todos os técnicos`);
          console.log(`📊 [RESUMO] scheduled_services: ${allScheduledServices.length}, service_orders órfãs: ${ordersAsServices.length}`);
        } else {
          // Admin vendo um técnico específico
          console.log(`🔍 [useMainCalendar] Admin buscando dados do técnico: ${technicianId}`);

          // 1. Buscar serviços de um técnico específico (excluindo cancelados)
          const allServices = await scheduledServiceService.getByTechnicianId(technicianId);
          console.log(`📋 [useMainCalendar] Serviços brutos do técnico ${technicianId}: ${allServices.length}`);

          const filteredServices = allServices.filter(service => {
            // Excluir serviços cancelados do calendário
            if (service.status === 'cancelled') {
              return false;
            }

            // Verificar se a ordem de serviço correspondente está cancelada
            if (service.serviceOrderId) {
              const correspondingOrder = serviceOrders.find(order => order.id === service.serviceOrderId);
              if (correspondingOrder && (correspondingOrder.status === 'cancelled' || correspondingOrder.status === 'quote_rejected' || correspondingOrder.status === 'returned')) {
                return false;
              }
            }

            const serviceDate = new Date(service.scheduledStartTime);
            const inRange = serviceDate >= startDate && serviceDate <= endDate;

            // Debug: Log detalhado da filtragem por data
            console.log(`📅 [useMainCalendar] Serviço ${service.id}: ${format(serviceDate, 'dd/MM/yyyy HH:mm')} - Range: ${format(startDate, 'dd/MM/yyyy HH:mm')} até ${format(endDate, 'dd/MM/yyyy HH:mm')} - InRange: ${inRange}`);

            return inRange;
          });

          console.log(`📋 [useMainCalendar] Encontrados ${filteredServices.length} serviços em scheduled_services (técnico ${technicianId})`);

          // 2. Buscar ordens órfãs do técnico específico (sem agendamento específico)
          const technicianOrphanOrders = serviceOrders.filter(order => {
            if (order.technicianId !== technicianId) return false;

            // Excluir ordens canceladas
            if (order.status === 'cancelled' || order.status === 'quote_rejected' || order.status === 'returned') {
              return false;
            }

            if (!order.scheduledDate) return false;

            const orderDate = new Date(order.scheduledDate);
            const inRange = orderDate >= startDate && orderDate <= endDate;

            if (!inRange) return false;

            // 🔧 ANTI-DUPLICAÇÃO MELHORADA: Verificar se já existe agendamento específico
            const hasScheduledService = filteredServices.some(service =>
              service.serviceOrderId === order.id
            );

            if (hasScheduledService) {
              console.log(`🚫 [ANTI-DUPLICAÇÃO] Ordem ${order.id} já tem agendamento específico em scheduled_services - ignorando da service_orders`);
              return false;
            }

            console.log(`📋 [ÓRFÃ] Ordem ${order.id} sem agendamento específico - incluindo`);
            return true;
          });

          console.log(`📋 [useMainCalendar] Encontradas ${technicianOrphanOrders.length} ordens órfãs (técnico ${technicianId})`);

          // 3. Converter ordens órfãs para formato de serviços
          const ordersAsServices = technicianOrphanOrders.map(order => {
            const startTime = new Date(order.scheduledDate!);
            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 1);

            return {
              id: `order-${order.id}`,
              serviceOrderId: order.id,
              technicianId: order.technicianId!,
              technicianName: order.technicianName!,
              clientId: order.clientId,
              clientName: order.clientName,
              scheduledStartTime: order.scheduledDate!,
              scheduledEndTime: endTime.toISOString(),
              address: order.pickupAddress || order.clientFullAddress || '',
              description: `${order.equipmentType} - ${order.description}`,
              status: mapServiceOrderStatusToCalendarStatus(order.status),
              createdAt: order.createdAt
            };
          });

          // 4. Combinar ambas as fontes
          scheduledServices = [...filteredServices, ...ordersAsServices];
          console.log(`✅ [useMainCalendar] Total de ${scheduledServices.length} itens para o técnico ${technicianId}`);
        }
      } else if (user?.role === 'technician') {
        // Técnico vê apenas seus próprios serviços
        // Usar technicianId se fornecido, senão usar user.id
        const targetTechnicianId = technicianId || user.id;
        console.log(`🔍 [useMainCalendar] Buscando dados para técnico: ${targetTechnicianId} (technicianId: ${technicianId}, user.id: ${user.id})`);

        // 1. Buscar serviços agendados na tabela scheduled_services (excluindo cancelados)
        const allServices = await scheduledServiceService.getByTechnicianId(targetTechnicianId);
        const filteredServices = allServices.filter(service => {
          // Excluir serviços cancelados do calendário
          if (service.status === 'cancelled') {
            return false;
          }

          // Verificar se a ordem de serviço correspondente está cancelada
          if (service.serviceOrderId) {
            const correspondingOrder = serviceOrders.find(order => order.id === service.serviceOrderId);
            if (correspondingOrder && (correspondingOrder.status === 'cancelled' || correspondingOrder.status === 'quote_rejected' || correspondingOrder.status === 'returned')) {
              return false;
            }
          }

          // 🔧 CORREÇÃO UTC: Sempre preservar horário visual para todos os eventos
          const serviceDate = createDateFromUTCString(service.scheduledStartTime);

          const inRange = serviceDate >= startDate && serviceDate <= endDate;

          // DEBUG: Log específico para o Giovani
          if (service.clientName?.includes('Giovani')) {
            console.warn(`🎯 [RANGE CHECK] Giovani (PRESERVADO):`, {
              originalUTC: service.scheduledStartTime,
              serviceDate: serviceDate.toISOString(),
              serviceDateLocal: serviceDate.toLocaleString('pt-BR'),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              inRange: inRange,
              serviceId: service.id
            });
          }

          return inRange;
        });

        console.warn(`📋 [useMainCalendar] Encontrados ${filteredServices.length} serviços em scheduled_services`);

        // DEBUG: Verificar se o serviço do Giovani está na lista
        const giovaniService = filteredServices.find(s => s.clientName?.includes('Giovani'));
        if (giovaniService) {
          console.warn(`🎯 [DEBUG] Serviço do Giovani encontrado em scheduled_services:`, {
            id: giovaniService.id,
            serviceOrderId: giovaniService.serviceOrderId,
            scheduledStartTime: giovaniService.scheduledStartTime,
            status: giovaniService.status
          });
        } else {
          console.warn(`❌ [DEBUG] Serviço do Giovani NÃO encontrado em scheduled_services`);

          // Verificar se existe no array original
          const giovaniInOriginal = scheduledServices.find(s => s.clientName?.includes('Giovani'));
          if (giovaniInOriginal) {
            console.warn(`🔍 [DEBUG] Giovani existe no array original mas foi filtrado:`, {
              id: giovaniInOriginal.id,
              scheduledStartTime: giovaniInOriginal.scheduledStartTime,
              status: giovaniInOriginal.status,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              serviceDate: new Date(giovaniInOriginal.scheduledStartTime).toISOString(),
              inRange: new Date(giovaniInOriginal.scheduledStartTime) >= startDate && new Date(giovaniInOriginal.scheduledStartTime) <= endDate
            });
          }
        }

        // 2. Buscar ordens órfãs do técnico (sem agendamento específico)
        const technicianOrphanOrders = serviceOrders.filter(order => {
          // Filtrar apenas ordens atribuídas ao técnico
          if (order.technicianId !== targetTechnicianId) return false;

          // Excluir ordens canceladas
          if (order.status === 'cancelled' || order.status === 'quote_rejected' || order.status === 'returned') {
            return false;
          }

          // Se tem data agendada, verificar se está no intervalo
          if (order.scheduledDate) {
            // 🔧 CORREÇÃO UTC: Converter UTC para local
            const orderDate = new Date(order.scheduledDate);
            const inRange = orderDate >= startDate && orderDate <= endDate;

            if (!inRange) return false;

            // 🔧 ANTI-DUPLICAÇÃO MELHORADA: Verificar se já existe agendamento específico
            const hasScheduledService = filteredServices.some(service =>
              service.serviceOrderId === order.id
            );

            if (hasScheduledService) {
              console.log(`🚫 [ANTI-DUPLICAÇÃO] Ordem ${order.id} já tem agendamento específico em scheduled_services - ignorando da service_orders`);
              return false;
            }

            return true;
          }

          // Se não tem data agendada, mostrar como "pendente de agendamento"
          return true;
        });

        console.log(`📋 [useMainCalendar] Encontradas ${technicianOrphanOrders.length} ordens órfãs`);

        // 3. Converter ordens órfãs para formato de serviços agendados
        const ordersAsServices = technicianOrphanOrders.map(order => {
          // Calcular horário de fim (1 hora após o início)
          const startTime = new Date(order.scheduledDate!);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1);

          return {
            id: `order-${order.id}`, // Prefixo para distinguir de scheduled_services
            serviceOrderId: order.id,
            technicianId: order.technicianId!,
            technicianName: order.technicianName!,
            clientId: order.clientId,
            clientName: order.clientName,
            scheduledStartTime: order.scheduledDate!,
            scheduledEndTime: endTime.toISOString(), // Adicionar 1 hora ao horário final
            address: order.pickupAddress || order.clientFullAddress || '',
            description: `${order.equipmentType} - ${order.description}`,
            status: mapServiceOrderStatusToCalendarStatus(order.status), // Usar status real da ordem
            createdAt: order.createdAt
          };
        });

        console.log(`🔄 [useMainCalendar] Convertidas ${ordersAsServices.length} ordens para formato de serviços`);

        // 4. Combinar ambas as fontes
        scheduledServices = [...filteredServices, ...ordersAsServices];

        console.log(`✅ [useMainCalendar] Total de ${scheduledServices.length} itens para o técnico`);
        console.log(`📊 [RESUMO] scheduled_services: ${filteredServices.length}, service_orders órfãs: ${ordersAsServices.length}`);
      }

      console.log(`📋 [useMainCalendar] Encontrados ${scheduledServices.length} serviços agendados`);

      // Converter para CalendarEvent
      const calendarEvents: CalendarEvent[] = scheduledServices.map(service => {
        const relatedOrder = serviceOrders.find(order => order.id === service.serviceOrderId);

        const event = convertToCalendarEvent(service, relatedOrder);

        return event;
      });

      // DEBUG: Log de todos os eventos antes do filtro
      console.warn(`🔍 [DEBUG] === EVENTOS ANTES DO FILTRO ===`);
      console.warn(`🔍 [DEBUG] Total de eventos: ${calendarEvents.length}`);
      calendarEvents.forEach((e, index) => {
        console.warn(`🔍 [DEBUG] Evento ${index + 1}:`, {
          id: e.id,
          clientName: e.clientName,
          status: e.status,
          scheduledStartTime: e.scheduledStartTime,
          serviceOrderId: e.serviceOrderId,
          isGiovani: e.clientName?.includes('Giovani')
        });
      });

      // 🔍 VERIFICAÇÃO DE DUPLICATAS: Detectar possíveis duplicatas por serviceOrderId
      const serviceOrderIds = calendarEvents
        .filter(e => e.serviceOrderId)
        .map(e => e.serviceOrderId);

      const duplicateServiceOrderIds = serviceOrderIds.filter((id, index) =>
        serviceOrderIds.indexOf(id) !== index
      );

      if (duplicateServiceOrderIds.length > 0) {
        console.error(`🚨 [DUPLICATAS DETECTADAS] ServiceOrderIds duplicados:`, duplicateServiceOrderIds);
        duplicateServiceOrderIds.forEach(duplicateId => {
          const duplicateEvents = calendarEvents.filter(e => e.serviceOrderId === duplicateId);
          console.error(`🔍 [DUPLICATA] ServiceOrder ${duplicateId}:`, duplicateEvents.map(e => ({
            id: e.id,
            clientName: e.clientName,
            scheduledStartTime: e.scheduledStartTime,
            source: e.id.startsWith('order-') ? 'service_orders' : 'scheduled_services'
          })));

          // 🔧 CORREÇÃO AUTOMÁTICA: Remover duplicatas, mantendo apenas o scheduled_services
          const scheduledServiceEvent = duplicateEvents.find(e => !e.id.startsWith('order-'));
          const serviceOrderEvent = duplicateEvents.find(e => e.id.startsWith('order-'));

          if (scheduledServiceEvent && serviceOrderEvent) {
            console.warn(`🔧 [AUTO-CORREÇÃO] Removendo duplicata da service_orders para ${duplicateId}`);
            // Remover o evento da service_orders do array
            const indexToRemove = calendarEvents.findIndex(e => e.id === serviceOrderEvent.id);
            if (indexToRemove !== -1) {
              calendarEvents.splice(indexToRemove, 1);
            }
          }
        });
      }

      // Filtrar eventos relevantes para o calendário principal (excluir sugeridos e cancelados)
      // IMPORTANTE: Eventos cancelados NÃO devem aparecer no calendário
      console.warn(`🔍 [FILTER] === INICIANDO FILTRO DE RELEVÂNCIA ===`);

      const relevantEvents = calendarEvents.filter(event => {
        const isRelevant = event.status === 'confirmed' ||    // ✅ INCLUIR AGENDADOS (scheduled)
                          event.status === 'completed' ||    // ✅ INCLUIR CONCLUÍDOS
                          event.status === 'in_progress';    // ✅ INCLUIR EM PROGRESSO

        const isGiovani = event.clientName?.includes('Giovani');

        if (isGiovani) {
          console.warn(`🎯 [FILTER] GIOVANI ENCONTRADO:`, {
            id: event.id,
            clientName: event.clientName,
            status: event.status,
            isRelevant: isRelevant,
            scheduledStartTime: event.scheduledStartTime
          });
        }

        console.log(`🔍 [FILTER] Evento ${event.clientName}: status="${event.status}", isRelevant=${isRelevant}`);
        return isRelevant;
      });

      console.log(`✅ [useMainCalendar] ${relevantEvents.length} eventos relevantes carregados (excluindo cancelados)`);
      setEvents(relevantEvents);

    } catch (error) {
      console.error('Erro ao carregar eventos do calendário:', error);
      setError('Erro ao carregar eventos do calendário');
      toast.error('Erro ao carregar eventos do calendário');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [startDate, endDate, technicianId, user?.role, user?.id, isFetching]);

  // Buscar eventos de um dia específico
  const getEventsForDay = useCallback((date: Date): CalendarEvent[] => {
    return events.filter(event => isSameDay(event.startTime, date));
  }, [events]);

  // Buscar eventos de um slot de horário específico
  const getEventsByTimeSlot = useCallback((date: Date, hour: number): CalendarEvent[] => {
    const result = events.filter(event => {
      const eventHour = event.startTime.getHours();
      return isSameDay(event.startTime, date) && eventHour === hour;
    });

    // Debug: Log quando há eventos no slot
    if (result.length > 0) {
      console.warn(`🔍 [getEventsByTimeSlot] ${format(date, 'dd/MM')} ${hour}h: ${result.length} eventos`);
    }

    return result;
  }, [events]);

  // Função para atualização otimista de eventos
  const updateEvent = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    console.warn(`🔄 [UPDATE EVENT] Atualizando ${eventId} otimisticamente`);
    setEvents(prevEvents => {
      const newEvents = prevEvents.map(event => {
        if (event.id === eventId) {
          const updatedEvent = { ...event, ...updates };
          console.warn(`✅ [UPDATE EVENT] Evento ${eventId} atualizado:`, {
            antes: { startTime: event.startTime, endTime: event.endTime },
            depois: { startTime: updatedEvent.startTime, endTime: updatedEvent.endTime }
          });
          return updatedEvent;
        }
        return event;
      });
      console.warn(`📊 [UPDATE EVENT] Total de eventos após atualização: ${newEvents.length}`);
      return newEvents;
    });
  }, []);

  // Função para atualizar eventos
  const refreshEvents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchEvents();
  }, [fetchEvents]);

  // Efeito de inicialização - executa apenas uma vez
  useEffect(() => {
    if (user?.id && !isInitialized) {
      console.log('🔄 [useMainCalendar] Inicializando dados...');
      setIsInitialized(true);

      const initializeData = async () => {
        await fetchServiceOrders();
        if (user.role === 'admin') {
          await fetchTechnicians();
        }
        // NÃO chamar fetchEvents aqui - será chamado pelo useEffect que monitora serviceOrders
      };

      initializeData();
    }
  }, [user?.id, isInitialized, fetchServiceOrders, fetchTechnicians]);

  // Efeito para carregar eventos após serviceOrders ser carregado
  useEffect(() => {
    if (isInitialized && serviceOrders.length > 0 && user?.id) {
      console.log('🔄 [useMainCalendar] ServiceOrders carregado, iniciando carregamento de eventos...');
      fetchEvents();
    }
  }, [serviceOrders.length, isInitialized, user?.id, fetchEvents]);

  // Efeito para recarregar eventos quando parâmetros mudam (com debounce)
  useEffect(() => {
    if (isInitialized && user?.id && !isFetching) {
      console.log('🔄 [useMainCalendar] Parâmetros mudaram, agendando recarregamento...');

      // Debounce para evitar múltiplas chamadas
      const debounceTimer = setTimeout(() => {
        if (!isFetching) {
          console.log('🔄 [useMainCalendar] Executando recarregamento após debounce...');
          fetchEvents();
        }
      }, 300); // 300ms de debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [
    startDate.getTime(),
    endDate.getTime(),
    technicianId,
    isInitialized // Adicionar para evitar execução antes da inicialização
  ]); // Dependências mínimas e controladas

  // Efeito de fallback para garantir que os dados sejam carregados
  useEffect(() => {
    // Se após 2 segundos ainda não temos eventos e não estamos carregando, forçar carregamento
    const fallbackTimer = setTimeout(() => {
      if (user?.id && events.length === 0 && !isLoading && !isFetching) {
        console.log('🔄 [useMainCalendar] Fallback: Forçando carregamento de eventos...');
        fetchEvents();
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [user?.id, events.length, isLoading, isFetching, fetchEvents]);

  // Auto-refresh REMOVIDO para evitar loops
  // O usuário pode usar o botão "Atualizar" para refresh manual

  return {
    events,
    technicians,
    isLoading,
    error,
    refreshEvents,
    updateEvent,
    getEventsForDay,
    getEventsByTimeSlot
  };
};
