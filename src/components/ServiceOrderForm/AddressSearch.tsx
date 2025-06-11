
import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { FormValues } from './types';
import { AddressSearchField } from '@/components/address';
import { extractCityFromAddress, extractStateFromAddress, extractZipCodeFromAddress } from '@/utils/addressExtractor';

interface AddressSearchProps {
  form: UseFormReturn<FormValues>;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ form }) => {

  const handleAddressSelect = (address: string) => {
    form.setValue('clientFullAddress', address);

    // Extract city, state and zip code from the address
    const city = extractCityFromAddress(address);
    const state = extractStateFromAddress(address);
    const zipCode = extractZipCodeFromAddress(address);

    console.log('Extracted address data:', { city, state, zipCode });

    // Auto-fill other fields if data is available
    if (city) form.setValue('clientCity', city);
    if (state) form.setValue('clientState', state);
    if (zipCode) form.setValue('clientZipCode', zipCode);
  };

  return (
    <>
      <FormField
        control={form.control}
        name="clientFullAddress"
        render={({ field }) => (
          <FormItem className="relative">
            <FormLabel>Endereço Completo</FormLabel>
            <FormControl>
              <AddressSearchField
                value={field.value || ''}
                onChange={(value) => field.onChange(value)}
                onAddressSelect={handleAddressSelect}
              />
            </FormControl>
            <FormDescription>
              Digite o endereço e selecione uma das opções sugeridas
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default AddressSearch;
