import { supabase } from '../supabase.js';
import { sendText, extractSenderPhone } from '../whatsapp.js';
import { getTemplates, renderTemplate } from '../botConfig.js';
import { logInbound, logOutbound } from '../conversation.js';

export async function processGarantia(body: any) {
  const to = extractSenderPhone(body);
  if (!to) return { ok: false, reason: 'no_phone' };
  await logInbound(to, (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) || '');

  // TODO: extrair número de OS do texto; por ora, pega última OS do cliente
  const { data } = await supabase
    .from('service_orders')
    .select('id, order_number, warranty_period, warranty_start_date, warranty_end_date, warranty_terms, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    await sendText(to, 'Não encontrei uma ordem para verificar garantia. Me informe o número da OS (ex.: OS #123).');
    return { ok: true, found: 0 };
  }

  const os = data[0];
  const msg = `Garantia da ${os.order_number || os.id.slice(0,8)}:\n- Período: ${os.warranty_period || 3} meses\n- Início: ${fmt(os.warranty_start_date) || fmt(os.created_at)}\n- Término: ${fmt(os.warranty_end_date)}\nCondições: ${os.warranty_terms || 'Conforme termos padrão da oficina.'}`;

  // Tentar template 'warranty_info'
  const templates = await getTemplates();
  const tpl = templates.find((t: any) => t.key === 'warranty_info');
  if (tpl?.content) {
    const bodyTxt = renderTemplate(tpl.content, {
      os: os.order_number || os.id.slice(0,8),
      period: String(os.warranty_period || 3),
      start: fmt(os.warranty_start_date) || fmt(os.created_at),
      end: fmt(os.warranty_end_date),
      terms: os.warranty_terms || 'Conforme termos padrão da oficina.'
    });
    await sendText(to, bodyTxt);
    await logOutbound(to, bodyTxt);
    return { ok: true, template: 'warranty_info' };
  }

  await sendText(to, msg);
  await logOutbound(to, msg);
  return { ok: true, template: 'default' };
}

function fmt(s?: string | null) { return s ? new Date(s).toLocaleDateString('pt-BR') : ''; }

