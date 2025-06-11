
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from "@/components/ui/card";
import { FormValues } from './types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import ServiceTypeSelect from './ServiceTypeSelect';
import ServiceAttendanceType from './ServiceAttendanceType';
import EquipmentFields from './EquipmentFields';
import ProblemDescription from './ProblemDescription';
import ServiceValueInput from './ServiceValueInput';

interface ServiceItemCardProps {
  form: UseFormReturn<FormValues>;
  index: number;
  onRemove: () => void;
  isRemovable: boolean;
}

const ServiceItemCard: React.FC<ServiceItemCardProps> = ({
  form,
  index,
  onRemove,
  isRemovable
}) => {
  // Monitor the serviceAttendanceType for this item
  const serviceAttendanceType = form.watch(`serviceItems.${index}.serviceAttendanceType`);
  
  // Add enhanced logging
  React.useEffect(() => {
    console.log(`ServiceItemCard ${index} - attendance type selected: "${serviceAttendanceType}"`);
    
    // Log the entire form state for this item
    const itemData = form.getValues(`serviceItems.${index}`);
    console.log(`ServiceItem ${index} complete data:`, itemData);
    
    // Log the full form state to see all values
    if (index === 0) {
      const formValues = form.getValues();
      console.log(`Service Item has type "${serviceAttendanceType}" - Form full state:`, {
        serviceItems: formValues.serviceItems.map(item => ({
          id: item.id.substring(0, 8),
          type: item.serviceAttendanceType
        }))
      });
    }
  }, [serviceAttendanceType, index, form]);

  return (
    <Card className="relative">
      <CardContent className="p-5 space-y-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Item {index + 1}</h3>
          
          {isRemovable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <ServiceAttendanceType form={form} index={index} />
        
        <ServiceTypeSelect form={form} index={index} />
        
        <EquipmentFields form={form} index={index} />
        
        <ProblemDescription form={form} index={index} />
        
        <ServiceValueInput form={form} index={index} />
      </CardContent>
    </Card>
  );
};

export default ServiceItemCard;
