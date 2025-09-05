import { sendText, extractSenderPhone } from '../whatsapp.js';
import { getTemplates, renderTemplate } from '../botConfig.js';
import { logInbound, logOutbound } from '../conversation.js';

export async function processFeedback(body: any) {
  const to = extractSenderPhone(body);
  if (!to) return { ok: false };
  await logInbound(to, (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) || '');

  const templates = await getTemplates();
  const tpl = templates.find((t: any) => t.key === 'feedback_request');
  if (tpl?.content) {
    const bodyTxt = renderTemplate(tpl.content, {});
    await sendText(to, bodyTxt);
    await logOutbound(to, bodyTxt);
    return { ok: true, template: 'feedback_request' };
  }

  const fallback = 'Avalie nosso atendimento de 1 a 5 (pode responder com o número).';
  await sendText(to, fallback);
  await logOutbound(to, fallback);
  return { ok: true, template: 'default' };
}

