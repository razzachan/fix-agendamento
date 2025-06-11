
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventsList from './EventsList';
import { ScheduledService } from '@/types';
import { Technician, User } from '@/types';
import { CalendarDays, ListChecks } from 'lucide-react';

interface EventsCardProps {
  date: Date | undefined;
  isLoading: boolean;
  filteredServices: ScheduledService[];
  getStatusBadge: (status: string) => { label: string; className: string };
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  selectedTechnicianId: string;
  technicians: Technician[];
  user: User | null;
}

const EventsCard: React.FC<EventsCardProps> = ({
  date,
  isLoading,
  filteredServices,
  getStatusBadge,
  formatTime,
  getStatusColor,
  selectedTechnicianId,
  technicians,
  user
}) => {
  return (
    <Card className="col-span-1 md:col-span-2 shadow-md border-0 overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">
            {date 
              ? format(date, "'Serviços para' d 'de' MMMM", { locale: ptBR }) 
              : "Selecione uma data"}
          </CardTitle>
        </div>
        
        {user?.role === 'admin' && selectedTechnicianId !== 'all' && (
          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">
            {technicians.find(t => t.id === selectedTechnicianId)?.name || 'Técnico selecionado'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <EventsList
          isLoading={isLoading}
          date={date}
          filteredServices={filteredServices}
          getStatusBadge={getStatusBadge}
          formatTime={formatTime}
          getStatusColor={getStatusColor}
          selectedTechnicianId={selectedTechnicianId}
          user={user}
        />
      </CardContent>
    </Card>
  );
};

export default EventsCard;
