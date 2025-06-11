import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Calendar } from 'lucide-react';
import { hasOrderValue } from '@/utils/orderValue';
import OrderValue from './OrderValue';

interface SimpleMobileViewProps {
  orders: ServiceOrder[];
  isLoading: boolean;
  onOrderClick?: (order: ServiceOrder) => void;
}

const SimpleMobileView: React.FC<SimpleMobileViewProps> = ({
  orders,
  isLoading,
  onOrderClick
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'assigned': 'Atribuído',
      'scheduled': 'Agendado',
      'in_progress': 'Em Andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'scheduled': 'bg-purple-100 text-purple-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order, index) => (
        <Card 
          key={order.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOrderClick?.(order)}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{order.clientName}</h3>
                <p className="text-xs text-muted-foreground">{order.equipmentType}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                #{index + 1}
              </div>
            </div>

            {/* Status */}
            <div className="mb-3">
              <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>

            {/* Valor da Ordem */}
            {hasOrderValue(order) && (
              <div className="mb-3">
                <OrderValue order={order} size="sm" />
              </div>
            )}

            {/* Info */}
            <div className="space-y-1">
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(order.createdAt)}
              </div>
              
              {order.clientPhone && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 mr-1" />
                  {order.clientPhone}
                </div>
              )}
              
              {order.clientEmail && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 mr-1" />
                  {order.clientEmail}
                </div>
              )}
            </div>

            {/* Description */}
            {order.description && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {order.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SimpleMobileView;
