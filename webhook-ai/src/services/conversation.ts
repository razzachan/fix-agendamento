import { supabase } from './supabase.js';
import { getActiveBot } from './botConfig.js';

export async function ensureThread(contact: string, channel: 'whatsapp' | 'web' = 'whatsapp') {
  const bot = await getActiveBot();
  if (!bot) return null;
  const bot_id = bot.id;

  const { data: existing } = await supabase
    .from('conversation_threads')
    .select('id')
    .eq('bot_id', bot_id)
    .eq('contact', contact)
    .eq('channel', channel)
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('conversation_threads')
    .insert({ bot_id, contact, channel })
    .select('id')
    .single();
  if (error) {
    console.error('[conversation] create thread error', error);
    return null;
  }
  return data.id as string;
}

export async function logInbound(contact: string, content: string) {
  const threadId = await ensureThread(contact, 'whatsapp');
  if (!threadId) return;
  await supabase.from('conversation_messages').insert({
    thread_id: threadId,
    direction: 'inbound',
    type: 'text',
    content,
  });
}

export async function logOutbound(contact: string, content: string) {
  const threadId = await ensureThread(contact, 'whatsapp');
  if (!threadId) return;
  await supabase.from('conversation_messages').insert({
    thread_id: threadId,
    direction: 'outbound',
    type: 'text',
    content,
  });
}

export async function closeThread(contact: string) {
  const bot = await getActiveBot();
  if (!bot) return;
  const bot_id = bot.id;
  const { data: thread } = await supabase
    .from('conversation_threads')
    .select('id')
    .eq('bot_id', bot_id)
    .eq('contact', contact)
    .eq('channel', 'whatsapp')
    .is('closed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!thread?.id) return;
  await supabase
    .from('conversation_threads')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', thread.id);
}
