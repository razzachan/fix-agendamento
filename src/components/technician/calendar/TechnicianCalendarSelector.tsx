
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TechnicianCalendarSelectorProps {
  date: Date;
  setDate: (date: Date) => void;
  hasScheduledServices: (day: Date) => boolean;
}

const TechnicianCalendarSelector: React.FC<TechnicianCalendarSelectorProps> = ({
  date,
  setDate,
  hasScheduledServices,
}) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Selecione uma Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => newDate && setDate(newDate)}
          className="rounded-md border w-full pointer-events-auto"
          modifiers={{
            booked: (day) => hasScheduledServices(day),
          }}
          modifiersClassNames={{
            booked: "bg-primary-foreground text-primary ring-2 ring-primary ring-offset-1",
          }}
          locale={ptBR}
        />
      </CardContent>
    </Card>
  );
};

export default TechnicianCalendarSelector;
