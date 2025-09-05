import { z } from 'zod';

const ItemSchema = z.object({
  equipmentType: z.string().optional().default(''),
  equipmentModel: z.string().optional().nullable(),
  equipmentSerial: z.string().optional().nullable(),
  clientDescription: z.string().optional().default(''),
  serviceAttendanceType: z.enum(['em_domicilio','coleta_conserto','coleta_diagnostico']).optional(),
  serviceValue: z.string().optional().default('')
});

const CanonicalSchema = z.object({
  client: z.object({
    name: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    id: z.string().optional().nullable()
  }),
  address: z.object({
    full: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable()
  }).optional(),
  attendanceType: z.enum(['em_domicilio','coleta_conserto','coleta_diagnostico']).optional(),
  description: z.string().optional(),
  items: z.array(ItemSchema),
  scheduling: z.object({
    chosen: z.object({ start: z.string(), end: z.string(), technicianId: z.string().optional().nullable() }).optional(),
  }).optional(),
});

export function mapLegacyConfirmation(body: any) {
  const p = body?.payload || body;
  const toItems = () => {
    const items: any[] = [];
    for (let i=1;i<=5;i++) {
      const eq = p[`equipamento_${i}`] || p[`equipment_${i}`];
      const val = p[`valor_os${i}`] || p[`valor_${i}`];
      if (!eq && !val) continue;
      items.push({
        equipmentType: String(eq || ''),
        equipmentModel: p[`modelo_${i}`] || null,
        equipmentSerial: p[`serie_${i}`] || null,
        clientDescription: p[`descricao_${i}`] || p['descricao'] || '',
        serviceAttendanceType: p[`service_attendance_type_${i}`] || p['service_attendance_type'],
        serviceValue: String(val || '')
      });
    }
    if (items.length === 0) {
      items.push({
        equipmentType: String(p['equipamento'] || p['equipment'] || ''),
        equipmentModel: p['modelo'] || null,
        equipmentSerial: p['serie'] || null,
        clientDescription: p['descricao'] || '',
        serviceAttendanceType: p['service_attendance_type'],
        serviceValue: String(p['valor_os'] || p['valor'] || '')
      });
    }
    return items;
  };

  const canonical = {
    client: {
      name: p['nome'] || p['client_name'] || '',
      phone: p['telefone'] || p['client_phone'] || '',
      id: p['client_id'] || null
    },
    address: {
      full: p['endereco'] || p['pickup_address'] || null,
      city: p['cidade'] || p['pickup_city'] || null,
      state: p['estado'] || p['pickup_state'] || null,
      zip: p['cep'] || p['pickup_zip_code'] || null
    },
    attendanceType: p['service_attendance_type'] || p['tipo_servico'] || undefined,
    description: p['descricao'] || p['description'] || undefined,
    items: toItems(),
    scheduling: {
      chosen: p['chosen_option_id'] ? lookupOption(p, p['chosen_option_id']) : undefined
    }
  };
  return CanonicalSchema.parse(canonical);
}

function lookupOption(p: any, chosen: any) {
  // Simplificado: assumir que já vêm start/end como strings ISO
  const start = p[`opcao_${chosen}_start`] || p[`opcao_${chosen}_inicio`] || p['start_time'];
  const end = p[`opcao_${chosen}_end`] || p[`opcao_${chosen}_fim`] || p['end_time'];
  const technicianId = p[`opcao_${chosen}_technician_id`] || p['technician_id'] || null;
  if (!start || !end) return undefined;
  return { start: String(start), end: String(end), technicianId: technicianId ? String(technicianId) : null };
}

