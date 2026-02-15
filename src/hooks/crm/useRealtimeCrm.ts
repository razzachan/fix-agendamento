import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeCrm() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('crm_leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pre_schedules',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['crm_metrics'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
