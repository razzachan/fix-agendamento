import { useQuery } from '@tanstack/react-query';
import type { Lead } from '@/types/crm';
import { crmFetchJson } from './crmApi';

type LeadResponse = { success: boolean; lead: Lead };

export function useLead(id?: string) {
  return useQuery({
    queryKey: ['lead', { id }],
    enabled: Boolean(id),
    queryFn: async () => {
      return crmFetchJson<LeadResponse>(`/api/leads/${encodeURIComponent(String(id))}`);
    },
  });
}
