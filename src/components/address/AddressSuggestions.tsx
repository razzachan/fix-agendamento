
import React from 'react';
import { MapPin } from 'lucide-react';

interface AddressSuggestionsProps {
  suggestions: string[];
  show: boolean;
  onSelect: (address: string) => void;
  onClose: () => void;
}

const AddressSuggestions: React.FC<AddressSuggestionsProps> = ({ 
  suggestions, 
  show, 
  onSelect,
  onClose 
}) => {
  if (!show || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="cursor-pointer px-4 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2"
          onClick={() => onSelect(suggestion)}
        >
          <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{suggestion}</span>
        </div>
      ))}
    </div>
  );
};

export default AddressSuggestions;
