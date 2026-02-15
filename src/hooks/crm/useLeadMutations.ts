import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead, CrmStatus } from '@/types/crm';
import { crmFetchJson } from './crmApi';

type UpdateStatusResponse = { success: boolean; lead: Lead };
type AddNoteResponse = { success: boolean; lead: Lead };

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; crm_status: CrmStatus; notes?: string; crm_score?: number }) => {
      const { id, ...body } = payload;
      return crmFetchJson<UpdateStatusResponse>(`/api/leads/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead', { id: variables.id }] });
      await queryClient.invalidateQueries({ queryKey: ['crm_metrics'] });
    },
  });
}

export function useAddLeadNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; note: string; author?: string }) => {
      const { id, ...body } = payload;
      return crmFetchJson<AddNoteResponse>(`/api/leads/${encodeURIComponent(id)}/notes`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead', { id: variables.id }] });
    },
  });
}
