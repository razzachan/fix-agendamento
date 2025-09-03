import { useEffect, useState } from 'react';

export default function GlobalPauseBanner(){
  const [paused, setPaused] = useState<boolean>(false);

  const webhookAIBase = () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3100';
    return `http://${host}:3100`;
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${webhookAIBase()}/pause/status`);
      const data = await res.json();
      setPaused(!!data?.paused);
    } catch {}
  };

  useEffect(()=>{ refresh(); const i=setInterval(refresh,10000); return ()=>clearInterval(i); },[]);

  if (!paused) return null;
  return (
    <div className="mb-3 p-3 border rounded bg-red-50 text-red-900 text-sm">
      Bot pausado globalmente. Nenhuma conversa será respondida até despausar.
    </div>
  );
}

