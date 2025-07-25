import React, { useState } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Navigation,
  Phone,
  Clock,
  MapPin,
  Package,
  ArrowRight,
  Route,
  Calendar,
  MessageCircle
} from 'lucide-react';

interface QuickActionsBarProps {
  selectedOrder: ServiceOrder | null;
  technicianOrders: ServiceOrder[];
  onNavigateToAddress: (address: string) => void;
  onCallClient: (phone: string) => void;
  onViewRoute: () => void;
}

// Função para gerar link do WhatsApp
const generateWhatsAppLink = (phone: string, orderInfo?: { clientName: string; equipmentType: string; orderNumber?: string }) => {
  const cleanPhone = phone.replace(/\D/g, '');

  let message = 'Olá! Sou técnico da Fix Fogões.';

  if (orderInfo) {
    message += ` Estou entrando em contato sobre o serviço agendado para ${orderInfo.equipmentType}`;
    if (orderInfo.orderNumber) {
      message += ` (OS #${orderInfo.orderNumber})`;
    }
    message += '.';
  } else {
    message += ' Estou entrando em contato sobre seu serviço agendado.';
  }

  return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  selectedOrder,
  technicianOrders,
  onNavigateToAddress,
  onCallClient,
  onViewRoute
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!selectedOrder) {
    return null;
  }

  // Encontrar outras OS do mesmo endereço
  const sameAddressOrders = technicianOrders.filter(order => 
    order.id !== selectedOrder.id &&
    order.status !== 'completed' &&
    order.status !== 'cancelled' &&
    (
      (order.clientFullAddress && selectedOrder.clientFullAddress && 
       order.clientFullAddress === selectedOrder.clientFullAddress) ||
      (order.pickupAddress && selectedOrder.pickupAddress && 
       order.pickupAddress === selectedOrder.pickupAddress) ||
      order.clientName === selectedOrder.clientName
    )
  );

  // Próxima OS agendada
  const nextScheduledOrder = technicianOrders
    .filter(order => 
      order.id !== selectedOrder.id &&
      order.status !== 'completed' &&
      order.status !== 'cancelled' &&
      order.scheduledDate
    )
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

  const address = selectedOrder.clientFullAddress || selectedOrder.pickupAddress || '';
  const phone = selectedOrder.clientPhone;

  return (
    <Card className="lg:hidden bg-white border-t-4 border-t-[#e5b034] sticky bottom-0 z-10 shadow-lg">
      <CardContent className="p-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#e5b034]" />
            <span className="font-medium text-sm">Ações Rápidas</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <ArrowRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {/* Ações principais sempre visíveis */}
        <div className="flex gap-2 mb-3">
          {address && (
            <Button
              size="sm"
              onClick={() => onNavigateToAddress(address)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Navigation className="h-3 w-3 mr-1" />
              Navegar
            </Button>
          )}

          {phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCallClient(phone)}
              className="flex-1"
            >
              <Phone className="h-3 w-3 mr-1" />
              Ligar
            </Button>
          )}

          {phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const whatsappLink = generateWhatsAppLink(phone, {
                  clientName: selectedOrder?.clientName || '',
                  equipmentType: selectedOrder?.equipmentType || '',
                  orderNumber: selectedOrder?.orderNumber
                });
                window.open(whatsappLink, '_blank');
              }}
              className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              WhatsApp
            </Button>
          )}
        </div>

        {/* Informações expandidas */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {/* Outras OS do mesmo endereço */}
            {sameAddressOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Mesmo Endereço ({sameAddressOrders.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {sameAddressOrders.slice(0, 2).map(order => (
                    <div key={order.id} className="flex items-center justify-between text-xs bg-green-50 p-2 rounded">
                      <span className="truncate">{order.equipmentType}</span>
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                  {sameAddressOrders.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{sameAddressOrders.length - 2} mais...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Próxima OS */}
            {nextScheduledOrder && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Próxima OS</span>
                </div>
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <div className="font-medium">{nextScheduledOrder.clientName}</div>
                  <div className="text-gray-600">{nextScheduledOrder.equipmentType}</div>
                  {nextScheduledOrder.scheduledDate && (
                    <div className="text-blue-600 mt-1">
                      {new Date(nextScheduledOrder.scheduledDate).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ações secundárias */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onViewRoute}
                className="flex-1"
              >
                <Route className="h-3 w-3 mr-1" />
                Ver Rota
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Abrir calendário ou agenda
                  console.log('Abrir agenda');
                }}
                className="flex-1"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Agenda
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActionsBar;
