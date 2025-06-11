
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface RecentServiceOrdersProps {
  serviceOrders: ServiceOrder[];
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

const RecentServiceOrders: React.FC<RecentServiceOrdersProps> = ({ 
  serviceOrders, 
  formatDate, 
  getStatusColor, 
  getStatusLabel 
}) => {
  // Sort orders by creation date (oldest first to get ascending order numbers)
  const sortedOrders = [...serviceOrders].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Take only the first 5 orders
  const displayOrders = sortedOrders.slice(0, 5);
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Ordens de Serviço Recentes</CardTitle>
        <CardDescription>
          Acompanhe as últimas ordens de serviço abertas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayOrders.map((order, index) => (
            <div
              key={order.id}
              className="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    <DisplayNumber item={order} index={index} variant="inline" size="sm" showIcon={false} />
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {order.clientName} - {order.equipmentType}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm">{formatDate(order.createdAt)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentServiceOrders;
