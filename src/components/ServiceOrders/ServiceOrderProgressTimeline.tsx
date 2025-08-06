import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  Wrench, 
  Package, 
  FileText,
  User,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { ServiceOrderProgressEntry } from '@/types/serviceOrderProgress';
import { ServiceOrderStatus } from '@/types';

interface ServiceOrderProgressTimelineProps {
  entries: ServiceOrderProgressEntry[];
  loading?: boolean;
}

/**
 * Componente que exibe uma timeline com o histórico de progresso de uma ordem de serviço
 */
const ServiceOrderProgressTimeline: React.FC<ServiceOrderProgressTimelineProps> = ({ 
  entries,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>Nenhum histórico de progresso disponível.</p>
      </div>
    );
  }

  // Função para obter o ícone com base no status
  const getStatusIcon = (status: ServiceOrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'scheduled':
      case 'scheduled_collection':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'on_the_way':
      case 'on_the_way_to_deliver':
      case 'collected_for_delivery':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'in_progress':
        return <Wrench className="h-5 w-5 text-indigo-500" />;
      case 'collected':
      case 'collected_for_diagnosis':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'at_workshop':
      case 'diagnosis_completed':
        return <Wrench className="h-5 w-5 text-purple-600" />;
      case 'ready_for_delivery':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'delivery_scheduled':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'payment_pending':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Função para obter o título do status
  const getStatusTitle = (status: ServiceOrderStatus) => {
    const statusTitles: Record<ServiceOrderStatus, string> = {
      'pending': 'Pendente',
      'scheduled': 'Agendado',
      'scheduled_collection': 'Coleta Agendada',
      'on_the_way': 'A Caminho',
      'in_progress': 'Em Andamento',
      'collected': 'Coletado',
      'collected_for_diagnosis': 'Coletado para Diagnóstico',
      'at_workshop': 'Na Oficina',
      'diagnosis_completed': 'Diagnóstico Concluído',
      'quote_sent': 'Orçamento Enviado',
      'quote_approved': 'Orçamento Aprovado',
      'quote_rejected': 'Orçamento Rejeitado',
      'ready_for_return': 'Pronto para Devolução',
      'needs_workshop': 'Necessita Oficina',
      'ready_for_delivery': 'Pronto para Entrega',
      'delivery_scheduled': 'Entrega Agendada',
      'collected_for_delivery': 'Coletado para Entrega',
      'on_the_way_to_deliver': 'A Caminho para Entrega',
      'payment_pending': 'Pagamento Pendente',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };

    return statusTitles[status] || status;
  };

  return (
    <div className="space-y-4 py-2">
      <h3 className="text-lg font-medium">Histórico de Progresso</h3>
      
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className="relative pl-8 pb-4">
            {/* Linha vertical conectando os itens */}
            {index < entries.length - 1 && (
              <div className="absolute left-[10px] top-[24px] bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            )}
            
            {/* Ícone do status */}
            <div className="absolute left-0 top-0 bg-white dark:bg-gray-900 p-0.5 rounded-full">
              {getStatusIcon(entry.status)}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              {/* Cabeçalho com status e data */}
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium">{getStatusTitle(entry.status)}</h4>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.timestamp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {/* Usuário que fez a alteração */}
              {entry.userName && (
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5 mr-1" />
                  <span>{entry.userName}</span>
                </div>
              )}
              
              {/* Notas */}
              {entry.notes && (
                <p className="text-sm mt-1">{entry.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceOrderProgressTimeline;
