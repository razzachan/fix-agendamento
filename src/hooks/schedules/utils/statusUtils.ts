
import { AgendamentoAI } from '@/services/agendamentos';
import { format, isToday as isDayToday } from 'date-fns';

export const isToday = (dateString: string) => {
  return isDayToday(new Date(dateString));
};

export const getUrgencyClass = (agendamento: AgendamentoAI) => {
  if (agendamento.urgente) {
    return 'bg-red-100 border-l-4 border-red-500';
  }
  return '';
};

export const getStatusButtonClass = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'bg-orange-100 text-orange-800';
    case 'confirmado':
      return 'bg-green-100 text-green-800';
    case 'reagendado':
      return 'bg-blue-100 text-blue-800';
    case 'cancelado':
      return 'bg-red-100 text-red-800';
    case 'roteirizado':
      return 'bg-purple-100 text-purple-800';
    case 'os_criada':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
