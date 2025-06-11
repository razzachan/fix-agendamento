import React from 'react';
import { Badge } from '@/components/ui/badge';
import { translateStatus } from '@/utils/statusMapping';

interface ClientStatusBadgeProps {
  status: string;
  className?: string;
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'at_workshop':
      case 'received_at_workshop':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'diagnosis_completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'quote_sent':
      case 'awaiting_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'quote_approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ready_for_delivery':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'collected_for_delivery':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'on_the_way_to_deliver':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'payment_pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusPriority = (status: string) => {
    // Retorna um número para indicar a urgência (maior = mais urgente)
    switch (status) {
      case 'quote_sent':
      case 'awaiting_approval':
        return 3; // Requer ação do cliente
      case 'payment_pending':
        return 2; // Requer pagamento
      case 'ready_for_delivery':
        return 1; // Pronto para retirada
      default:
        return 0; // Status normal
    }
  };

  const priority = getStatusPriority(status);
  const isUrgent = priority > 0;

  return (
    <div className="flex items-center space-x-2">
      <Badge 
        className={`${getStatusColor(status)} ${className}`}
        variant="outline"
      >
        {translateStatus(status)}
      </Badge>
      
      {isUrgent && (
        <div className="flex items-center">
          {priority === 3 && (
            <span className="text-xs text-orange-600 font-medium">
              ⚠️ Ação necessária
            </span>
          )}
          {priority === 2 && (
            <span className="text-xs text-amber-600 font-medium">
              💳 Pagamento pendente
            </span>
          )}
          {priority === 1 && (
            <span className="text-xs text-green-600 font-medium">
              ✅ Pronto para retirada
            </span>
          )}
        </div>
      )}
    </div>
  );
}
