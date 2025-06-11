
import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Clock, XCircle, CalendarIcon } from "lucide-react";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useScheduling } from './SchedulingContext';
import { timeSlots } from './SchedulingContext';

const TimeSlotPicker = () => {
  const { control, setValue } = useFormContext();
  const { 
    selectedDate, 
    availableTimeSlots, 
    isLoading 
  } = useScheduling();

  // Effect to highlight (but not automatically select) the next available time slot
  useEffect(() => {
    if (selectedDate && availableTimeSlots.length > 0) {
      // Find current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if selected date is today
      const isToday = new Date(selectedDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
      
      // If today, find the next available slot after current time
      if (isToday) {
        const nextAvailableSlot = availableTimeSlots.find(slot => {
          const [hour, minute] = slot.split(':').map(Number);
          return (hour > currentHour) || (hour === currentHour && minute > currentMinute);
        });
        
        // If found a slot later today, make it the recommended one
        if (nextAvailableSlot) {
          // We don't automatically select it, just show it as recommended
          console.log(`Next available slot today: ${nextAvailableSlot}`);
          return;
        }
      }
      
      // If not today or no slots available later today, recommend first available slot
      console.log(`First available slot: ${availableTimeSlots[0]}`);
    }
  }, [selectedDate, availableTimeSlots]);

  return (
    <FormField
      control={control}
      name="scheduledTime"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Horário</FormLabel>
          
          {selectedDate && availableTimeSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => {
                const isAvailable = availableTimeSlots.includes(time);
                
                // Find if this is the next recommended slot
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const [slotHour, slotMinute] = time.split(':').map(Number);
                
                const isToday = new Date(selectedDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                
                // This is the next available slot if:
                // 1. It's available
                // 2. It's either the first available slot of a future date OR
                //    it's today and the next slot after the current time
                const isNextAvailable = isAvailable && 
                  ((isToday && 
                    ((slotHour > currentHour) || 
                     (slotHour === currentHour && slotMinute > currentMinute)) &&
                    !availableTimeSlots.some(s => {
                      const [h, m] = s.split(':').map(Number);
                      return (h < slotHour || (h === slotHour && m < slotMinute)) && 
                             ((h > currentHour) || (h === currentHour && m > currentMinute));
                    })
                   ) || 
                   (!isToday && time === availableTimeSlots[0]));
                
                return (
                  <Button
                    key={time}
                    type="button"
                    variant={field.value === time ? "default" : "outline"}
                    className={cn(
                      "flex items-center justify-center h-10",
                      !isAvailable && "bg-red-50 text-red-500 border-red-200 line-through opacity-70",
                      isAvailable && field.value !== time && "bg-green-50 border-green-200",
                      isNextAvailable && field.value !== time && "bg-green-100 border-green-300 ring-2 ring-green-300 ring-opacity-50",
                      field.value === time && "bg-primary text-primary-foreground"
                    )}
                    disabled={!isAvailable}
                    onClick={() => field.onChange(time)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {time}
                    {!isAvailable && <XCircle className="ml-1 h-3 w-3" />}
                    {isNextAvailable && <span className="ml-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>}
                  </Button>
                );
              })}
            </div>
          ) : selectedDate ? (
            <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-md">
              <XCircle className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Não há horários disponíveis para esta data. Selecione outra data.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-md">
              <CalendarIcon className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Selecione uma data para ver os horários disponíveis
              </p>
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TimeSlotPicker;
