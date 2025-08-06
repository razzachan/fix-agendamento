
import React from 'react';
import { MapPin, Calendar, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { formatDate } from '../utils';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';
import { calculateFinancialSummary, validateFinancialConsistency, formatCurrency } from '@/utils/financialCalculations';

interface OrderServiceInfoProps {
  order: ServiceOrder;
}

const OrderServiceInfo: React.FC<OrderServiceInfoProps> = ({ order }) => {
  const financial = calculateFinancialSummary(order);
  const validation = validateFinancialConsistency(order);

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

      {/* Resumo Financeiro */}
      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Resumo Financeiro</h3>

        {/* Valor Total */}
        {financial.totalAmount > 0 && (
          <div className="flex items-center mb-2">
            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
            <div>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(financial.totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {financial.statusDescription}
              </p>
            </div>
          </div>
        )}

        {/* Detalhes de Pagamento */}
        {(financial.advancePayment > 0 || financial.pendingAmount > 0) && (
          <div className="space-y-1 text-sm">
            {financial.advancePayment > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sinal pago:</span>
                <span className="font-medium">{formatCurrency(financial.advancePayment)}</span>
              </div>
            )}
            {financial.pendingAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor pendente:</span>
                <span className="font-medium text-orange-600">{formatCurrency(financial.pendingAmount)}</span>
              </div>
            )}
            {financial.diagnosticEstimate > 0 && financial.diagnosticEstimate !== financial.totalAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimativa técnica:</span>
                <span className="font-medium text-blue-600">{formatCurrency(financial.diagnosticEstimate)}</span>
              </div>
            )}
          </div>
        )}

        {/* Avisos de Validação */}
        {(!validation.isValid || validation.warnings.length > 0) && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                {validation.errors.map((error, index) => (
                  <p key={index} className="text-red-600 font-medium">{error}</p>
                ))}
                {validation.warnings.map((warning, index) => (
                  <p key={index} className="text-yellow-700">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fallback quando não há valores */}
        {financial.totalAmount === 0 && financial.advancePayment === 0 && financial.diagnosticEstimate === 0 && (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-muted-foreground">Valor a definir</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderServiceInfo;
