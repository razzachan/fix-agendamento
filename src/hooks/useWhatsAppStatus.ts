import { useEffect, useState } from 'react';
import { webhookAIBase } from '@/lib/urls';

export function useWhatsAppStatus(pollMs: number = 4000) {
  const [connected, setConnected] = useState<boolean>(false);
  const [me, setMe] = useState<{ id: string; pushname?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${webhookAIBase()}/whatsapp/status`, { cache: 'no-store' });
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

