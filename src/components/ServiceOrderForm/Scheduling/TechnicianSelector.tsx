
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { User } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduling } from './SchedulingContext';

const TechnicianSelector = () => {
  const { control } = useFormContext();
  const { technicians, isLoading } = useScheduling();

  return (
    <FormField
      control={control}
      name="technicianId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Técnico Responsável</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={isLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {tech.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TechnicianSelector;
