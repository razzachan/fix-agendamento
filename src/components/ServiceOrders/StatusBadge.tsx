
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Loader2, Check, X, Navigation, Package, Building, Truck, CreditCard, Stethoscope, ClipboardCheck, PackageCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-400';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-400';
    case 'scheduled_collection':
      return 'bg-blue-100 text-blue-800 border-blue-400';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800 border-purple-400';
    case 'on_the_way':
      return 'bg-blue-100 text-blue-800 border-blue-400';
    case 'collected':
      return 'bg-indigo-100 text-indigo-800 border-indigo-400';
    case 'collected_for_diagnosis':
      return 'bg-indigo-100 text-indigo-800 border-indigo-400';
    case 'at_workshop':
      return 'bg-amber-100 text-amber-800 border-amber-400';
    case 'received_at_workshop':
      return 'bg-orange-100 text-orange-800 border-orange-400';
    case 'diagnosis_completed':
      return 'bg-teal-100 text-teal-800 border-teal-400';
    case 'quote_sent':
      return 'bg-orange-100 text-orange-800 border-orange-400';
    case 'awaiting_quote_approval':
      return 'bg-amber-100 text-amber-800 border-amber-400';
    case 'quote_approved':
      return 'bg-green-100 text-green-800 border-green-400';
    case 'quote_rejected':
      return 'bg-red-100 text-red-800 border-red-400';
    case 'ready_for_return':
      return 'bg-amber-100 text-amber-800 border-amber-400';
    case 'needs_workshop':
      return 'bg-amber-100 text-amber-800 border-amber-400';
    case 'ready_for_delivery':
      return 'bg-emerald-100 text-emerald-800 border-emerald-400';
    case 'collected_for_delivery':
      return 'bg-indigo-100 text-indigo-800 border-indigo-400';
    case 'on_the_way_to_deliver':
      return 'bg-blue-100 text-blue-800 border-blue-400';
    case 'payment_pending':
      return 'bg-orange-100 text-orange-800 border-orange-400';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-400';
    case 'cancelled':
    case 'canceled':
      return 'bg-red-100 text-red-800 border-red-400';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-400';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'scheduled':
    case 'scheduled_collection':
      return <Calendar className="h-3 w-3" />;
    case 'in_progress':
      return <Loader2 className="h-3 w-3 animate-spin" />;
    case 'on_the_way':
      return <Navigation className="h-3 w-3" />;
    case 'collected':
    case 'collected_for_diagnosis':
      return <Package className="h-3 w-3" />;
    case 'at_workshop':
      return <Building className="h-3 w-3" />;
    case 'diagnosis_completed':
      return <Stethoscope className="h-3 w-3" />;
    case 'quote_sent':
      return <CreditCard className="h-3 w-3" />;
    case 'awaiting_quote_approval':
      return <Clock className="h-3 w-3" />;
    case 'quote_approved':
      return <Check className="h-3 w-3" />;
    case 'quote_rejected':
      return <X className="h-3 w-3" />;
    case 'ready_for_return':
      return <PackageCheck className="h-3 w-3" />;
    case 'needs_workshop':
      return <Building className="h-3 w-3" />;
    case 'ready_for_delivery':
      return <ClipboardCheck className="h-3 w-3" />;
    case 'delivery_scheduled':
      return <Calendar className="h-3 w-3" />;
    case 'collected_for_delivery':
      return <PackageCheck className="h-3 w-3" />;
    case 'on_the_way_to_deliver':
      return <Truck className="h-3 w-3" />;
    case 'payment_pending':
      return <CreditCard className="h-3 w-3" />;
    case 'completed':
      return <Check className="h-3 w-3" />;
    case 'cancelled':
    case 'canceled':
      return <X className="h-3 w-3" />;
    default:
      return null;
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Em Aberto';
    case 'scheduled':
      return 'Agendado';
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
    case 'quote_sent':
      return 'Orçamento Enviado';
    case 'awaiting_quote_approval':
      return 'Aguardando Aprovação do Orçamento';
    case 'quote_approved':
      return 'Orçamento Aprovado';
    case 'quote_rejected':
      return 'Orçamento Recusado';
    case 'ready_for_return':
      return 'Pronto para Devolução';
    case 'needs_workshop':
      return 'Necessita Oficina';
    case 'ready_for_delivery':
      return 'Pronto para Entrega';
    case 'delivery_scheduled':
      return 'Entrega Agendada';
    case 'collected_for_delivery':
      return 'Coletado para Entrega';
    case 'on_the_way_to_deliver':
      return 'À Caminho para Entrega';
    case 'payment_pending':
      return 'Pagamento Pendente';
    case 'completed':
      return 'Concluído';
    case 'cancelled':
    case 'canceled':
      return 'Cancelado';
    default:
      return status;
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-0.5 px-2',
    lg: 'text-base py-1 px-2.5',
  };

  return (
    <Badge
      variant="outline"
      className={`status-badge ${getStatusColor(status)} ${sizeClasses[size]}`}
    >
      <span className="status-pulse">
        <span className={`absolute inline-flex rounded-full h-full w-full ${getStatusColor(status)}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor(status)}`}></span>
      </span>
      {getStatusLabel(status)}
    </Badge>
  );
};

export default StatusBadge;
