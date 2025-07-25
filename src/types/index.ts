export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  password?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  avatar?: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpfCnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  addressComplement?: string | null;
  addressReference?: string | null;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  specialties?: string[] | null;
  location?: any | null;
  isActive?: boolean;
}

export type ServiceOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'scheduled_collection'
  | 'in_progress'
  | 'on_the_way'
  | 'collected'
  | 'collected_for_diagnosis'
  | 'at_workshop'
  | 'received_at_workshop'
  | 'diagnosis_completed'
  | 'quote_sent'
  | 'quote_approved'
  | 'quote_rejected'
  | 'ready_for_return'
  | 'needs_workshop'
  | 'ready_for_delivery'
  | 'collected_for_delivery'
  | 'on_the_way_to_deliver'
  | 'payment_pending'
  | 'completed'
  | 'cancelled';

export interface ServiceOrder {
  id: string;
  orderNumber?: string; // ✅ Número sequencial amigável (ex: "OS #001")
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCpfCnpj: string;
  clientAddressComplement: string;
  clientAddressReference: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;
  clientFullAddress?: string;
  technicianId: string | null;
  technicianName: string | null;
  status: ServiceOrderStatus;
  createdAt: string;
  scheduledDate: string | null;
  scheduledTime: string;
  completedDate: string | null;
  description: string;
  equipmentType: string;
  equipmentModel: string | null;
  equipmentSerial: string | null;
  needsPickup: boolean;
  pickupAddress: string | null;
  pickupAddressComplement: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupZipCode: string | null;
  currentLocation: 'client' | 'transit' | 'workshop' | null;
  serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  clientDescription: string;
  images: ServiceOrderImage[];
  serviceItems: ServiceOrderItem[];
  diagnosis?: EquipmentDiagnosis;
  archived?: boolean;
  initialCost?: number; // ✅ Valor inicial (sinal para coleta diagnóstico)
  finalCost?: number; // ✅ Valor final total do serviço

  // Campos para identificar a oficina responsável
  workshopId?: string | null;
  workshopName?: string | null;

  // Campos para controle de atualizações
  updatedById?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | null;
  notes?: string | null;

  // Campos para controle de garantia
  warrantyPeriod?: number | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyTerms?: string | null;
  relatedWarrantyOrderId?: string | null;

  // Campo para relacionamento com agendamento
  agendamentoId?: string | null;
}

export interface ServiceOrderImage {
  id: string;
  url: string;
  name: string;
}

export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  serviceType: string;
  serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  equipmentType: string;
  equipmentModel: string | null;
  equipmentSerial: string | null;
  clientDescription: string;
  serviceValue: string;
}

export interface ScheduledService {
  id: string;
  createdAt: string;
  address: string;
  clientName: string;
  description: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  serviceOrderId: string | null;
  status: string;
  technicianId: string | null;
  technicianName: string;
  clientId: string | null;
  finalCost?: number; // ✅ Valor da OS relacionada
  clientPhone?: string; // ✅ Telefone do cliente
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paidStatus: 'paid' | 'pending' | 'overdue';
  serviceOrderId: string | null;
}

export interface EquipmentDiagnosis {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  serviceOrderId: string;
  workshopUserId: string;
  diagnosisDetails: string;
  recommendedService: string | null;
  estimatedCost: number | null;
  estimatedCompletionDate: string | null;
  partsPurchaseLink: string | null;
}

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  time: string | null;
  read: boolean | null;
  type: string | null;
}

export interface ServiceEvent {
  id: string;
  serviceOrderId: string;
  type: 'diagnosis' | 'repair' | 'delivery' | 'collection';
  description: string;
  createdAt: string;
  createdBy: string;
}

export type UserRole = 'admin' | 'technician' | 'client' | 'workshop';

// ===================================================================
// 📊 TIPOS PARA SISTEMA DE ANALYTICS E BI (MVP 4)
// ===================================================================

// Tipos base para relatórios
export type ReportType =
  | 'operational'     // Relatórios operacionais
  | 'financial'       // Relatórios financeiros
  | 'performance'     // Relatórios de performance
  | 'customer'        // Relatórios de clientes
  | 'inventory'       // Relatórios de estoque
  | 'technician'      // Relatórios de técnicos
  | 'workshop';       // Relatórios de oficinas

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface ReportFilters {
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  technicianId?: string;
  workshopId?: string;
  clientId?: string;
  serviceType?: string;
  status?: string;
  region?: string;
}

export interface ReportMetadata {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  filters: ReportFilters;
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
  fileUrl?: string;
  fileSize?: number;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  filters: ReportFilters;
  format: ReportFormat;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[]; // emails
  isActive: boolean;
  nextRun: string;
  lastRun?: string;
  createdAt: string;
  createdBy: string;
}

// Re-export all types from other modules
export * from './requiredActions';
export * from './ai';
export * from './reports';
export * from './mobile';
