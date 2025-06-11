
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormValues } from './types';

interface ServiceValueInputProps {
  form: UseFormReturn<FormValues>;
  index: number;
}

const ServiceValueInput: React.FC<ServiceValueInputProps> = ({ form, index }) => {
  // Função para formatar valor monetário
  const formatCurrency = (value: string): string => {
    // Remover caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Converter para centavos e formatar
    if (numericValue) {
      const cents = parseInt(numericValue, 10);
      const formatted = (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
      return formatted;
    }
    
    return '';
  };

  // Handler de mudança de valor
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/\D/g, '');
    
    // Armazenar valor numérico no formulário
    form.setValue(`serviceItems.${index}.serviceValue`, numericValue, { shouldValidate: true });
    
    // Atualizar visualmente com formatação
    e.target.value = numericValue ? formatCurrency(numericValue) : '';
  };

  return (
    <FormField
      control={form.control}
      name={`serviceItems.${index}.serviceValue`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Valor do Serviço</FormLabel>
          <FormControl>
            <Input
              placeholder="R$ 0,00"
              {...field}
              value={field.value ? formatCurrency(field.value) : ''}
              onChange={handleValueChange}
              onClick={(e) => {
                // Prevenir bugs ao clicar no input
                e.stopPropagation();
              }}
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ServiceValueInput;
