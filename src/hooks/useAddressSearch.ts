
import { useState, useRef, useEffect, useCallback } from 'react';
import { searchAddressesWithMapbox, GeocodingFeature } from '@/utils/mapboxUtils';

/**
 * Hook to handle address searching functionality
 */
export const useAddressSearch = (mapboxToken: string) => {
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3 || !mapboxToken) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      console.log('Searching for address:', query);
      const features = await searchAddressesWithMapbox(query, mapboxToken);
      console.log('Found suggestions:', features);
      
      // Extrair os nomes dos lugares das features
      const placeNames = features.map(feature => feature.place_name);
      setAddressSuggestions(placeNames);
      setShowSuggestions(placeNames.length > 0);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, [mapboxToken]);
  
  // Perform address search when query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery && searchQuery.length >= 3 && mapboxToken) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 400);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, mapboxToken, performSearch]);

  return {
    addressSuggestions,
    setAddressSuggestions,
    searchQuery,
    setSearchQuery,
    isSearching,
    showSuggestions,
    setShowSuggestions,
  };
};
