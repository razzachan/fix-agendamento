import { waClient } from './waClient.js';
import { assertSendAllowedInTestMode } from './testMode.js';

export async function sendText(to: string, body: string) {
  // Bloqueio de segurança: se modo de teste estiver ativo, só permite números whitelisted
  assertSendAllowedInTestMode(to);
  try {
    console.log('[WA] Enviando para', to, 'texto:', body?.slice(0, 80));
    await waClient.sendText(to, body);
    return { via: 'wa-web', ok: true } as const;
  } catch (e) {
    console.error('[WA] Falha ao enviar para', to, e);
    throw e;
  }
}

export function extractSenderPhone(body: any): string | null {
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const from = msg?.from; // E.164
    return from || null;
  } catch {
    return null;
  }
}

export function extractText(body: any): string {
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

export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  return p.replace(/\D/g, '');
}

