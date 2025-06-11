
import { useState, useEffect, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { scheduledServiceService } from '@/services';
import { ScheduledService, ServiceOrder } from '@/types';

interface UseTechnicianCalendarProps {
  technicianId: string;
  serviceOrders: ServiceOrder[];
}

export const useTechnicianCalendar = ({ technicianId, serviceOrders }: UseTechnicianCalendarProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Função para buscar serviços agendados
  const fetchScheduledServices = useCallback(async () => {
    if (!technicianId || isFetching) return;

    setIsFetching(true);
    setIsLoading(true);
    try {
      console.log('🔄 [useTechnicianCalendar] Buscando serviços agendados para técnico:', technicianId);
      const services = await scheduledServiceService.getByTechnicianId(technicianId);
      console.log(`📋 [useTechnicianCalendar] ${services.length} serviços carregados`);
      setScheduledServices(services);
    } catch (error) {
      console.error('Erro ao carregar serviços agendados:', error);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [technicianId, isFetching]);

  // Efeito de inicialização - executa apenas uma vez
  useEffect(() => {
    if (technicianId && !isInitialized) {
      console.log('🔄 [useTechnicianCalendar] Inicializando dados...');
      setIsInitialized(true);
      fetchScheduledServices();
    }
  }, [technicianId, isInitialized, fetchScheduledServices]);

  // Efeito de fallback para garantir que os dados sejam carregados
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (technicianId && scheduledServices.length === 0 && !isLoading && !isFetching) {
        console.log('🔄 [useTechnicianCalendar] Fallback: Forçando carregamento...');
        fetchScheduledServices();
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [technicianId, scheduledServices.length, isLoading, isFetching, fetchScheduledServices]);

  const filteredServices = scheduledServices.filter(service => {
    const serviceDate = new Date(service.scheduledStartTime);
    const isMatchingDate = isSameDay(serviceDate, date);

    // Excluir serviços cancelados para manter o calendário limpo
    const isNotCancelled = service.status !== 'cancelled';

    return isMatchingDate && isNotCancelled;
  });

  const getServiceOrder = (serviceOrderId: string): ServiceOrder | undefined => {
    return serviceOrders.find(order => order.id === serviceOrderId);
  };

  const hasScheduledServices = (day: Date) => {
    return scheduledServices.some(service => {
      const serviceDate = new Date(service.scheduledStartTime);
      return isSameDay(serviceDate, day);
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      'scheduled': 'Agendado',
      'in_progress': 'Em andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'pending': 'Em aberto',
      'on_the_way': 'À Caminho',
      'collected': 'Coletado',
      'at_workshop': 'Na Oficina',
      'payment_pending': 'Pagamento Pendente'
    };
    
    const colors: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'completed': 'bg-green-100 text-green-800 hover:bg-green-200',
      'cancelled': 'bg-red-100 text-red-800 hover:bg-red-200',
      'pending': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'on_the_way': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
      'collected': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
      'at_workshop': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      'payment_pending': 'bg-pink-100 text-pink-800 hover:bg-pink-200'
    };
    
    return {
      label: statusLabels[status] || status,
      className: `${colors[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'} border-none`
    };
  };

  // Função de refresh manual
  const refreshServices = useCallback(() => {
    console.log('🔄 [useTechnicianCalendar] Refresh manual solicitado');
    fetchScheduledServices();
  }, [fetchScheduledServices]);

  return {
    date,
    setDate,
    isLoading,
    scheduledServices,
    filteredServices,
    getServiceOrder,
    hasScheduledServices,
    formatTime,
    getStatusColor,
    getStatusBadge,
    refreshServices
  };
};
