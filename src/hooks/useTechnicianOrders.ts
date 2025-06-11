
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { ServiceOrder } from '@/types';
import { technicianService, scheduledServiceService } from '@/services';
import { statusSyncService } from '@/services/synchronization/statusSyncService';
import { isToday, parseISO, format } from 'date-fns';

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
  const { serviceOrders, updateServiceOrder, isLoading } = useAppData();
  const [technicianOrders, setTechnicianOrders] = useState<ServiceOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [scheduledServices, setScheduledServices] = useState<any[]>([]);

  // Load technician data
  useEffect(() => {
    const loadTechnicianData = async () => {
      if (!user?.id) {
        console.log('❌ [useTechnicianOrders] Sem user.id:', user);
        return;
      }

      try {
        console.log('🔍 [useTechnicianOrders] Buscando técnico para user.id:', user.id);
        const technicianRecord = await technicianService.getByUserId(user.id);
        console.log('👤 [useTechnicianOrders] Technician record encontrado:', technicianRecord);

        if (technicianRecord) {
          console.log('✅ [useTechnicianOrders] Técnico encontrado! ID:', technicianRecord.id);
          setTechnicianId(technicianRecord.id);

          // Carregar serviços agendados do técnico
          console.log('📅 [useTechnicianOrders] Carregando serviços agendados...');
          const services = await scheduledServiceService.getByTechnicianId(technicianRecord.id);
          console.log('📅 [useTechnicianOrders] Serviços agendados carregados:', services.length);
          setScheduledServices(services);
        } else {
          console.log('❌ [useTechnicianOrders] Nenhum técnico encontrado para user.id:', user.id);
        }
      } catch (error) {
        console.error('❌ [useTechnicianOrders] Erro ao carregar dados do técnico:', error);
      } finally {
        setIsPageLoading(false);
      }
    };

    loadTechnicianData();
  }, [user?.id]);

  // Filter orders for the current technician
  useEffect(() => {
    if (technicianId) {
      console.log('🔍 [useTechnicianOrders] === FILTRAGEM DE ORDENS ===');
      console.log('🔍 [useTechnicianOrders] Current user ID:', user?.id);
      console.log('🔍 [useTechnicianOrders] Current technician ID:', technicianId);
      console.log('🔍 [useTechnicianOrders] Total service orders disponíveis:', serviceOrders.length);

      // Log detalhado de todas as ordens
      serviceOrders.forEach((order, index) => {
        console.log(`📋 [useTechnicianOrders] Ordem ${index + 1}:`, {
          id: order.id.substring(0, 8),
          clientName: order.clientName,
          technicianId: order.technicianId,
          technicianName: order.technicianName,
          status: order.status
        });
      });

      const filteredOrders = serviceOrders.filter(order => {
        const match = order.technicianId === technicianId;
        console.log(`🔍 [useTechnicianOrders] Ordem ${order.clientName}: ${order.technicianId} === ${technicianId} ? ${match}`);
        return match;
      });

      // Ordenar por horário de agendamento (dia atual primeiro, depois por horário)
      const sortedOrders = sortOrdersByScheduledTime(filteredOrders);

      console.log('✅ [useTechnicianOrders] Ordens filtradas e ordenadas por horário:', sortedOrders.length);
      sortedOrders.forEach((order, index) => {
        const scheduledInfo = order.scheduledDate
          ? format(new Date(order.scheduledDate), 'dd/MM/yyyy HH:mm')
          : 'Sem agendamento';
        const isOrderToday = order.scheduledDate ? isToday(new Date(order.scheduledDate)) : false;

        console.log(`✅ [useTechnicianOrders] ${index + 1}º lugar:`, {
          id: order.id.substring(0, 8),
          clientName: order.clientName,
          status: order.status,
          scheduled: scheduledInfo,
          isToday: isOrderToday ? '🔥 HOJE' : '📅 Outro dia'
        });
      });

      setTechnicianOrders(sortedOrders);

      if (!selectedOrderId && sortedOrders.length > 0) {
        setSelectedOrderId(sortedOrders[0].id);
        console.log('✅ [useTechnicianOrders] Primeira ordem selecionada (por horário):', sortedOrders[0].id.substring(0, 8));
      }
    } else {
      console.log('❌ [useTechnicianOrders] Sem technicianId para filtrar ordens');
    }
  }, [serviceOrders, technicianId, user?.id]);

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
    technicianOrders,
    selectedOrder,
    selectedOrderId,
    setSelectedOrderId,
    isLoading: isLoading || isPageLoading,
    handleUpdateOrderStatus,
    technicianId
  };
};
