
import React from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import AddressSuggestions from './AddressSuggestions';
import { useAddressSearch } from '@/hooks/useAddressSearch';


interface AddressSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: string) => void;
  disabled?: boolean;
}

const AddressSearchField: React.FC<AddressSearchFieldProps> = ({
  value,
  onChange,
  onAddressSelect,
  disabled = false
}) => {
  const mapboxToken = '';

  const {
    addressSuggestions,
    setAddressSuggestions,
    searchQuery,
    setSearchQuery,
    isSearching,
    showSuggestions,
    setShowSuggestions
  } = useAddressSearch(mapboxToken);

  const handleSuggestionSelect = (address: string) => {
    onChange(address);
    onAddressSelect(address);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange(value);
    setSearchQuery(value);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder="Digite o endereço"
          icon={<MapPin className="h-4 w-4" />}
          className="pr-10"
          disabled={disabled}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin" />
          </div>
        )}
      </div>

      <AddressSuggestions
        suggestions={addressSuggestions}
        show={showSuggestions}
        onSelect={handleSuggestionSelect}
        onClose={() => setShowSuggestions(false)}
      />
    </div>
  );
};

export default AddressSearchField;
