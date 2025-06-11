
import { useMemo } from 'react';

export const useDashboardUtils = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled_collection':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'on_the_way':
        return 'bg-blue-100 text-blue-800';
      case 'collected':
        return 'bg-indigo-100 text-indigo-800';
      case 'collected_for_diagnosis':
        return 'bg-indigo-100 text-indigo-800';
      case 'at_workshop':
        return 'bg-amber-100 text-amber-800';
      case 'received_at_workshop':
        return 'bg-amber-100 text-amber-800';
      case 'diagnosis_completed':
        return 'bg-teal-100 text-teal-800';
      case 'quote_approved':
        return 'bg-green-100 text-green-800';
      case 'ready_for_delivery':
        return 'bg-emerald-100 text-emerald-800';
      case 'collected_for_delivery':
        return 'bg-indigo-100 text-indigo-800';
      case 'on_the_way_to_deliver':
        return 'bg-blue-100 text-blue-800';
      case 'payment_pending':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Em Aberto';
      case 'scheduled':
        return 'Agendado';
      case 'confirmed':
        return 'Confirmado';
      case 'scheduled_collection':
        return 'Coleta Agendada';
      case 'in_progress':
        return 'Em Andamento';
      case 'on_the_way':
        return 'À Caminho';
      case 'collected':
        return 'Coletado';
      case 'collected_for_diagnosis':
        return 'Coletado para Diagnóstico';
      case 'at_workshop':
        return 'Na Oficina';
      case 'received_at_workshop':
        return 'Recebido na Oficina';
      case 'diagnosis_completed':
        return 'Diagnóstico Concluído';
      case 'quote_approved':
        return 'Orçamento Aprovado';
      case 'ready_for_delivery':
        return 'Pronto para Entrega';
      case 'collected_for_delivery':
        return 'Coletado para Entrega';
      case 'on_the_way_to_deliver':
        return 'À Caminho para Entrega';
      case 'payment_pending':
        return 'Pagamento Pendente';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'paid':
        return 'Pago';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return {
    getStatusColor,
    getStatusLabel,
    formatDate,
    formatCurrency,
  };
};
