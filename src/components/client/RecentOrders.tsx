import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Clock, 
  MapPin, 
  Calendar,
  ArrowRight,
  Wrench,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ClientOrder } from '@/hooks/client/useClientOrders';
import { ClientStatusBadge } from './ClientStatusBadge';

interface RecentOrdersProps {
  orders: ClientOrder[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  // Mostrar apenas as 5 ordens mais recentes
  const recentOrders = orders.slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'at_workshop':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'quote_sent':
      case 'awaiting_approval':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Seus Equipamentos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum equipamento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Você ainda não possui equipamentos em nosso sistema.
            </p>
            <Button 
              onClick={() => {
                const message = encodeURIComponent(
                  'Olá! Gostaria de solicitar um serviço para meu equipamento.'
                );
                window.open(`https://api.whatsapp.com/send?phone=5548988332664&text=${message}`, '_blank');
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Solicitar Primeiro Serviço
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Seus Equipamentos</span>
            <Badge variant="secondary" className="ml-2">
              {orders.length} {orders.length === 1 ? 'equipamento' : 'equipamentos'}
            </Badge>
          </CardTitle>
          {orders.length > 5 && (
            <Button variant="outline" size="sm">
              Ver Todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      OS #{order.orderNumber}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {order.equipmentType} {order.equipmentBrand && `- ${order.equipmentBrand}`}
                    </p>
                    {order.equipmentModel && (
                      <p className="text-xs text-gray-500">
                        Modelo: {order.equipmentModel}
                      </p>
                    )}
                  </div>
                </div>
                <ClientStatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Criado: {formatDate(order.createdAt)}</span>
                </div>
                
                {order.scheduledDate && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Agendado: {formatDate(order.scheduledDate)}</span>
                  </div>
                )}

                {order.currentLocation && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{order.locationLabel || order.currentLocation}</span>
                  </div>
                )}
              </div>

              {order.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Problema:</strong> {order.description}
                  </p>
                </div>
              )}

              {order.technician && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <strong>Técnico:</strong> {order.technician.name}
                  </div>
                  {order.technician.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${order.technician?.phone}`, '_self')}
                    >
                      Ligar
                    </Button>
                  )}
                </div>
              )}

              {order.estimatedCompletion && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Previsão de conclusão:</strong> {order.estimatedCompletion}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {orders.length > 5 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full">
              Ver Todos os Equipamentos ({orders.length})
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
