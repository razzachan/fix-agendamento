import { supabase } from '@/integrations/supabase/client';
import { PushSubscriptionPayload } from './pushSubscriptionService';

export async function savePushSubscription(userId: string, subscription: PushSubscriptionPayload) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    .select('*');

  if (error) throw error;
  return data;
}

