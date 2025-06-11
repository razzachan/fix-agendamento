
import React from 'react';
import { MapPin } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { WorkshopFormValues } from '../schema/workshopFormSchema';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddressSearchField } from '@/components/address';


interface WorkshopAddressFieldsProps {
  form: UseFormReturn<WorkshopFormValues>;
}

const WorkshopAddressFields: React.FC<WorkshopAddressFieldsProps> = ({ form }) => {

  const handleAddressSelect = (fullAddress: string) => {
    // Extract address components
    const addressParts = fullAddress.split(',').map(part => part.trim());

    if (addressParts.length >= 3) {
      const address = addressParts[0];
      const city = addressParts[1];
      // The last part usually contains state and zip code
      const stateZipParts = addressParts[addressParts.length - 1].split(' ');

      let state = '';
      let zipCode = '';

      if (stateZipParts.length >= 2) {
        state = stateZipParts[0];
        zipCode = stateZipParts.slice(1).join(' ');
      }

      console.log('Extracted address data:', { address, city, state, zipCode });

      form.setValue('address', address);
      form.setValue('city', city);
      form.setValue('state', state);
      form.setValue('zipCode', zipCode);
    } else {
      // If we can't parse properly, at least set the address field
      form.setValue('address', fullAddress);
    }
  };

  return (
    <>
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <AddressSearchField
                  value={field.value}
                  onChange={field.onChange}
                  onAddressSelect={handleAddressSelect}

                />
              </div>
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              Digite o endereço e selecione uma das opções sugeridas
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input placeholder="Cidade" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <FormControl>
                <Input placeholder="UF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input placeholder="00000-000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default WorkshopAddressFields;
