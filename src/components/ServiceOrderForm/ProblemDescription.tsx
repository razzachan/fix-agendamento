
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FormValues } from './types';

interface ProblemDescriptionProps {
  form: UseFormReturn<FormValues>;
  index: number;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ form, index }) => {
  return (
    <FormField
      control={form.control}
      name={`serviceItems.${index}.clientDescription`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Descrição do Problema</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Descreva o problema com este equipamento..."
              className="min-h-32"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProblemDescription;
