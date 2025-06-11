import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface UserServiceOrdersProps {
  serviceOrders: ServiceOrder[];
  userRole: string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  showAllOrders?: boolean;
  setShowAllOrders?: (show: boolean) => void;
}

const UserServiceOrders: React.FC<UserServiceOrdersProps> = ({ 
  serviceOrders, 
  userRole, 
  formatDate, 
  getStatusColor, 
  getStatusLabel,
  showAllOrders = false,
  setShowAllOrders
}) => {
  const isTechnician = userRole === 'technician';
  
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>
          {isTechnician ? 'Minhas Ordens de Serviço' : 'Seus Eletrodomésticos'}
        </CardTitle>
        <CardDescription>
          {isTechnician
            ? 'Ordens de serviço atribuídas a você'
            : 'Acompanhe o status da manutenção dos seus eletrodomésticos'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serviceOrders.length > 0 ? (
          <div className="space-y-4">
            {serviceOrders.map((order, index) => (
              <Link 
                key={order.id}
                to={isTechnician ? `/my-orders` : `/orders/${order.id}`}
                className="block"
              >
                <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-md -mx-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <DisplayNumber item={order} index={serviceOrders.length - index - 1} variant="inline" size="sm" showIcon={true} />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {order.equipmentType}{' '}
                      {order.equipmentModel ? `- ${order.equipmentModel}` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {isTechnician ? `Cliente: ${order.clientName}` : ''}
                      {order.scheduledDate
                        ? ` - Agendado para: ${formatDate(order.scheduledDate)}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    {order.currentLocation && (
                      <span className="text-xs mt-1 text-muted-foreground">
                        Localização: {' '}
                        {order.currentLocation === 'client' ? 'Cliente' :
                         order.currentLocation === 'transit' ? 'Em trânsito' :
                         order.currentLocation === 'workshop' ? 'Oficina' : 'Entregue'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            Nenhuma ordem de serviço encontrada.
          </div>
        )}
        
        {setShowAllOrders && serviceOrders.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowAllOrders(!showAllOrders)}
            >
              {showAllOrders ? 'Mostrar menos ordens' : 'Ver todas as ordens'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserServiceOrders;
