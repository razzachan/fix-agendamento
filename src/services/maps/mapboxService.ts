import { supabase } from '@/integrations/supabase/client';
import { GeoCoordinates } from './geocodingService';

// Mapbox token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

export interface RouteWaypoint {
  name: string;
  coordinates: GeoCoordinates;
}

export interface RouteOptions {
  profile?: 'driving' | 'walking' | 'cycling';
  alternatives?: boolean;
  geometries?: 'geojson' | 'polyline';
  overview?: 'simplified' | 'full' | 'false';
  steps?: boolean;
  annotations?: string[];
}

export interface RouteResponse {
  routes: {
    distance: number;
    duration: number;
    geometry: any;
    legs: {
      steps: any[];
      distance: number;
      duration: number;
      summary: string;
    }[];
  }[];
  waypoints: {
    name: string;
    location: [number, number];
  }[];
}

export interface SavedRoute {
  id?: string;
  name: string;
  waypoints: RouteWaypoint[];
  route_data: any;
  technician_id?: string;
  created_at?: string;
  scheduled_date: string; // Data agendada para a rota (obrigatória)
  logistics_group?: string; // Grupo logístico (A, B, C) opcional
}

/**
 * Serviço para interação com a API do Mapbox
 */
export const mapboxService = {
  /**
   * Obtém coordenadas geográficas a partir de um endereço usando o Mapbox Geocoding API
   *
   * @param address Endereço a ser geocodificado
   * @returns Coordenadas geográficas (latitude e longitude)
   */
  async geocode(address: string): Promise<GeoCoordinates | null> {
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

      // Se não estiver em cache, faz a requisição à API do Mapbox
      console.log('Buscando coordenadas para:', address);

      // Verificar se o endereço tem informações suficientes
      if (address.length < 10) {
        console.warn(`Endereço muito curto para geocodificação: "${address}"`);
      }

      // Adicionar "Brasil" ao final do endereço se não estiver presente
      let enderecoCompleto = address;
      if (!enderecoCompleto.toLowerCase().includes('brasil')) {
        enderecoCompleto += ', Brasil';
        console.log(`Endereço complementado: "${enderecoCompleto}"`);
      }

      const encodedAddress = encodeURIComponent(enderecoCompleto);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=br&limit=1`;

      console.log(`URL de geocodificação: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro na requisição Mapbox: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Resposta da API Mapbox:`, data);

      if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const coordinates = { lat, lng };
        console.log(`Coordenadas encontradas: ${lat}, ${lng} para endereço: "${address}"`);

        // Salva as coordenadas em cache para uso futuro
        await this.cacheCoordinates(address, coordinates);
        return coordinates;
      } else {
        console.warn(`Nenhuma coordenada encontrada para o endereço: "${address}"`);
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter coordenadas do Mapbox:', error);
      return null;
    }
  },

  /**
   * Busca coordenadas em cache no Supabase
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
   * Obtém uma rota otimizada entre múltiplos pontos usando o Mapbox Directions API
   *
   * @param waypoints Lista de pontos de parada (origem, destinos, etc.)
   * @param options Opções de rota (perfil, alternativas, etc.)
   * @returns Dados da rota otimizada
   */
  async getOptimizedRoute(
    waypoints: RouteWaypoint[],
    options: RouteOptions = {}
  ): Promise<RouteResponse | null> {
    if (!waypoints || waypoints.length < 2) {
      console.error('São necessários pelo menos 2 pontos para calcular uma rota');
      return null;
    }

    try {
      // Formatar as coordenadas para a API do Mapbox
      const coordinates = waypoints.map(wp =>
        `${wp.coordinates.lng},${wp.coordinates.lat}`
      ).join(';');

      // Configurar opções da rota
      const profile = options.profile || 'driving';
      const params = new URLSearchParams({
        alternatives: (options.alternatives || false).toString(),
        geometries: options.geometries || 'geojson',
        overview: options.overview || 'full',
        steps: (options.steps || true).toString(),
        access_token: MAPBOX_TOKEN
      });

      // Fazer a requisição à API do Mapbox Directions
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro na requisição de rota: ${response.status}`);
      }

      const data = await response.json();
      return data as RouteResponse;
    } catch (error) {
      console.error('Erro ao obter rota otimizada:', error);
      return null;
    }
  },

  /**
   * Salva uma rota no banco de dados
   *
   * @param route Dados da rota a ser salva
   * @returns ID da rota salva
   */
  async saveRoute(route: SavedRoute): Promise<string | null> {
    if (!route.scheduled_date) {
      console.error('Data agendada é obrigatória para salvar uma rota');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('routes')
        .insert({
          name: route.name,
          waypoints: route.waypoints,
          route_data: route.route_data,
          technician_id: route.technician_id,
          scheduled_date: route.scheduled_date,
          logistics_group: route.logistics_group || null
        })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao salvar rota:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      return null;
    }
  },

  /**
   * Obtém rotas salvas no banco de dados
   *
   * @param filters Objeto com filtros para busca de rotas
   * @returns Lista de rotas salvas
   */
  async getSavedRoutes(filters: {
    technicianId?: string;
    scheduledDate?: string;
    logisticsGroup?: string;
    dateRange?: { start: string; end: string };
  } = {}): Promise<SavedRoute[]> {
    try {
      let query = supabase
        .from('routes')
        .select('*');

      // Filtrar por técnico
      if (filters.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      // Filtrar por data específica
      if (filters.scheduledDate) {
        query = query.eq('scheduled_date', filters.scheduledDate);
      }

      // Filtrar por intervalo de datas
      if (filters.dateRange) {
        query = query
          .gte('scheduled_date', filters.dateRange.start)
          .lte('scheduled_date', filters.dateRange.end);
      }

      // Filtrar por grupo logístico
      if (filters.logisticsGroup) {
        query = query.eq('logistics_group', filters.logisticsGroup);
      }

      // Ordenar por data e nome
      query = query.order('scheduled_date', { ascending: true })
                  .order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar rotas:', error);
        return [];
      }

      return data as SavedRoute[];
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      return [];
    }
  },

  /**
   * Obtém a rota do dia atual para um técnico específico
   *
   * @param technicianId ID do técnico
   * @returns Rota do dia atual ou null se não existir
   */
  async getTodayRoute(technicianId: string): Promise<SavedRoute | null> {
    try {
      // Obter a data atual no formato YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('scheduled_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Se o erro for "No rows found", não é realmente um erro
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Erro ao buscar rota do dia:', error);
        return null;
      }

      return data as SavedRoute;
    } catch (error) {
      console.error('Erro ao buscar rota do dia:', error);
      return null;
    }
  }
};

export default mapboxService;
