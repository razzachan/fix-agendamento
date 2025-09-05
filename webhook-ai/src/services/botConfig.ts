import { supabase } from './supabase.js';

const USE_MOCK = (process.env.MOCK_SUPABASE === 'true');

export async function getActiveBot() {
  if (USE_MOCK) {
    // Retorna um bot mínimo para testes, evitando chamadas reais ao Supabase
    return { id: 'test-bot', blocks: [], updated_at: new Date().toISOString(), created_at: new Date().toISOString() } as any;
  }
  // Busca a última configuração do bot (mais recente por updated_at/created_at)
  const { data, error } = await supabase
    .from('bot_configs')
    .select('*')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    console.error('[webhook-ai] bot config load error', error.message);
    return null;
  }
  return data;
}

export async function getTemplates() {
  if (USE_MOCK) {
    return [];
  }
  const { data, error } = await supabase.from('bot_templates').select('*').eq('enabled', true);
  if (error) {
    console.error('[webhook-ai] templates load error', error.message);
    return [];
  }
  return data || [];
}

export function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_m, key) => {
    return vars[key] ?? '';
  });
}

