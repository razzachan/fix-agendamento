import { useEffect, useState } from 'react';

export function useWhatsAppStatus(pollMs: number = 4000) {
  const [connected, setConnected] = useState<boolean>(false);
  const [me, setMe] = useState<{ id: string; pushname?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const base = (window as any).__API_URL__ || ''; const res = await fetch(`${base}/api/whatsapp/status`);
        const data = await res.json();
        if (!cancelled) {
          setConnected(!!data?.connected);
          setMe(data?.me || null);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollMs]);

  return { connected, me };
}

