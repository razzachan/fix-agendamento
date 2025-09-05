import { supabase } from './supabase.js';

export async function getIntents() {
  const { data, error } = await supabase.from('bot_intents').select('*').order('name');
  if (error) return [];
  return data || [];
}
