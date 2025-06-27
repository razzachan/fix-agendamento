/**
 * Tipos para sistema de geolocalização e validação de proximidade
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationValidationConfig {
  tolerance: number; // metros
  serviceType: 'em_domicilio' | 'coleta_diagnostico' | 'coleta_conserto';
  requiresStrictValidation: boolean;
  allowManualOverride: boolean;
}

export interface LocationValidationResult {
  isValid: boolean;
  distance: number; // metros
  tolerance: number;
  canProceed: boolean;
  requiresConfirmation: boolean;
  message: string;
  severity: 'success' | 'warning' | 'error';
}

export interface CheckInAttempt {
  id: string;
  serviceOrderId: string;
  technicianId: string;
  attemptedLocation: Coordinates;
  targetAddress: string;
  targetCoordinates?: Coordinates;
  validationResult: LocationValidationResult;
  wasOverridden: boolean;
  overrideReason?: string;
  timestamp: string;
  status: 'success' | 'failed' | 'overridden';
}

export interface GeolocationService {
  getCurrentPosition(): Promise<Coordinates>;
  validateProximity(
    currentLocation: Coordinates,
    targetAddress: string,
    config: LocationValidationConfig
  ): Promise<LocationValidationResult>;
  geocodeAddress(address: string): Promise<Coordinates | null>;
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number;
}

// Configurações padrão por tipo de serviço
export const DEFAULT_LOCATION_CONFIGS: Record<string, LocationValidationConfig> = {
  'em_domicilio': {
    tolerance: 100, // 100 metros
    serviceType: 'em_domicilio',
    requiresStrictValidation: true,
    allowManualOverride: true
  },
  'coleta_diagnostico': {
    tolerance: 200, // 200 metros (mais flexível para coletas)
    serviceType: 'coleta_diagnostico',
    requiresStrictValidation: false,
    allowManualOverride: true
  },
  'coleta_conserto': {
    tolerance: 200, // 200 metros
    serviceType: 'coleta_conserto',
    requiresStrictValidation: false,
    allowManualOverride: true
  }
} as const;

// Constantes do sistema
export const GEOLOCATION_CONSTANTS = {
  MAX_ACCURACY_THRESHOLD: 50, // metros - precisão mínima aceitável
  GEOCODING_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas
  POSITION_TIMEOUT: 15000, // 15 segundos
  MAX_RETRIES: 3,
  EARTH_RADIUS: 6371000, // metros
} as const;

// Tipos para cache de geocoding
export interface GeocodingCacheEntry {
  address: string;
  coordinates: Coordinates;
  timestamp: number;
  confidence: number;
}

// Tipos para relatórios de localização
export interface LocationReport {
  serviceOrderId: string;
  technicianId: string;
  checkInAttempts: CheckInAttempt[];
  checkOutLocation?: Coordinates;
  totalDistance?: number;
  suspiciousActivity: boolean;
  notes?: string;
}

// Tipos para configuração administrativa
export interface LocationSettings {
  globalTolerance: number;
  strictModeEnabled: boolean;
  allowOverrides: boolean;
  requireOverrideReason: boolean;
  logAllAttempts: boolean;
  alertOnSuspiciousActivity: boolean;
  maxDailyOverrides: number;
}

// Tipos para alertas de localização
export interface LocationAlert {
  id: string;
  type: 'distance_exceeded' | 'accuracy_low' | 'multiple_overrides' | 'suspicious_pattern';
  serviceOrderId: string;
  technicianId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  resolved: boolean;
}

// Função utilitária para obter configuração por tipo de serviço
export const getLocationConfigForService = (
  serviceType: string,
  customSettings?: Partial<LocationValidationConfig>
): LocationValidationConfig => {
  const defaultConfig = DEFAULT_LOCATION_CONFIGS[serviceType] || DEFAULT_LOCATION_CONFIGS['em_domicilio'];
  
  return {
    ...defaultConfig,
    ...customSettings
  };
};

// Função para determinar severidade baseada na distância
export const getDistanceSeverity = (
  distance: number,
  tolerance: number
): 'success' | 'warning' | 'error' => {
  if (distance <= tolerance) return 'success';
  if (distance <= tolerance * 1.5) return 'warning';
  return 'error';
};

// Função para gerar mensagem de validação
export const getValidationMessage = (
  result: LocationValidationResult,
  serviceType: string
): string => {
  const { distance, tolerance, severity } = result;
  
  if (severity === 'success') {
    return `✅ Localização confirmada (${Math.round(distance)}m do endereço)`;
  }
  
  if (severity === 'warning') {
    return `⚠️ Você está a ${Math.round(distance)}m do endereço (tolerância: ${tolerance}m). Confirma o check-in?`;
  }
  
  return `❌ Muito distante do endereço (${Math.round(distance)}m). Tolerância máxima: ${tolerance}m`;
};
