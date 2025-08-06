
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { ServiceOrder } from '@/types';
import { technicianService, scheduledServiceService } from '@/services';
import { statusSyncService } from '@/services/synchronization/statusSyncService';
import { isToday, parseISO, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatUTCStringAsLocal } from '@/utils/timezoneUtils';

/**
 * 🎯 NOVA ABORDAGEM: Busca ordens diretamente do calendar_events (fonte da verdade)
 * Converte eventos do calendário em formato ServiceOrder para compatibilidade
 */
const fetchOrdersFromCalendar = async (technicianId: string): Promise<ServiceOrder[]> => {
  try {
    console.log('🎯 [fetchOrdersFromCalendar] Buscando ordens do calendário para técnico:', technicianId);

    const { data: calendarEvents, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        service_order_id,
        technician_id,
        technician_name,
        client_id,
        client_name,
        client_phone,
        equipment_type,
        start_time,
        end_time,
        address,
        description,
        status,
        event_type,
        created_at
      `)
      .eq('technician_id', technicianId)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ [fetchOrdersFromCalendar] Erro ao buscar eventos:', error);
      return [];
    }

    console.log('📅 [fetchOrdersFromCalendar] Eventos encontrados:', calendarEvents?.length || 0);

    // Converter eventos do calendário para formato ServiceOrder
    const orders: ServiceOrder[] = (calendarEvents || []).map(event => {
      const order: ServiceOrder = {
        id: event.service_order_id || event.id, // Usar service_order_id se disponível, senão usar id do evento
        clientName: event.client_name || 'Cliente não informado',
        clientPhone: event.client_phone || '',
        clientFullAddress: event.address || '',
        pickupAddress: event.address || '',
        equipmentType: event.equipment_type || 'Equipamento não especificado',
        description: event.description || '',
        status: mapCalendarStatusToServiceOrderStatus(event.status),
        scheduledDate: event.start_time,
        technicianId: event.technician_id,
        technicianName: event.technician_name || 'Técnico',
        clientId: event.client_id || null,
        createdAt: event.created_at,
        updatedAt: event.created_at,
        priority: 'medium',
        serviceAttendanceType: mapEventTypeToAttendanceType(event.event_type),
        // Campos específicos do calendário
        _calendarEventId: event.id,
        _isFromCalendar: true
      };

      console.log(`📋 [fetchOrdersFromCalendar] Convertido: ${event.client_name} - ${event.start_time}`);
      return order;
    });

    return orders;
  } catch (error) {
    console.error('❌ [fetchOrdersFromCalendar] Erro:', error);
    return [];
  }
};

/**
 * Mapeia status do calendar_events para status do service_orders
 */
const mapCalendarStatusToServiceOrderStatus = (calendarStatus: string): string => {
  const statusMap: Record<string, string> = {
    'scheduled': 'scheduled',
    'confirmed': 'scheduled',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'on_the_way': 'on_the_way',
    'collected': 'collected_for_diagnosis'
  };

  return statusMap[calendarStatus] || 'scheduled';
};

/**
 * Mapeia event_type do calendar_events para serviceAttendanceType
 */
const mapEventTypeToAttendanceType = (eventType: string | null): string => {
  const typeMap: Record<string, string> = {
    'diagnosis': 'coleta_diagnostico',
    'collection': 'coleta_conserto',
    'service': 'visita_tecnica',
    'delivery': 'entrega'
  };

  return typeMap[eventType || ''] || 'visita_tecnica';
};

/**
 * Ordena as ordens do técnico por horário de agendamento do dia atual
 * Prioridade: Ordens de hoje (por horário) > Ordens de outros dias > Ordens sem data
 */
const sortOrdersByScheduledTime = (orders: ServiceOrder[]): ServiceOrder[] => {
  return [...orders].sort((a, b) => {
    // Verificar se as ordens têm data de agendamento
    const aHasSchedule = a.scheduledDate;
    const bHasSchedule = b.scheduledDate;

    // Se uma tem agendamento e outra não, priorizar a que tem
    if (aHasSchedule && !bHasSchedule) return -1;
    if (!aHasSchedule && bHasSchedule) return 1;
    if (!aHasSchedule && !bHasSchedule) return 0;

    try {
      // Criar objetos Date
      const aDate = new Date(a.scheduledDate!);
      const bDate = new Date(b.scheduledDate!);

      // Verificar se são do dia atual
      const aIsToday = isToday(aDate);
      const bIsToday = isToday(bDate);

      // Priorizar ordens de hoje
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // Se ambas são de hoje OU ambas são de outros dias, ordenar por horário
      return aDate.getTime() - bDate.getTime();

    } catch (error) {
      console.warn('Erro ao ordenar ordens por horário:', error);
      return 0;
    }
  });
};

export const useTechnicianOrders = () => {
  const { user } = useAuth();
  const { updateServiceOrder, isLoading } = useAppData();
  const [technicianOrders, setTechnicianOrders] = useState<ServiceOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [scheduledServices, setScheduledServices] = useState<any[]>([]);

  // 🎯 NOVA IMPLEMENTAÇÃO: Buscar ordens do calendário usando useEffect
  useEffect(() => {
    if (!user?.id) {
      console.log('🎯 [useTechnicianOrders] Usuário não disponível ainda');
      return;
    }

    const fetchCalendarOrders = async () => {
      try {
        console.log('🎯 [useTechnicianOrders] Buscando ordens do calendário para user:', user.email);

        // 1. Buscar o technician_id na tabela technicians usando user.id
        const { data: technicianData, error: technicianError } = await supabase
          .from('technicians')
          .select('id, name, user_id')
          .eq('user_id', user.id)
          .single();

        if (technicianError) {
          console.error('🚨 [useTechnicianOrders] Erro ao buscar technician:', technicianError);
          setIsPageLoading(false);
          return;
        }

        if (!technicianData) {
          console.log('🚨 [useTechnicianOrders] Nenhum técnico encontrado para user_id:', user.id);
          setTechnicianOrders([]);
          setIsPageLoading(false);
          return;
        }

        console.log('🎯 [useTechnicianOrders] Técnico encontrado:', technicianData.name);
        const technicianId = technicianData.id;

        // 2. Buscar calendar_events usando o technician_id correto
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('technician_id', technicianId)
          .eq('event_type', 'service')
          .order('start_time', { ascending: true });

        if (error) {
          console.error('🚨 [useTechnicianOrders] Erro ao buscar calendar_events:', error);
          setIsPageLoading(false);
          return;
        }

        console.log('🎯 [useTechnicianOrders] Calendar events encontrados:', data?.length || 0);

        // 3. Converter calendar events para ServiceOrders
        if (data && data.length > 0) {
          const serviceOrders: ServiceOrder[] = data.map((event: any) => ({
            id: event.service_order_id || event.id,
            clientName: event.client_name,
            clientPhone: event.client_phone,
            clientId: event.client_id,
            technicianId: event.technician_id,
            technicianName: event.technician_name,
            scheduledDate: event.start_time,
            scheduledTime: event.start_time,
            address: event.address,
            addressComplement: event.address_complement,
            description: event.description,
            equipmentType: event.equipment_type,
            status: event.status,
            isUrgent: event.is_urgent || false,
            finalCost: event.final_cost,
            createdAt: event.created_at,
            updatedAt: event.updated_at,
            // Campos adicionais
            serviceAttendanceType: 'em_domicilio',
            notes: '',
            estimatedDuration: 60,
          }));

          console.log('✅ [useTechnicianOrders] ServiceOrders carregadas:', serviceOrders.length);
          setTechnicianOrders(serviceOrders);
        } else {
          console.log('ℹ️ [useTechnicianOrders] Nenhum calendar event encontrado');
          setTechnicianOrders([]);
        }

        setIsPageLoading(false);

      } catch (error) {
        console.error('🚨 [useTechnicianOrders] Erro na busca:', error);
        setIsPageLoading(false);
      }
    };

    fetchCalendarOrders();
  }, [user?.id]);



  // ✅ Lógica de busca de ordens movida para o primeiro useEffect

  // Handle order status updates with synchronization
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      console.log(`🔄 [useTechnicianOrders] Atualizando status: ${orderId} → ${newStatus}`, { notes });

      // Atualizar ServiceOrder (incluindo notes se fornecidas)
      const updateData: any = { status: newStatus as any };
      if (notes) {
        updateData.notes = notes;
      }

      const success = await updateServiceOrder(orderId, updateData);

      if (success) {
        // Sincronizar com ScheduledService
        await statusSyncService.syncServiceOrderToScheduled(
          orderId,
          newStatus,
          scheduledServices
        );

        console.log(`✅ Status atualizado e sincronizado: ${orderId} → ${newStatus}`, { notes });
      }

      return success;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      return false;
    }
  };

  const selectedOrder = technicianOrders.find(order => order.id === selectedOrderId);

  return {
    orders: technicianOrders,
    selectedOrder,
    selectedOrderId,
    setSelectedOrderId,
    isLoading: isLoading || isPageLoading,
    handleUpdateOrderStatus,
    scheduledServices
  };
};
