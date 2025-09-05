import { z } from 'zod';
import { supabase } from '../supabase.js';
import { upsertServiceOrder, createCalendarEvent } from '../orders.js';
import { applyCostRules } from '../orchestrator.js';
import { mapLegacyConfirmation } from '../payloadAdapters/confirmacaoAdapter.js';

export async function processConfirmation(body: any) {
  // 1) Mapear payload legado -> canônico
  const canonical = mapLegacyConfirmation(body);

  // 2) Para cada item (1 OS por equipamento)
  const created: Array<{ orderId: string; eventId?: string }> = [];
  for (const item of canonical.items) {
    // Criar OS
    const orderId = await upsertServiceOrder({
      client: canonical.client,
      address: canonical.address,
      item,
      attendanceType: item.serviceAttendanceType || canonical.attendanceType,
      description: item.clientDescription || canonical.description || '',
    });

    // Aplicar regras de custo
    await applyCostRules(orderId, {
      attendanceType: item.serviceAttendanceType || canonical.attendanceType,
      itemValue: item.serviceValue,
      mode: 'on_create',
    });

    // Criar evento de agenda
    if (canonical.scheduling?.chosen) {
      const eventId = await createCalendarEvent(orderId, {
        start: canonical.scheduling.chosen.start,
        end: canonical.scheduling.chosen.end,
        technicianId: canonical.scheduling.chosen.technicianId,
        address: canonical.address?.full,
        description: item.clientDescription || canonical.description || '',
      });
      created.push({ orderId, eventId });
    } else {
      created.push({ orderId });
    }
  }

  // 3) Retornar algo para logs externos
  return { ok: true, created };
}
