
import { useMemo } from 'react';

interface UseAddressSearchStatusProps {
  isTokenLoading: boolean;
  mapboxToken: string;
}

export const useAddressSearchStatus = ({
  isTokenLoading,
  mapboxToken,
}: UseAddressSearchStatusProps) => {
  const statusMessage = useMemo(() => {
    if (isTokenLoading) {
      return 'Validando token do Mapbox...';
    }
    
    if (!mapboxToken) {
      return 'Configure o token do Mapbox para habilitar a busca de endereços';
    }
    
    return 'Digite o endereço e selecione uma das opções sugeridas';
  }, [isTokenLoading, mapboxToken]);

  return { statusMessage };
};
