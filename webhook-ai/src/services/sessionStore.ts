import { supabase } from './supabase.js';

export type SessionRecord = { id: string; channel: string; peer_id: string; state?: any };

export async function getOrCreateSession(channel: string, peer_id: string): Promise<SessionRecord> {
  // try find existing
  try {
    const { data: existing } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('channel', channel)
      .eq('peer_id', peer_id)
      .limit(1)
      .single();
    if (existing) return existing as SessionRecord;
  } catch (e) {
    // .single() throws when no records found, which is expected
  }

  // create
  const payload = { channel, peer_id, state: {} } as any;
  const { data } = await supabase.from('bot_sessions').insert(payload).select().single();
  return data as SessionRecord;
}

export async function setSessionState(session_id: string, state: any) {
  // Merge com estado existente para não perder flags como "greeted"
  try {
    const { data: existing } = await supabase
      .from('bot_sessions')
      .select('state')
      .eq('id', session_id)
      .single();
    const prev = (existing as any)?.state || {};
    const next = { ...prev, ...(state || {}) };
    await supabase.from('bot_sessions').update({ state: next }).eq('id', session_id);
  } catch {
    // Fallback: tenta salvar do jeito antigo
    await supabase.from('bot_sessions').update({ state }).eq('id', session_id);
  }
}

export async function logMessage(
  session_id: string,
  direction: 'in' | 'out',
  body: string,
  meta?: any
) {
  await supabase.from('bot_messages').insert({ session_id, direction, body, meta: meta || null });
}


export async function resetSessionStateByPeer(channel: string, peer_id: string) {
  // Zera somente o estado; mantém o registro da sessão
  try {
    const { data } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('channel', channel)
      .eq('peer_id', peer_id)
      .single();
    const id = (data as any)?.id;
    if (id) {
      await supabase.from('bot_sessions').update({ state: {} }).eq('id', id);
    }
  } catch (e) {
    // ignora
  }
}
