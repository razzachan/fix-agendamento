import { supabase } from '../config/supabase.js';

export async function logDecision(entity, entity_id, action, details){
  try {
    const payload = { entity, entity_id, action, details, created_at: new Date().toISOString() };
    await supabase.from('decision_logs').insert(payload);
  } catch (e) {
    console.warn('[decisionLog] failed', e?.message);
  }
}

export default { logDecision };

