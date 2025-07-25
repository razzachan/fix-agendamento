
import React from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { formatDate } from '../utils';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';

interface OrderServiceInfoProps {
  order: ServiceOrder;
}

const OrderServiceInfo: React.FC<OrderServiceInfoProps> = ({ order }) => {
  return (
    <div className="space-y-4">
      {order.needsPickup && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Endereço para Coleta</h3>
          <AddressDisplay
            data={extractAddressFromServiceOrder(order)}
            variant="detailed"
            className="mb-2"
          />
          {order.pickupAddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${order.pickupAddress}, ${order.pickupCity}, ${order.pickupState}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Ver no Google Maps
            </a>
          )}
        </div>
      )}

      {order.scheduledDate && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Data Agendada</h3>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <p>{formatDate(order.scheduledDate)}</p>
            {order.scheduledTime && (
              <span className="ml-2">{order.scheduledTime}</span>
            )}
          </div>
        </div>
      )}

      {order.completedDate && (
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">Data de Conclusão</h3>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <p>{formatDate(order.completedDate)}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Status do Serviço</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            order.status === 'completed' ? 'bg-green-500' :
            order.status === 'cancelled' ? 'bg-red-500' :
            'bg-blue-500'
          }`}></div>
          <p className="capitalize">
            {order.status === 'pending' && 'Em Aberto'}
            {order.status === 'scheduled' && 'Agendado'}
            {order.status === 'scheduled_collection' && 'Coleta Agendada'}
            {order.status === 'in_progress' && 'Em Andamento'}
            {order.status === 'on_the_way' && 'A Caminho'}
            {order.status === 'collected' && 'Coletado'}
            {order.status === 'collected_for_diagnosis' && 'Coletado para Diagnóstico'}
            {order.status === 'at_workshop' && 'Na Oficina'}
            {order.status === 'diagnosis_completed' && 'Diagnóstico Concluído'}
            {order.status === 'quote_sent' && 'Orçamento Enviado'}
            {order.status === 'quote_approved' && 'Orçamento Aprovado'}
            {order.status === 'quote_rejected' && 'Orçamento Recusado'}
            {order.status === 'ready_for_return' && 'Pronto para Devolução'}
            {order.status === 'needs_workshop' && 'Necessita Oficina'}
            {order.status === 'ready_for_delivery' && 'Pronto para Entrega'}
            {order.status === 'collected_for_delivery' && 'Coletado para Entrega'}
            {order.status === 'on_the_way_to_deliver' && 'A Caminho para Entrega'}
            {order.status === 'payment_pending' && 'Pagamento Pendente'}
            {order.status === 'completed' && 'Concluído'}
            {order.status === 'cancelled' && 'Cancelado'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderServiceInfo;
