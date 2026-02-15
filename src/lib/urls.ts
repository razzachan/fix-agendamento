export function backendBase() {
  const env = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (env && String(env).trim()) return String(env).trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3001`;
  }
  return 'http://localhost:3001';
}

export function webhookAIBase() {
  if (typeof window !== 'undefined') {
    const win = window as any;

    // 1. Primeiro, verifica overrides manuais
    const override = win.__WA_URL__ || (typeof localStorage !== 'undefined' && localStorage.getItem('WA_URL')) || (import.meta as any).env?.VITE_WA_URL;
    if (override) return override;

    // 2. Verifica se há configuração específica do webhook-ai
    const webhookAIBase = (import.meta as any).env?.VITE_WEBHOOK_AI_BASE;
    if (webhookAIBase) return webhookAIBase;

    // 3. Fallback: usa mesmo protocolo do front
    const host = window.location.hostname || 'localhost';
    const proto = window.location.protocol === 'https:' ? 'https' : 'http';
    // Em http, assume porta 3100 local.
    if (proto === 'http') return `http://${host}:3100`;
    return `${proto}://${host}`;
  }
  return 'http://localhost:3100';
}

