// Utilities to discover and cache the Webhook-AI base URL

const KEY = 'webhookAIBase';

function defaultBase() {
  const env = (import.meta as any)?.env?.VITE_WEBHOOK_AI_BASE as string | undefined;
  if (env) return env;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3100';
  return `http://${host}:3100`;
}

export function getWebhookBaseSync(): string {
  return localStorage.getItem(KEY) || defaultBase();
}

async function isReachable(base: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, { signal });
    return res.ok;
  } catch { return false; }
}

export async function ensureWebhookBase(): Promise<string> {
  const saved = localStorage.getItem(KEY);
  const candidates: string[] = [];
  if (saved) candidates.push(saved);
  const env = (import.meta as any)?.env?.VITE_WEBHOOK_AI_BASE as string | undefined;
  if (env) candidates.push(env);
  const host = window.location.hostname;
  candidates.push(`http://${host}:3100`);
  candidates.push('http://localhost:3100');
  candidates.push('http://127.0.0.1:3100');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    for (const base of candidates) {
      if (await isReachable(base, controller.signal)) {
        localStorage.setItem(KEY, base);
        return base;
      }
    }
  } finally { clearTimeout(timer); }
  const base = defaultBase();
  localStorage.setItem(KEY, base);
  return base;
}

