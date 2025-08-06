// Tipos para o sistema de calendário de roteirização

export type SlotStatus = 'livre' | 'sugerido' | 'confirmado' | 'bloqueado';

export interface CalendarSlot {
  id: string;
  start: Date;
  end: Date;
  technicianId: string;
  status: SlotStatus;

  // Dados do agendamento/OS
  agendamentoId?: number;
  ordemServicoId?: string;
  clientName?: string;
  address?: string;
  serviceType?: 'in-home' | 'coleta';
  isUrgent?: boolean;

  // Metadados
  isLunchTime?: boolean;
  estimatedDuration?: number; // em minutos
  logisticsGroup?: 'A' | 'B' | 'C';
  routePosition?: number; // posição na rota (para ordenação)

  // Dados de sugestão da IA
  suggestionScore?: number; // score da sugestão da IA (0-100)
  suggestionReason?: string; // motivo da sugestão
  isAISuggestion?: boolean;
}

export interface TechnicianSchedule {
  technicianId: string;
  technicianName: string;
  date: Date;
  slots: CalendarSlot[];
  totalOccupiedSlots: number;
  totalAvailableSlots: number;
  workload: number; // percentual de ocupação (0-100)
}

export interface CalendarConfig {
  workStartHour: number;
  workEndHour: number;
  lunchStartHour: number;
  lunchEndHour: number;
  slotDurationMinutes: number;
  maxSlotsPerDay: number;
}

export interface SlotUpdatePayload {
  slotId: string;
  status: SlotStatus;
  agendamentoId?: number;
  ordemServicoId?: string;
  estimatedDuration?: number;
}

// Cores para cada status
export const SLOT_COLORS = {
  livre: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hover: 'hover:bg-green-100',
    text: 'text-green-800'
  },
  sugerido: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-100',
    text: 'text-yellow-800'
  },
  confirmado: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100',
    text: 'text-blue-800'
  },
  bloqueado: {
    bg: 'bg-gray-200',
    border: 'border-gray-300',
    hover: '',
    text: 'text-gray-500'
  }
} as const;

// Configuração padrão
export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  workStartHour: 8,  // ✅ EXPANDIDO: Agora começa às 8h
  workEndHour: 18,
  lunchStartHour: 12,
  lunchEndHour: 13,
  slotDurationMinutes: 60,
  maxSlotsPerDay: 9 // 8h-12h (4) + 13h-18h (5) = 9 slots
};

// Tipos para o calendário principal
export type CalendarViewMode = 'day' | 'week' | 'month' | 'list';

export interface CalendarEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  clientName: string;
  technicianId: string;
  technicianName: string;
  equipment: string;
  problem: string;
  address: string;
  status: 'scheduled' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled' | 'at_workshop' | 'diagnosis' | 'awaiting_approval' | 'in_repair' | 'ready_delivery';
  isUrgent?: boolean;
  serviceOrderId?: string;
  logisticsGroup?: 'A' | 'B' | 'C';
  finalCost?: number; // ✅ Valor da OS
  clientPhone?: string; // ✅ Telefone do cliente
  eventType?: 'service' | 'delivery' | 'collection' | 'diagnosis'; // ✅ Tipo do evento
  parentEventId?: string; // ✅ Relacionamento pai/filho
}

// Tipos para disponibilidade de técnicos
export interface AvailabilitySlot {
  hour: number;
  isAvailable: boolean;
  reason?: string;
  existingAppointment?: {
    id: number;
    clientName: string;
    scheduledTime: string;
  };
}

export interface TechnicianAvailability {
  date: string;
  technicianId: string;
  slots: AvailabilitySlot[];
  totalAvailable: number;
  totalOccupied: number;
  serviceOrders?: any[];
}
