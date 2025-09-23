// Utilities to discover and cache the Webhook-AI base URL

const KEY = 'webhookAIBase';
const ALT_KEY = 'WA_URL'; // compat: mesma chave usada em src/lib/urls.ts

function defaultBase() {
  // 0. Overrides em runtime (sem rebuild)
  const win = (typeof window !== 'undefined') ? (window as any) : undefined;
  const runtimeOverride = win?.__WA_URL__ || (typeof localStorage !== 'undefined' && localStorage.getItem(ALT_KEY));
  if (runtimeOverride) return String(runtimeOverride);

  // 1. Primeiro, verifica se há configuração específica do webhook-ai (injetada no build)
  const env = (import.meta as any)?.env?.VITE_WEBHOOK_AI_BASE as string | undefined;
  if (env) return env;

  // 2. Fallback baseado no hostname
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3100';

  // 2.1. Host conhecido em produção (HostGator) → usa Railway
  if (host === 'app.fixfogoes.com.br') return 'https://enchanting-light-production.up.railway.app';

  // 3. Para produção, não assumir porta 3100 no mesmo host
  const proto = window.location.protocol === 'https:' ? 'https' : 'http';
  if (proto === 'http') return `http://${host}:3100`;

  // Em HTTPS, não assumir que o webhook-ai está no mesmo host
  return `${proto}://${host}`;
}

export function getWebhookBaseSync(): string {
  const win = (typeof window !== 'undefined') ? (window as any) : undefined;
  // 0. Overrides em runtime (sem rebuild)
  const runtimeOverride = win?.__WA_URL__ || (typeof localStorage !== 'undefined' && localStorage.getItem(ALT_KEY));
  if (runtimeOverride) return String(runtimeOverride);

  // 1. Priorizar variável de ambiente sempre que existir
  const env = (import.meta as any)?.env?.VITE_WEBHOOK_AI_BASE as string | undefined;
  if (env) {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== env) localStorage.setItem(KEY, env);
    } catch {}
    return env;
  }
  // 2. Salvo anteriormente
  const saved = localStorage.getItem(KEY);
  if (saved) return saved;

  // 3. Fallback
  return defaultBase();
}

async function isReachable(base: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, { signal });
    return res.ok;
  } catch { return false; }
}

export async function ensureWebhookBase(): Promise<string> {
  const candidates: string[] = [];

  const win = (typeof window !== 'undefined') ? (window as any) : undefined;
  const env = (import.meta as any)?.env?.VITE_WEBHOOK_AI_BASE as string | undefined;
  const runtimeOverride = win?.__WA_URL__ || (typeof localStorage !== 'undefined' && localStorage.getItem(ALT_KEY));

  // 0. Overrides em runtime (sem rebuild)
  if (runtimeOverride) candidates.push(String(runtimeOverride));

  // 1. Prioridade máxima: variável de ambiente VITE_WEBHOOK_AI_BASE
  if (env) candidates.push(env);

  // 2. URL salva no localStorage
  const saved = localStorage.getItem(KEY);
  if (saved) candidates.push(saved);

  // 3. Fallbacks locais e host específico
  const host = window.location.hostname;
  if (host === 'app.fixfogoes.com.br') {
    candidates.push('https://enchanting-light-production.up.railway.app');
  }
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

