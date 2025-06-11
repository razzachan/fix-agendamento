
import React, { useEffect, useState } from 'react';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';
import { FormValues } from './types';
import { Technician } from '@/types';
import { technicianService } from '@/services';

interface TechnicianFieldProps {
  form: UseFormReturn<FormValues>;
}

const TechnicianField: React.FC<TechnicianFieldProps> = ({ form }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTechnicians = async () => {
      setIsLoading(true);
      try {
        const techniciansList = await technicianService.getAll();
        setTechnicians(techniciansList);
      } catch (error) {
        console.error('Erro ao buscar técnicos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicians();
  }, []);
  
  return (
    <FormField
      control={form.control}
      name="technicianId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Técnico Responsável</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando técnicos..." : "Selecione um técnico (opcional)"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {technicians.length === 0 ? (
                <SelectItem value="no-technicians" disabled>
                  Nenhum técnico disponível
                </SelectItem>
              ) : (
                technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TechnicianField;
