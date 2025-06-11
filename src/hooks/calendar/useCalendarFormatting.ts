
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useCalendarFormatting = () => {
  // Format time from ISO string to readable format
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  // Get event status color
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

  // Return badge data instead of JSX
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

  return {
    formatTime,
    getStatusColor,
    getStatusBadge
  };
};
