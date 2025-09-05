import { supabase } from './supabase.js';
import { getActiveBot, getTemplates, renderTemplate } from './botConfig.js';
import { sendText } from './whatsapp.js';

async function resolveContextVars(to: string){
  const phone = to;
  let name = '';
  try {
    // tenta clientes pelo final do telefone
    const norm = (to || '').replace(/\D/g, '');
    const last8 = norm.slice(-8);
    const { data: c } = await supabase
      .from('clients')
      .select('name, phone')
      .ilike('phone', `%${last8}%`)
      .limit(1)
      .maybeSingle();
    if (c?.name) name = c.name;
    if (!name) {
      const { data: so } = await supabase
        .from('service_orders')
        .select('client_name, client_phone')
        .ilike('client_phone', `%${last8}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (so?.client_name) name = so.client_name;
    }
  } catch {}
  return { phone, contact: phone, name } as Record<string,string>;
}

export async function tryHandleByFlows(to: string, message: string) {
  const bot = await getActiveBot();
  if (!bot) return false;

  const { data: flows, error } = await supabase
    .from('bot_flows')
    .select('*')
    .eq('bot_id', bot.id)
    .eq('enabled', true);
  if (error || !flows || flows.length === 0) return false;

  // Match simples por keyword
  const lower = message.toLowerCase();
  const match = flows.find((f: any) => (f.trigger?.type === 'keyword') && lower.includes(String(f.trigger?.value || '').toLowerCase()));
  if (!match) return false;

  // MVP+: primeira ação: send_template ou execute_tool
  const step = match.steps?.[0];
  if (!step) return false;

  if (step.action === 'send_template') {
    const templates = await getTemplates();
    const tpl = templates.find((t: any) => t.key === step.params?.key);
    if (!tpl) return false;
    // Suporte opcional a variáveis do template
    let vars: Record<string,string> = {};
    try { if (step.params?.vars) vars = JSON.parse(String(step.params.vars)); } catch {}
    const context = await resolveContextVars(to);
    const body = renderTemplate(tpl.content, { ...context, ...vars });
    await sendText(to, body);
    return true;
  }

  if (step.action === 'execute_tool') {
    try {
      const tool = String(step.params?.tool || '').trim();
      if (!tool) return false;
      let inputStr = String(step.params?.input || '{}');
      // Suporte a placeholders simples
      const today = new Date().toISOString().slice(0,10);
      inputStr = inputStr.replace(/\{\{\s*today\s*\}\}/g, today);
      const ctx = await resolveContextVars(to);
      inputStr = inputStr.replace(/\{\{\s*phone\s*\}\}/g, ctx.phone || '');
      inputStr = inputStr.replace(/\{\{\s*name\s*\}\}/g, ctx.name || '');
      const input = JSON.parse(inputStr);
      const { tryExecuteToolByName } = await import('./toolExecutorByName.js');
      const result = await tryExecuteToolByName(tool, input);
      // Feedback simples ao usuário
      const text = typeof result === 'string' ? result : 'Ação executada.';
      await sendText(to, text);
      return true;
    } catch { return false; }
  }

  return false;
}

