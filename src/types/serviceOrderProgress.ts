import { ServiceOrderStatus } from '@/types';

/**
 * Representa uma entrada no histórico de progresso de uma ordem de serviço
 */
export interface ServiceOrderProgressEntry {
  id: string;
  serviceOrderId: string;
  status: ServiceOrderStatus;
  timestamp: string;
  userId?: string;
  userName?: string;
  notes?: string;
  systemGenerated: boolean;
}

/**
 * Representa o histórico completo de progresso de uma ordem de serviço
 */
export interface ServiceOrderProgress {
  serviceOrderId: string;
  entries: ServiceOrderProgressEntry[];
}
