import { supabase } from './supabase.js';
import { logger } from './logger.js';

export type AnalyticsEvent = {
  type: string;
  ts?: string;
  session_id?: string | null;
  from?: string | null;
  channel?: string | null;
  data?: any;
};

const TABLE = 'bot_analytics_events';

export async function logEvent(evt: AnalyticsEvent) {
  const row = {
    type: evt.type,
    ts: evt.ts || new Date().toISOString(),
    session_id: evt.session_id || null,
    from: evt.from || null,
    channel: evt.channel || null,
    data: evt.data || null,
  } as any;
  try {
    // Falha silenciosa se não houver supabase/config
    await supabase.from(TABLE).insert(row);
  } catch (e) {
    // Em ambiente local/CI sem DB, apenas loga
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[analytics.fallback]', row);
    }
  }
}

