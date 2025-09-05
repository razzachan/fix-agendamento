import { supabase } from '../supabase.js';
import { sendText, extractSenderPhone, normalizePhone } from '../whatsapp.js';
import { getTemplates, renderTemplate } from '../botConfig.js';
import { logInbound, logOutbound } from '../conversation.js';

export async function processStatus(body: any) {
  const to = extractSenderPhone(body);
  if (!to) return { ok: false, reason: 'no_phone' };
  await logInbound(to, body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '');

  const normalized = normalizePhone(to) || '';
  const last8 = normalized.slice(-8);

  // Buscar últimas 3 OS do cliente pelo telefone
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, order_number, status, equipment_type, created_at, scheduled_date, final_cost')
    .ilike('client_phone', `%${last8}%`)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[Status] DB error', error);
    await sendText(
      to,
      'Tive um problema ao consultar seu status agora. Tente novamente em instantes.'
    );
    return { ok: false, reason: 'db_error' };
  }

  if (!data || data.length === 0) {
    await sendText(
      to,
      'Não localizei uma OS pelo seu número. Me envie o número da OS (ex.: OS #123) ou o CPF/CNPJ para eu localizar.'
    );
    return { ok: true, found: 0 };
  }

  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString('pt-BR') : '—');
  const lines = data.map((o: any) => {
    const on = o.order_number ? `OS ${o.order_number}` : `OS ${o.id.slice(0, 8)}`;
    const sched = fmt(o.scheduled_date);
    const val = o.final_cost ? ` | Total: R$ ${Number(o.final_cost).toFixed(2)}` : '';
    return `${on} • ${o.equipment_type || 'Equipamento'} • Status: ${o.status}${val} • Agendado: ${sched}`;
  });

  const msg = ['Aqui está o status das suas últimas solicitações:', ...lines].join('\n');

  // Tentar template customizado 'status_latest_orders'
  const templates = await getTemplates();
  const tpl = templates.find((t: any) => t.key === 'status_latest_orders');
  if (tpl?.content) {
    const bodyTxt = renderTemplate(tpl.content, { lines: lines.join('\n') });
    await sendText(to, bodyTxt);
    await logOutbound(to, bodyTxt);
    return { ok: true, found: data.length, template: 'status_latest_orders' };
  }

  await sendText(to, msg);
  await logOutbound(to, msg);
  return { ok: true, found: data.length, template: 'default' };
}
