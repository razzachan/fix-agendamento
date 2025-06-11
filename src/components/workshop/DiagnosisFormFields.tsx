
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'lucide-react';

// Update this interface to match the FormValues in DiagnosisForm.tsx
interface FormValues {
  diagnosis_details: string;
  recommended_service: string;
  estimated_cost: string;
  estimated_completion_date: string;
  parts_purchase_link: string;
}

interface DiagnosisFormFieldsProps {
  form: UseFormReturn<FormValues>;
}

export function DiagnosisFormFields({ form }: DiagnosisFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="diagnosis_details"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Detalhes do Diagnóstico</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Descreva o diagnóstico do equipamento" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="recommended_service"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Serviço Recomendado</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Descreva o serviço recomendado" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="estimated_cost"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custo Estimado (R$)</FormLabel>
            <FormControl>
              <Input {...field} type="number" step="0.01" placeholder="0.00" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="estimated_completion_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Data Estimada de Conclusão</FormLabel>
            <FormControl>
              <Input {...field} type="date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="parts_purchase_link"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Link para Compra de Peças (opcional)</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  {...field} 
                  placeholder="Cole o link para comprar a peça" 
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <Link className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
