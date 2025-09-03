import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalPauseToggle(){
  const [paused, setPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const webhookAIBase = () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3100';
    return `http://${host}:3100`;
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${webhookAIBase()}/pause/status`);
      const data = await res.json();
      setPaused(!!data?.paused);
    } catch {}
    finally { setLoading(false); }
  };
  const doPause = async () => { setLoading(true); try { await fetch(`${webhookAIBase()}/pause/pause`, { method: 'POST' }); await refresh(); } finally { setLoading(false); } };
  const doResume = async () => { setLoading(true); try { await fetch(`${webhookAIBase()}/pause/resume`, { method: 'POST' }); await refresh(); } finally { setLoading(false); } };

  useEffect(()=>{ refresh(); },[]);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${paused ? 'bg-red-500' : 'bg-green-500'}`}></div>
      <span className="text-sm">{paused ? 'Bot global: pausado' : 'Bot global: ativo'}</span>
      {paused ? (
        <Button variant="outline" size="sm" onClick={doResume} disabled={loading}>
          {loading ? '...' : 'Despausar bot (global)'}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={doPause} disabled={loading}>
          {loading ? '...' : 'Pausar bot (global)'}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
        {loading ? 'Atualizando...' : 'Atualizar status (global)'}
      </Button>
    </div>
  );
}

