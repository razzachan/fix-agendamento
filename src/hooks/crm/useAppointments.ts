import { useQuery } from '@tanstack/react-query';
import { crmFetchJson } from './crmApi';

export interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  phone: string | null;
  equipment_type: string | null;
  description: string | null;
  status: string;
  technician?: { id: string | null; name: string | null };
  service_order_id?: string | null;
}

type Resp = { ok: boolean; appointments: Appointment[] };

export function useAppointments(filters: { date_from?: string; date_to?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        qs.set(k, String(v));
      });
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return crmFetchJson<Resp>(`/api/bot/tools/listAppointments${suffix}`);
    },
  });
}
