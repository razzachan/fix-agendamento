import { useQuery } from '@tanstack/react-query';
import type { CrmMetrics } from '@/types/crm';
import { crmFetchJson } from './crmApi';

type CrmMetricsResponse = { success: boolean; metrics: CrmMetrics; period_days: number };

export function useCrmMetrics(periodDays: number = 30) {
  return useQuery({
    queryKey: ['crm_metrics', { periodDays }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (periodDays) qs.set('period_days', String(periodDays));
      return crmFetchJson<CrmMetricsResponse>(`/api/analytics/crm?${qs.toString()}`);
    },
  });
}
