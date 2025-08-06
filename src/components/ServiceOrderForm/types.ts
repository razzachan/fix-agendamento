
import { z } from 'zod';
import { ServiceOrderStatus } from '@/types';
import { generateUUID } from '@/utils/uuid';

// Tipo para um item de serviço individual
export const serviceItemSchema = z.object({
  id: z.string().default(() => generateUUID()),
  serviceType: z.string().optional(),
  serviceAttendanceType: z.enum(['em_domicilio', 'coleta_conserto', 'coleta_diagnostico']),
  equipmentType: z.string().min(2, { message: 'Tipo de equipamento é obrigatório' }),
  equipmentModel: z.string().optional(),
  equipmentSerial: z.string().optional(),
  serviceValue: z.string().optional(),
  clientDescription: z.string().optional(),
});

export type ServiceItemType = z.infer<typeof serviceItemSchema>;

// Define the status options to match ServiceOrderStatus exactly
const statusSchema = z.enum([
  'pending',
  'scheduled',
  'scheduled_collection',
  'in_progress',
  'on_the_way',
  'collected',
  'collected_for_diagnosis',
  'at_workshop',
  'received_at_workshop',
  'diagnosis_completed',
  'quote_sent',
  'awaiting_quote_approval',
  'quote_approved',
  'quote_rejected',
  'ready_for_return',
  'needs_workshop',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending',
  'completed',
  'cancelled'
]);

export const formSchema = z.object({
  // Client information
  clientName: z.string().min(3, { message: 'Nome do cliente é obrigatório' }),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email({ message: 'Email inválido' }).optional(),
  clientFullAddress: z.string().optional(),
  clientCity: z.string().optional(),
  clientState: z.string().optional(),
  clientZipCode: z.string().optional(),
  clientCpfCnpj: z.string().optional(),
  clientAddressComplement: z.string().optional(),
  clientAddressReference: z.string().optional(),
  
  // Multiple service items
  serviceItems: z.array(serviceItemSchema).min(1, { 
    message: 'Adicione pelo menos um item de serviço' 
  }),
  
  // Technician and scheduling information
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  
  // Overall notes
  internalObservation: z.string().optional(),
  clientDescription: z.string().optional(),
  
  // Status - updated to match ServiceOrderStatus
  status: statusSchema.default('pending'),
});

export type FormValues = z.infer<typeof formSchema>;
