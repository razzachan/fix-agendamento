
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScheduledService, ServiceOrder } from '@/types';
import ServiceEventItem from './ServiceEventItem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TechnicianEventsListProps {
  date: Date;
  isLoading: boolean;
  filteredServices: ScheduledService[];
  getServiceOrder: (serviceOrderId: string) => ServiceOrder | undefined;
  handleServiceClick: (serviceOrderId: string | undefined) => void;
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusBadge: (status: string) => { label: string; className: string };
}

const TechnicianEventsList: React.FC<TechnicianEventsListProps> = ({
  date,
  isLoading,
  filteredServices,
  getServiceOrder,
  handleServiceClick,
  formatTime,
  getStatusColor,
  getStatusBadge
}) => {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>{format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando agendamentos...</span>
          </div>
        ) : filteredServices.length > 0 ? (
          <div className="space-y-4">
            {filteredServices.map((service) => {
              const relatedOrder = getServiceOrder(service.serviceOrderId);
              
              return (
                <ServiceEventItem 
                  key={service.id}
                  service={service}
                  relatedOrder={relatedOrder}
                  formatTime={formatTime}
                  getStatusColor={getStatusColor}
                  getStatusBadge={getStatusBadge}
                  onClick={() => handleServiceClick(service.serviceOrderId)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-lg">Nenhum serviço agendado para esta data.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione outra data para verificar agendamentos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicianEventsList;
