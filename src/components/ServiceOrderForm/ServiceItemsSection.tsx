
import React from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { FormValues } from './types';
import ServiceItemCard from './ServiceItemCard';
import { generateUUID } from '@/utils/uuid';

interface ServiceItemsSectionProps {
  form: UseFormReturn<FormValues>;
}

const ServiceItemsSection: React.FC<ServiceItemsSectionProps> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "serviceItems"
  });

  const handleAddItem = () => {
    append({
      id: generateUUID(),
      serviceType: '',
      serviceAttendanceType: 'em_domicilio',
      equipmentType: '',
      equipmentModel: '',
      equipmentSerial: '',
      serviceValue: '',
      clientDescription: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens de Serviço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <ServiceItemCard 
            key={field.id} 
            form={form} 
            index={index} 
            onRemove={() => remove(index)}
            isRemovable={fields.length > 1}
          />
        ))}
      </CardContent>
      <CardFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAddItem}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item de Serviço
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceItemsSection;
