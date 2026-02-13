import { z } from 'zod';

export const GetAvailabilitySchema = z.object({
  date: z.string().min(8),
  service_type: z.string().optional(),
  region: z.string().optional(),
  duration: z.number().int().positive().max(480).default(60),
  equipment: z.string().optional(),
  technician_id: z.string().optional(),
});

export const CreateAppointmentSchema = z.object({
  client_name: z.string().min(1),
  start_time: z.string().min(10),
  end_time: z.string().min(10),
  address: z.string().optional().default(''),
  address_complement: z.string().optional().default(''),
  zip_code: z.string().optional().default(''),
  email: z.string().optional().default(''),
  cpf: z.string().optional().default(''),
  description: z.string().optional().default(''),
  equipment_type: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  attendance_preference: z.string().optional().default(''),
  region: z.string().optional().nullable(),
});

export const CancelAppointmentSchema = z.object({
  id: z.any(),
  reason: z.string().optional().default(''),
});

export default { GetAvailabilitySchema, CreateAppointmentSchema, CancelAppointmentSchema };

