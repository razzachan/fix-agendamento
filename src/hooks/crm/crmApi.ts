import { supabase } from '@/integrations/supabase/client';

function getApiBase() {
  type WindowWithApiUrl = Window & { __API_URL__?: string };
  const fromWindow = (window as WindowWithApiUrl).__API_URL__;
  const fromVite = import.meta.env?.VITE_API_URL;

  const resolved = String(fromWindow || fromVite || '').trim();

  // Safety net: production builds should never point at localhost.
  // This prevents shipping a build that was compiled with a dev `.env`.
  if (import.meta.env?.PROD) {
    const lower = resolved.toLowerCase();
    if (!resolved || lower.includes('localhost') || lower.includes('127.0.0.1')) {
      return 'https://api.fixfogoes.com.br';
    }
  }

  return resolved;
}

function buildApiUrl(base: string, path: string): string {
  const normalizedBase = String(base || '').trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    // If base includes a path like https://host/api and path is absolute (/api/...),
    // URL() will avoid producing /api/api/... by treating the path as absolute.
    const url = new URL(normalizedPath, `${normalizedBase}/`);
    return url.toString();
  } catch {
    return `${normalizedBase}${normalizedPath}`;
  }
}

async function getAccessToken(): Promise<string | null> {
  // Legacy/manual token (some parts of the app may set this)
  const tokenFromStorage =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('authToken');

  if (tokenFromStorage) return tokenFromStorage;

  // Preferred: Supabase session token
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function crmFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error('API URL não configurada');

  const accessToken = await getAccessToken();

  const res = await fetch(buildApiUrl(base, path), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      typeof json === 'object' && json !== null
        ? (json as { message?: unknown; error?: unknown }).message || (json as { error?: unknown }).error
        : null;
    const normalized = typeof msg === 'string' ? msg : `Erro HTTP ${res.status}`;
    throw new Error(normalized);
  }

  return json as T;
}
