
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduledService } from '@/types';
import { CalendarDays } from 'lucide-react';

interface CalendarCardProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  hasScheduledServices: (day: Date) => boolean;
  selectedTechnicianName?: string;
  isAdminView: boolean;
}

const CalendarCard: React.FC<CalendarCardProps> = ({
  date,
  setDate,
  hasScheduledServices,
  selectedTechnicianName,
  isAdminView
}) => {
  return (
    <Card className="col-span-1 shadow-md border-0 overflow-hidden bg-white dark:bg-gray-800">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Calendário</CardTitle>
        </div>

        {isAdminView && selectedTechnicianName && selectedTechnicianName !== 'all' && (
          <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800">
            {selectedTechnicianName}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border w-full pointer-events-auto"
          modifiers={{
            booked: (day) => hasScheduledServices(day),
          }}
          modifiersClassNames={{
            booked: "bg-indigo-100 text-indigo-900 font-bold ring-2 ring-indigo-400 ring-offset-1",
          }}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          locale={ptBR}
        />
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-indigo-400 mr-2"></div>
            <span className="text-gray-600">Agendamentos</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-gray-200 mr-2"></div>
            <span className="text-gray-600">Sem agendamentos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarCard;
