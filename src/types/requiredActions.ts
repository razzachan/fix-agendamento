/**
 * Tipos para o sistema de ações obrigatórias nas transições de status
 */

export type RequiredActionType = 'photo' | 'text' | 'location' | 'signature' | 'selection' | 'payment';

export interface RequiredAction {
  type: RequiredActionType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: (value: any) => boolean;
  options?: string[]; // Para seleções
  maxPhotos?: number; // Para fotos
  minLength?: number; // Para texto
}

export interface StatusTransitionConfig {
  fromStatus: string;
  toStatus: string;
  attendanceTypes: string[]; // Tipos de atendimento que aplicam
  requiredActions: RequiredAction[];
  title: string;
  description: string;
  allowSkip: boolean; // Sistema híbrido - permite pular em adversidades
  skipReason?: string; // Motivo para permitir pular
}

export interface ActionData {
  type: RequiredActionType;
  value: any;
  timestamp: string;
  technicianId: string;
  metadata?: Record<string, any>;
}

export interface CompletedAction {
  actionType: RequiredActionType;
  data: ActionData;
  skipped: boolean;
  skipReason?: string;
}
