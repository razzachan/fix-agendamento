import { sendText, extractSenderPhone, extractText } from '../whatsapp.js';
import { getTemplates, renderTemplate } from '../botConfig.js';
import { logInbound, logOutbound } from '../conversation.js';

export async function processFAQ(body: any) {
  const to = extractSenderPhone(body);
  if (!to) return { ok: false };

  // Log inbound
  const received = extractText(body) || '';
  await logInbound(to, received);

  // Buscar template configurado (fallback/greeting)
  const templates = await getTemplates();
  const greeting = templates.find((t: any) => t.key === 'greeting');
  if (greeting?.content) {
    const txt = renderTemplate(greeting.content, {});
    await sendText(to, txt);
    await logOutbound(to, txt);
    return { ok: true, template: 'greeting' };
  }

  // Padrão caso não haja template
  const fallback =
    'Como posso ajudar? Opções:\n1) Orçamento\n2) Status de Ordem\n3) Garantia\n4) Falar com humano';
  await sendText(to, fallback);
  await logOutbound(to, fallback);
  return { ok: true, template: 'default' };
}
