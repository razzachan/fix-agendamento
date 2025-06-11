/**
 * Tipos compartilhados para o sistema de roteirização
 */

// Representa um slot de tempo disponível
export interface TimeSlot {
  start: Date;
  end: Date;
  period: 'manhã' | 'tarde';
  technician?: string;
}

// Representa um ponto de serviço (agendamento ou pré-agendamento)
export interface ServicePoint {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
  clientName: string;
  serviceTime: number; // em minutos
  priority: number;
  type: 'confirmado' | 'pre-agendamento';
  scheduledTime?: Date; // Definido apenas para agendamentos confirmados
  serviceType: 'in-home' | 'pickup'; // Tipo de serviço (em casa ou coleta)
  urgency: boolean; // Se é um serviço urgente
}

// Representa um segmento de rota entre dois pontos
export interface RouteSegment {
  from: ServicePoint;
  to: ServicePoint;
  distance: number; // em km
  estimatedTravelTime: number; // em minutos
}

// Resultado da otimização de rota
export interface RouteOptimizationResult {
  suggestedRoute: ServicePoint[];
  timeSlotSuggestions: Map<string, TimeSlot[]>; // id do pré-agendamento -> slots sugeridos
  totalDistance: number;
  totalTime: number;
}

// Resultado do processamento de roteirização
export interface RoutingProcessResult {
  suggestedRoute: ServicePoint[];
  totalDistance: number;
  totalTime: number;
  confirmedServices: ServicePoint[];
  preAppointments: ServicePoint[];
}

// Grupo logístico (A, B, C)
export type LogisticGroup = 'A' | 'B' | 'C';

// Configurações de janelas de tempo
export const TIME_WINDOWS = {
  MORNING_START: 9, // 9:00
  MORNING_END: 12, // 12:00
  AFTERNOON_START: 13, // 13:00
  AFTERNOON_END: 17, // 17:00
  DAY_END: 18, // 18:00
};

// Configurações de tempo de serviço
export const SERVICE_TIMES = {
  IN_HOME_MIN: 40, // 40 minutos
  IN_HOME_MAX: 60, // 60 minutos
  PICKUP_MIN: 20, // 20 minutos
  PICKUP_MAX: 40, // 40 minutos
};

// Configurações de distância
export const DISTANCE_CONFIG = {
  MAX_CLUSTER_RADIUS: 5, // 5 km
  AVERAGE_SPEED: 30, // 30 km/h
};
