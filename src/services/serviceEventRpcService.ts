
import { supabase } from '@/integrations/supabase/client';

/**
 * Gets diagnosis events for a specific service order using an RPC function
 * This bypasses RLS restrictions by using a SECURITY DEFINER function
 */
const getDiagnosisEventsRpc = async (serviceOrderId: string) => {
  try {
    const timestamp = Date.now();
    
    // Call the RPC function to get diagnosis events
    const { data, error } = await supabase
      .rpc('get_diagnosis_events', { 
        p_service_order_id: serviceOrderId 
      })
      .setHeader('cache-control', 'no-cache')
      .setHeader('x-timestamp', `${timestamp}`);
      
    if (error) {
      console.error('Error fetching diagnosis events via RPC:', error);
      return [];
    }
    
    console.log(`RPC returned ${data?.length || 0} diagnosis events:`, data);
    return data || [];
  } catch (error) {
    console.error('Exception in getDiagnosisEventsRpc:', error);
    return [];
  }
};

export const serviceEventRpcService = {
  getDiagnosisEventsRpc
};
