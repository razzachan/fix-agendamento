import { supabase } from './supabase.js';
import { z } from 'zod';

const UpsertOrderInput = z.object({
  client: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    id: z.string().nullable().optional(),
  }),
  address: z
    .object({
      full: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zip: z.string().nullable().optional(),
    })
    .optional(),
  item: z.object({
    equipmentType: z.string().optional().default(''),
    equipmentModel: z.string().nullable().optional(),
    equipmentSerial: z.string().nullable().optional(),
    clientDescription: z.string().optional().default(''),
    serviceAttendanceType: z
      .enum(['em_domicilio', 'coleta_conserto', 'coleta_diagnostico'])
      .optional(),
    serviceValue: z.string().optional().default(''),
  }),
  attendanceType: z.enum(['em_domicilio', 'coleta_conserto', 'coleta_diagnostico']).optional(),
  description: z.string().optional().default(''),
});

export async function upsertServiceOrder(input: z.infer<typeof UpsertOrderInput>): Promise<string> {
  const data = UpsertOrderInput.parse(input);

  const order = {
    client_name: data.client.name || 'Cliente',
    client_phone: data.client.phone || null,
    description: data.description || data.item.clientDescription || '',
    equipment_type: data.item.equipmentType || '',
    equipment_model: data.item.equipmentModel || null,
    equipment_serial: data.item.equipmentSerial || null,
    service_attendance_type:
      data.item.serviceAttendanceType || data.attendanceType || 'em_domicilio',
    pickup_address: data.address?.full || null,
    pickup_city: data.address?.city || null,
    pickup_state: data.address?.state || null,
    pickup_zip_code: data.address?.zip || null,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from('service_orders')
    .insert(order)
    .select('id')
    .single();

  if (error) throw error;
  return inserted!.id as string;
}

export async function createCalendarEvent(
  orderId: string,
  opts: {
    start: string;
    end: string;
    technicianId?: string | null;
    address?: string | null;
    description?: string | null;
  }
) {
  const event = {
    service_order_id: orderId,
    start_time: opts.start,
    end_time: opts.end,
    technician_id: opts.technicianId || null,
    address: opts.address || '',
    description: opts.description || '',
    client_name: '',
    technician_name: '',
    status: 'scheduled',
  };
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}
