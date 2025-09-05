import { z } from 'zod';
import { processConfirmation } from './modules/confirmacaoAgendamento.js';
import { processStatus } from './modules/status.js';
import { processFAQ } from './modules/faq.js';
import { processGarantia } from './modules/garantia.js';
import { processFeedback } from './modules/feedback.js';
import { tryHandleByFlows } from './flowEngine.js';
import { extractSenderPhone } from './whatsapp.js';

const EntrySchema = z.any(); // WhatsApp payload é extenso; validamos internamente por tipo

export async function handleIncoming(payload: unknown) {
  const data = EntrySchema.parse(payload);
  // Simplificação: detectar rapidamente pelo texto
  const message = extractText(data);
  const lowered = message.toLowerCase();

  // Primeiro, tentar flows configuráveis (MVP: keyword → send_template)
  const to = extractSenderPhone(data);
  if (to) {
    const handled = await tryHandleByFlows(to, message);
    if (handled) return { ok: true, by: 'flow' };
  }

  if (looksLikeConfirmation(data)) {
    return processConfirmation(data);
  }
  if (lowered.includes('status') || lowered.includes('acompanhar')) {
    return processStatus(data);
  }
  if (lowered.includes('garantia')) {
    return processGarantia(data);
  }
  if (lowered.includes('feedback') || lowered.includes('avaliar')) {
    return processFeedback(data);
  }
  return processFAQ(data);
}

function extractText(body: any): string {
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return '';
    if (msg.type === 'text') return msg.text?.body || '';
    if (msg.type === 'audio') return '[AUDIO]';
    if (msg.type === 'image') return '[IMAGE]';
    if (msg.type === 'video') return '[VIDEO]';
    return '';
  } catch {
    return '';
  }
}

function looksLikeConfirmation(body: any): boolean {
  // Placeholder: no real WhatsApp payload check; será substituído por estado de conversa
  const txt = extractText(body).toLowerCase();
  return txt.includes('confirmo') || txt.includes('confirmar agendamento');
}
