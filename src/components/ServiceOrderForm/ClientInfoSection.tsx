import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormValues } from './types';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import AddressSearch from './AddressSearch';

interface ClientInfoSectionProps {
  form: UseFormReturn<FormValues>;
}

const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({ form }) => {
  
  // Normalize email input by trimming whitespace and converting to lowercase
  const normalizeEmail = (value: string) => {
    return value.trim().toLowerCase();
  };
  
  // Watch client fields to normalize on change
  const clientPhone = form.watch('clientPhone');
  const clientEmail = form.watch('clientEmail');
  

  
  useEffect(() => {
    if (clientEmail) {
      const normalized = normalizeEmail(clientEmail);
      if (normalized !== clientEmail) {
        form.setValue('clientEmail', normalized);
      }
    }
  }, [clientEmail, form]);

  return (
    <div className="p-2 bg-slate-100 rounded-md">
      <h3 className="text-md font-medium mb-4">Informações do Cliente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input
                  placeholder="(00) 00000-0000"
                  {...field}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                  }}
                  maxLength={15}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientCpfCnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF / CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <AddressSearch form={form} />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="clientAddressComplement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <FormControl>
                <Input placeholder="Apto, Bloco, Casa, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientAddressReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ponto de Referência</FormLabel>
              <FormControl>
                <Input placeholder="Próximo a..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ClientInfoSection;
