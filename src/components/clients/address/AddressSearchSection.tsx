
import React from 'react';
import { FormLabel } from '@/components/ui/form';

import AddressSearchField from '@/components/address/AddressSearchField';
import { extractCityFromAddress, extractStateFromAddress, extractZipCodeFromAddress } from '@/utils/addressExtractor';
import { useAddressSearchStatus } from '@/hooks/useAddressSearchStatus';

interface AddressSearchSectionProps {
  fullAddress: string;
  setFullAddress: (value: string) => void;
  updateAddressFields: (address: string, city?: string, state?: string, zipCode?: string) => void;
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  showTokenInput: boolean;
  saveMapboxToken: () => void;
  removeMapboxToken: () => void;
  isTokenLoading: boolean;
  disabled?: boolean;
}

const AddressSearchSection: React.FC<AddressSearchSectionProps> = ({
  fullAddress,
  setFullAddress,
  updateAddressFields,
  mapboxToken,
  setMapboxToken,
  showTokenInput,
  saveMapboxToken,
  removeMapboxToken,
  isTokenLoading,
  disabled = false
}) => {
  const { statusMessage } = useAddressSearchStatus({ isTokenLoading, mapboxToken });

  const handleAddressSelect = (address: string) => {
    setFullAddress(address);

    // Extract city, state and zip code from the address
    const city = extractCityFromAddress(address);
    const state = extractStateFromAddress(address);
    const zipCode = extractZipCodeFromAddress(address);

    // Update form fields
    updateAddressFields(address, city || undefined, state || undefined, zipCode || undefined);
  };

  return (
    <div className="space-y-2">
      <FormLabel>Endereço Completo</FormLabel>
      <AddressSearchField
        value={fullAddress}
        onChange={setFullAddress}
        onAddressSelect={handleAddressSelect}
        disabled={disabled}
      />

      <p className="text-sm text-muted-foreground">
        {statusMessage}
      </p>
    </div>
  );
};

export default AddressSearchSection;
