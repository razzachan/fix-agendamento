
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, CheckCircle, XCircle, Calendar as CalendarClock } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useScheduling } from './SchedulingContext';

const CalendarSelector = () => {
  const { control } = useFormContext();
  const { monthSchedule, selectedTechnicianId } = useScheduling();

  // Calculate appointment density for calendar day
  const getDayScheduleInfo = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const appointmentCount = monthSchedule[dateKey] || 0;
    
    if (appointmentCount === 0) return { className: 'text-green-600 font-normal', icon: CheckCircle };
    if (appointmentCount >= 9) return { className: 'text-red-600 font-bold', icon: XCircle };
    return { className: 'text-yellow-600 font-medium', icon: CalendarClock };
  };

  // Return content for tooltip
  const getDayTooltipContent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const appointmentCount = monthSchedule[dateKey] || 0;
    
    if (appointmentCount === 0) return "Totalmente disponível";
    if (appointmentCount >= 9) return "Dia lotado";
    const availableCount = 9 - appointmentCount;
    return `${availableCount} horários disponíveis`;
  };

  return (
    <FormField
      control={control}
      name="scheduledDate"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Data</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal flex justify-between items-center",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                  <CalendarIcon className="h-4 w-4 opacity-70" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={(date) => {
                  // Convert the date to ISO string to ensure we're dealing with strings in the form data
                  field.onChange(date ? date.toISOString() : null);
                }}
                disabled={(date) => {
                  // Disable past dates
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                modifiers={{
                  available: (date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    return !monthSchedule[dateKey]; // No appointments that day
                  },
                  partial: (date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const count = monthSchedule[dateKey] || 0;
                    return count > 0 && count < 9;
                  },
                  booked: (date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const count = monthSchedule[dateKey] || 0;
                    return count >= 9;
                  }
                }}
                modifiersClassNames={{
                  available: "bg-green-100 text-green-800 font-medium",
                  partial: "bg-yellow-100 text-yellow-800 font-medium",
                  booked: "bg-red-100 text-red-800 font-medium",
                }}
                locale={ptBR}
                className="pointer-events-auto"
                components={{
                  DayContent: ({ date }) => {
                    const { className, icon: Icon } = getDayScheduleInfo(date);
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center items-center h-full">
                              <span>{date.getDate()}</span>
                              {selectedTechnicianId && 
                                <Icon className={`h-3 w-3 ml-1 ${className}`} />
                              }
                            </div>
                          </TooltipTrigger>
                          {selectedTechnicianId && (
                            <TooltipContent side="right">
                              {getDayTooltipContent(date)}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CalendarSelector;
