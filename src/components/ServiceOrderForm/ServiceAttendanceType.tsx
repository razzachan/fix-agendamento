
import React, { useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Home, Package } from "lucide-react";
import { UseFormReturn } from 'react-hook-form';
import { FormValues } from './types';
import CompositePackageIcon from './CompositePackageIcon';

interface ServiceAttendanceTypeProps {
  form: UseFormReturn<FormValues>;
  index: number;
}

const ServiceAttendanceType: React.FC<ServiceAttendanceTypeProps> = ({ form, index }) => {
  const fieldName = `serviceItems.${index}.serviceAttendanceType` as const;
  
  // Get current value from form
  const currentValue = form.watch(fieldName);
  
  // Log the current value for debugging
  useEffect(() => {
    console.log(`ServiceAttendanceType current value for item ${index}: ${currentValue}`);
  }, [currentValue, index]);
  
  const handleSelect = (value: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico') => {
    console.log(`Setting service attendance type to: "${value}" for item ${index}`);
    
    // Use setValue with all options to ensure the form state is updated
    form.setValue(fieldName, value, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true 
    });
    
    // Double-check that the value was set correctly
    setTimeout(() => {
      const newValue = form.getValues(fieldName);
      console.log(`After setValue for item ${index}, new value is: "${newValue}"`);
      
      // Double-verify the full form state
      const fullServiceItem = form.getValues(`serviceItems.${index}`);
      console.log(`Complete service item ${index} after update:`, fullServiceItem);
    }, 100);
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Tipo de Atendimento</FormLabel>
          <FormControl>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect('em_domicilio');
                }}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-all duration-300
                  ${field.value === 'em_domicilio' 
                    ? 'border-primary bg-primary/10 shadow-md scale-[1.02]' 
                    : 'border-input hover:bg-accent hover:text-accent-foreground'}`}
              >
                <Home className="mb-3 h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Em domicílio</p>
                  <p className="text-sm text-muted-foreground">
                    Serviço feito na residência do cliente
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect('coleta_conserto');
                }}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-all duration-300
                  ${field.value === 'coleta_conserto' 
                    ? 'border-primary bg-primary/10 shadow-md scale-[1.02]' 
                    : 'border-input hover:bg-accent hover:text-accent-foreground'}`}
              >
                <Package className="mb-3 h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Coleta Conserto</p>
                  <p className="text-sm text-muted-foreground">
                    Coleta de equipamento com orçamento final fechado
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect('coleta_diagnostico');
                }}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-all duration-300
                  ${field.value === 'coleta_diagnostico' 
                    ? 'border-primary bg-primary/10 shadow-md scale-[1.02]' 
                    : 'border-input hover:bg-accent hover:text-accent-foreground'}`}
              >
                <CompositePackageIcon className="mb-3 h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Coleta Diagnóstico</p>
                  <p className="text-sm text-muted-foreground">
                    Coleta com sinal de R$350,00 e orçamento posterior
                  </p>
                </div>
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ServiceAttendanceType;
