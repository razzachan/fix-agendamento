import { supabase } from '@/integrations/supabase/client';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

interface CachedCoordinate {
  id?: string;
  address: string;
  lat: number;
  lng: number;
  created_at?: string;
}

/**
 * Serviço de geocodificação para converter endereços em coordenadas geográficas
 */
export const geocodingService = {
  /**
   * Converte um endereço em coordenadas geográficas (latitude e longitude)
   * Primeiro verifica se as coordenadas já estão em cache no Supabase
   * Se não estiverem, faz uma requisição à API do OpenStreetMap Nominatim
   *
   * @param address Endereço completo a ser convertido
   * @returns Objeto com latitude e longitude
   */
  async getCoordinates(address: string): Promise<GeoCoordinates | null> {
    if (!address) {
      console.error('Endereço vazio fornecido para geocodificação');
      return null;
    }

    try {
      // Primeiro, verifica se já temos as coordenadas em cache
      const cachedCoordinates = await this.getCachedCoordinates(address);
      if (cachedCoordinates) {
        console.log('Coordenadas encontradas em cache:', cachedCoordinates);
        return cachedCoordinates;
      }

      // Se não estiver em cache, faz a requisição à API do Nominatim
      console.log('Buscando coordenadas para:', address);
      const coordinates = await this.fetchCoordinatesFromAPI(address);

      if (coordinates) {
        // Salva as coordenadas em cache para uso futuro
        await this.cacheCoordinates(address, coordinates);
        return coordinates;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter coordenadas:', error);
      return null;
    }
  },

  /**
   * Busca coordenadas em cache no Supabase
   *
   * @param address Endereço a ser buscado
   * @returns Coordenadas se encontradas, null caso contrário
   */
  async getCachedCoordinates(address: string): Promise<GeoCoordinates | null> {
    try {
      const { data, error } = await supabase
        .from('geocoding_cache')
        .select('lat, lng')
        .eq('address', address)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        lat: data.lat,
        lng: data.lng
      };
    } catch (error) {
      console.error('Erro ao buscar coordenadas em cache:', error);
      return null;
    }
  },

  /**
   * Salva coordenadas em cache no Supabase
   *
   * @param address Endereço
   * @param coordinates Coordenadas a serem salvas
   */
  async cacheCoordinates(address: string, coordinates: GeoCoordinates): Promise<void> {
    try {
      const { error } = await supabase
        .from('geocoding_cache')
        .insert({
          address,
          lat: coordinates.lat,
          lng: coordinates.lng
        });

      if (error) {
        console.error('Erro ao salvar coordenadas em cache:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar coordenadas em cache:', error);
    }
  },

  /**
   * Busca coordenadas na API do OpenStreetMap Nominatim
   *
   * @param address Endereço a ser convertido
   * @returns Coordenadas se encontradas, null caso contrário
   */
  async fetchCoordinatesFromAPI(address: string): Promise<GeoCoordinates | null> {
    try {
      // Codifica o endereço para URL
      const encodedAddress = encodeURIComponent(address);

      // Faz a requisição à API do Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'EletroFixHubPro/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar coordenadas da API:', error);
      return null;
    }
  }
};

export default geocodingService;
