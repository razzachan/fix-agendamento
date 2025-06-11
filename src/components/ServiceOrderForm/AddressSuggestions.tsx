
import React from 'react';

interface AddressSuggestionsProps {
  suggestions: string[];
  show: boolean;
  onSelect: (address: string) => void;
  suggestionRef: React.RefObject<HTMLDivElement>;
}

const AddressSuggestions: React.FC<AddressSuggestionsProps> = ({ 
  suggestions, 
  show, 
  onSelect,
  suggestionRef 
}) => {
  if (!show || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      ref={suggestionRef}
      className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white/95 backdrop-blur-sm py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="cursor-pointer px-4 py-2 hover:bg-accent/50 transition-colors"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
};

export default AddressSuggestions;
