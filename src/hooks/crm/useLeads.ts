import { useQuery } from '@tanstack/react-query';
import type { Lead } from '@/types/crm';
import { crmFetchJson } from './crmApi';

export interface LeadsFilters {
  status?: string;
  crm_status?: string;
  score_min?: number;
  score_max?: number;
  limit?: number;
  page?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
  created_from?: string;
  created_to?: string;
  search?: string;
}

type LeadsResponse = { success: boolean; count: number; total: number; leads: Lead[] };

export function useLeads(filters: LeadsFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        qs.set(k, String(v));
      });
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return crmFetchJson<LeadsResponse>(`/api/leads${suffix}`);
    },
  });
}
