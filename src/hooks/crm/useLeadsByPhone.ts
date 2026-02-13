import { useQuery } from '@tanstack/react-query';
import type { Lead, Client } from '@/types/crm';
import { crmFetchJson } from './crmApi';

type Resp = { success: boolean; leads: Lead[]; client: Client | null };

export function useLeadsByPhone(phone?: string) {
  return useQuery({
    queryKey: ['leads_by_phone', { phone }],
    enabled: Boolean(phone),
    queryFn: async () => {
      return crmFetchJson<Resp>(`/api/leads/by-phone/${encodeURIComponent(String(phone))}`);
    },
  });
}
