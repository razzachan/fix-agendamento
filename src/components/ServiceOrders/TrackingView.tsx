import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package } from 'lucide-react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { getLocationIcon, getLocationLabel } from './LocationInfo';
import { getStatusColor, getStatusIcon, getStatusLabel } from './StatusBadge';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface TrackingViewProps {
  order?: ServiceOrder;
  serviceOrder?: ServiceOrder; // Add this for backward compatibility
  onBack?: () => void;
  onUpdateStatus?: (id: string, status: ServiceOrderStatus) => Promise<void>;
  groupedOrders?: Record<string, ServiceOrder[]>;
  formatDate?: (dateString: string) => string;
}

const TrackingView: React.FC<TrackingViewProps> = ({ 
  order, 
  serviceOrder, // Support both prop names
  onBack, 
  onUpdateStatus,
  groupedOrders, 
  formatDate 
}) => {
  // Use either order or serviceOrder prop, preferring order if both are provided
  const activeOrder = order || serviceOrder;
  
  if (activeOrder) {
    const location = activeOrder.currentLocation || 'unknown';
    const singleOrderGrouped = {
      [location]: [activeOrder]
    };
    
    return renderContent(singleOrderGrouped, formatDateFallback);
  }
  
  if (groupedOrders) {
    return renderContent(groupedOrders, formatDate || formatDateFallback);
  }
  
  return (
    <div className="p-8 text-center">
      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
      <p className="text-lg text-muted-foreground">Sem dados de rastreamento disponíveis.</p>
    </div>
  );
  
  function formatDateFallback(dateString: string) {
    if (formatDate) return formatDate(dateString);
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
  
  function renderContent(groups: Record<string, ServiceOrder[]>, dateFormatter: (dateString: string) => string) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(groups).map(([location, orders]) => (
          <Card key={location} className="overflow-hidden max-h-[600px] hover-card">
            <CardHeader className="bg-muted pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getLocationIcon(location)}
                  <CardTitle className="text-base flex items-center">
                    {getLocationLabel(location)}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {orders.length}
                    </Badge>
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[500px]">
              <div className="space-y-0">
                {orders.length > 0 ? (
                  orders.map(order => (
                    <div
                      key={order.id}
                      className="p-4 border-b hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <DisplayNumber item={order} variant="inline" size="sm" showIcon={true} />
                        <Badge
                          variant="outline"
                          className={`status-badge ${getStatusColor(order.status)}`}
                        >
                          <div className="flex items-center">
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusLabel(order.status)}</span>
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">{order.equipmentType}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {order.description}
                      </p>
                      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <span className="font-medium">{order.clientName}</span>
                        <span>{dateFormatter(order.createdAt)}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2 justify-between text-xs">
                        <span>Ver detalhes</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum equipamento nesta etapa.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
};

export default TrackingView;
