import { RoutingOrchestrator } from './RoutingOrchestrator';
import { AvailabilityManager } from './AvailabilityManager';
import { RouteOptimizer } from './RouteOptimizer';
import { GeographicClusterer } from './GeographicClusterer';
import { RoutingInterface } from './RoutingInterface';
import * as Types from './types';

// Exportar classes individuais
export {
  RoutingOrchestrator,
  AvailabilityManager,
  RouteOptimizer,
  GeographicClusterer,
  RoutingInterface,
  Types
};

// Criar e exportar uma instância do orquestrador
export const routingService = new RoutingOrchestrator();

// Exportar tipos
export type {
  ServicePoint,
  TimeSlot,
  RouteSegment,
  RouteOptimizationResult,
  LogisticGroup
} from './types';
