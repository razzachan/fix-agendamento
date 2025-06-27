import { 
  Coordinates, 
  LocationValidationConfig, 
  LocationValidationResult,
  CheckInAttempt,
  GeocodingCacheEntry,
  GEOLOCATION_CONSTANTS,
  getDistanceSeverity,
  getValidationMessage
} from '@/types/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Serviço para geolocalização e validação de proximidade
 */
export class GeolocationService {
  private static geocodingCache = new Map<string, GeocodingCacheEntry>();

  /**
   * Obter posição atual do usuário
   */
  static async getCurrentPosition(): Promise<Coordinates> {
    console.log('📍 [GeolocationService] getCurrentPosition iniciado');

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ [GeolocationService] Geolocalização não suportada');
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_CONSTANTS.POSITION_TIMEOUT,
        maximumAge: 30000 // Cache por 30 segundos
      };

      console.log('📍 [GeolocationService] Solicitando posição com opções:', options);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          console.log(`✅ [GeolocationService] Posição obtida com sucesso:`, coords);
          resolve(coords);
        },
        (error) => {
          console.error('❌ [GeolocationService] Erro ao obter posição:', error);
          console.error('❌ [GeolocationService] Código do erro:', error.code);
          console.error('❌ [GeolocationService] Mensagem do erro:', error.message);

          let message = 'Erro ao obter localização';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permissão de localização negada. Ative a localização nas configurações.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Localização indisponível. Verifique se o GPS está ativo.';
              break;
            case error.TIMEOUT:
              message = 'Timeout ao obter localização. Tente novamente.';
              break;
          }

          reject(new Error(message));
        },
        options
      );
    });
  }

  /**
   * Validar proximidade com endereço de destino
   */
  static async validateProximity(
    currentLocation: Coordinates,
    targetAddress: string,
    config: LocationValidationConfig
  ): Promise<LocationValidationResult> {
    try {
      console.log(`🔍 [GeolocationService] Validando proximidade para: ${targetAddress}`);
      
      // Verificar precisão do GPS
      if (currentLocation.accuracy && currentLocation.accuracy > GEOLOCATION_CONSTANTS.MAX_ACCURACY_THRESHOLD) {
        console.warn(`⚠️ [GeolocationService] Baixa precisão GPS: ${currentLocation.accuracy}m`);
        
        return {
          isValid: false,
          distance: 0,
          tolerance: config.tolerance,
          canProceed: config.allowManualOverride,
          requiresConfirmation: true,
          message: `⚠️ Precisão do GPS muito baixa (${Math.round(currentLocation.accuracy)}m). Confirma mesmo assim?`,
          severity: 'warning'
        };
      }

      // Obter coordenadas do endereço de destino
      const targetCoordinates = await this.geocodeAddress(targetAddress);
      
      if (!targetCoordinates) {
        console.error(`❌ [GeolocationService] Não foi possível geocodificar: ${targetAddress}`);
        
        return {
          isValid: false,
          distance: 0,
          tolerance: config.tolerance,
          canProceed: config.allowManualOverride,
          requiresConfirmation: true,
          message: '❌ Não foi possível validar o endereço. Confirma o check-in?',
          severity: 'warning'
        };
      }

      // Calcular distância
      const distance = this.calculateDistance(currentLocation, targetCoordinates);
      const severity = getDistanceSeverity(distance, config.tolerance);
      const isValid = distance <= config.tolerance;

      console.log(`📏 [GeolocationService] Distância calculada: ${Math.round(distance)}m (tolerância: ${config.tolerance}m)`);

      const result: LocationValidationResult = {
        isValid,
        distance,
        tolerance: config.tolerance,
        canProceed: isValid || config.allowManualOverride,
        requiresConfirmation: !isValid && config.allowManualOverride,
        message: getValidationMessage({ isValid, distance, tolerance: config.tolerance, canProceed: true, requiresConfirmation: false, message: '', severity }, config.serviceType),
        severity
      };

      return result;

    } catch (error) {
      console.error('❌ [GeolocationService] Erro na validação de proximidade:', error);
      
      return {
        isValid: false,
        distance: 0,
        tolerance: config.tolerance,
        canProceed: config.allowManualOverride,
        requiresConfirmation: true,
        message: '❌ Erro ao validar localização. Confirma o check-in?',
        severity: 'error'
      };
    }
  }

  /**
   * Geocodificar endereço para coordenadas
   */
  static async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      // Verificar cache primeiro
      const cacheKey = address.toLowerCase().trim();
      const cached = this.geocodingCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < GEOLOCATION_CONSTANTS.GEOCODING_CACHE_TTL) {
        console.log(`📋 [GeolocationService] Usando endereço do cache: ${address}`);
        return cached.coordinates;
      }

      console.log(`🌍 [GeolocationService] Geocodificando endereço: ${address}`);

      // Usar API de geocoding (exemplo com OpenStreetMap Nominatim - gratuita)
      const encodedAddress = encodeURIComponent(`${address}, Brasil`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'FixFogoes/1.0 (contato@fixfogoes.com.br)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API de geocoding: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.warn(`⚠️ [GeolocationService] Endereço não encontrado: ${address}`);
        return null;
      }

      const result = data[0];
      const coordinates: Coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        timestamp: Date.now()
      };

      // Salvar no cache
      const cacheEntry: GeocodingCacheEntry = {
        address: cacheKey,
        coordinates,
        timestamp: Date.now(),
        confidence: parseFloat(result.importance || '0.5')
      };
      
      this.geocodingCache.set(cacheKey, cacheEntry);
      
      console.log(`✅ [GeolocationService] Endereço geocodificado:`, coordinates);
      return coordinates;

    } catch (error) {
      console.error(`❌ [GeolocationService] Erro ao geocodificar ${address}:`, error);
      return null;
    }
  }

  /**
   * Calcular distância entre duas coordenadas (fórmula de Haversine)
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = GEOLOCATION_CONSTANTS.EARTH_RADIUS;
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance);
  }

  /**
   * Converter graus para radianos
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Registrar tentativa de check-in
   */
  static async logCheckInAttempt(attempt: Omit<CheckInAttempt, 'id' | 'timestamp'>): Promise<void> {
    try {
      const checkInData = {
        ...attempt,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('check_in_attempts')
        .insert(checkInData);

      if (error) {
        console.error('❌ [GeolocationService] Erro ao registrar tentativa:', error);
      } else {
        console.log(`📝 [GeolocationService] Tentativa de check-in registrada: ${checkInData.id}`);
      }
    } catch (error) {
      console.error('❌ [GeolocationService] Erro ao salvar tentativa:', error);
    }
  }

  /**
   * Obter tentativas de check-in suspeitas
   */
  static async getSuspiciousCheckIns(
    technicianId: string,
    days: number = 7
  ): Promise<CheckInAttempt[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('check_in_attempts')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('timestamp', startDate.toISOString())
        .or('was_overridden.eq.true,validation_result->distance.gt.500');

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('❌ [GeolocationService] Erro ao buscar check-ins suspeitos:', error);
      return [];
    }
  }

  /**
   * Limpar cache de geocoding antigo
   */
  static clearOldCache(): void {
    const now = Date.now();
    const ttl = GEOLOCATION_CONSTANTS.GEOCODING_CACHE_TTL;
    
    for (const [key, entry] of this.geocodingCache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.geocodingCache.delete(key);
      }
    }
    
    console.log(`🧹 [GeolocationService] Cache de geocoding limpo`);
  }
}
