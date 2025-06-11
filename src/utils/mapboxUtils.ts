
/**
 * Utilidades para integração com a API de geocodificação do Mapbox
 */

import mapboxgl from 'mapbox-gl';

// Cache temporário para resultados de pesquisa
const searchCache: Record<string, { data: any[]; timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutos de cache

// Interface para resultado de geocodificação
export interface GeocodingFeature {
  place_name: string;
  geometry: {
    coordinates: number[];
    type: string;
  };
  properties: any;
}

/**
 * Busca endereços usando a API de geocodificação do Mapbox
 * @param query Texto da busca
 * @param mapboxToken Token de acesso do Mapbox
 * @param country Código do país para limitar os resultados (default: 'br' - Brasil)
 * @param types Tipos de lugares a serem retornados (default: 'address,poi')
 */
export const searchAddressesWithMapbox = async (
  query: string,
  mapboxToken: string,
  country: string = 'br',
  types: string = 'address,poi'
): Promise<GeocodingFeature[]> => {
  if (!query || query.length < 3 || !mapboxToken) return [];
  
  // Chave para cache combinando a consulta, token e país
  const cacheKey = `${query}-${country}-${types}-${mapboxToken.substring(0, 8)}`;
  
  // Verificar se temos resultados em cache
  const cachedResult = searchCache[cacheKey];
  if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_DURATION)) {
    console.log('Usando resultados em cache para:', query);
    // Garantir sempre GeocodingFeature[]
    return (cachedResult.data as GeocodingFeature[]).filter(f => !!f && !!(f as any).geometry && !!(f as any).place_name);
  }
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&country=${country}&types=${types}&language=pt-BR&limit=5`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API do Mapbox: ${response.status}`);
    }
    
    const data = await response.json();
    // Retornar só features que possuem geometry válida
    const features: GeocodingFeature[] = Array.isArray(data.features)
      ? data.features.filter((f: any) => f && typeof f === "object" && !!f.geometry && Array.isArray(f.geometry.coordinates))
      : [];
    
    // Salvar no cache
    searchCache[cacheKey] = {
      data: features,
      timestamp: Date.now()
    };
    
    return features;
  } catch (error) {
    console.error('Erro ao buscar endereços com Mapbox:', error);
    return [];
  }
};

/**
 * Verifica se um token do Mapbox é válido
 * @param token Token a ser validado
 */
export const isMapboxTokenValid = async (token: string): Promise<boolean> => {
  if (!token || token.length < 20) return false;
  
  try {
    // Tentamos uma requisição simples para verificar se o token é válido
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/teste.json?access_token=${token}&limit=1`;
    const response = await fetch(url);
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao validar token do Mapbox:', error);
    return false;
  }
};

/**
 * Obtém o token do Mapbox que está armazenado
 * @returns O token do Mapbox ou null se não encontrado
 */
export const getStoredMapboxToken = (): string | null => {
  try {
    // Verifica o localStorage primeiro
    const localToken = localStorage.getItem('mapboxToken');
    if (localToken && localToken.length > 20) {
      console.log("Token recuperado do localStorage:", localToken.substring(0, 10) + "...");
      return localToken;
    }
    
    // Se existir o token na instância global do mapboxgl
    if (mapboxgl.accessToken && mapboxgl.accessToken.length > 20) {
      console.log("Token recuperado da variável global");
      // Também salvamos no localStorage para persistência
      localStorage.setItem('mapboxToken', mapboxgl.accessToken);
      return mapboxgl.accessToken;
    }
    
    console.log("Nenhum token válido encontrado");
    return null;
  } catch (error) {
    console.error("Erro ao recuperar token:", error);
    return null;
  }
};

/**
 * Salva o token do Mapbox nos storages disponíveis
 * @param token Token a ser salvo
 */
export const storeMapboxToken = (token: string): void => {
  if (!token || token.length < 20) {
    console.error("Token inválido para armazenamento");
    return;
  }
  
  try {
    // Salvar no localStorage
    localStorage.setItem('mapboxToken', token);
    // Definir no objeto global do mapbox
    mapboxgl.accessToken = token;
    console.log("Token salvo com sucesso");
  } catch (error) {
    console.error("Erro ao salvar token:", error);
  }
};

/**
 * Remove o token do Mapbox dos storages
 */
export const removeStoredMapboxToken = (): void => {
  try {
    localStorage.removeItem('mapboxToken');
    mapboxgl.accessToken = '';
    console.log("Token removido com sucesso");
  } catch (error) {
    console.error("Erro ao remover token:", error);
  }
};
