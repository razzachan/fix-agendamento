import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ensureWebhookBase, getWebhookBaseSync } from './webhookBase';

export default function StatusBar(){
  const [paused, setPaused] = useState<boolean>(false);
  const [wa, setWa] = useState<{connected:boolean; me?:{id:string}}|null>(null);
  const [loading, setLoading] = useState(false);

  const webhookAIBase = () => getWebhookBaseSync();

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        fetch(`${webhookAIBase()}/pause/status`).then(r=>r.json()).catch(()=>({paused:false})),
        fetch(`${webhookAIBase()}/whatsapp/status`).then(r=>r.json()).catch(()=>({connected:false}))
      ]);
      setPaused(!!p?.paused);
      (window as any).__BOT_GLOBAL_PAUSED = !!p?.paused;
      setWa({ connected: !!w?.connected, me: w?.me });
      // notifica filhos para sincronizar
      window.dispatchEvent(new CustomEvent('webhook-status-updated'));
    } finally { setLoading(false); }
  };

  const pause = async () => { await fetch(`${webhookAIBase()}/pause/pause`, { method: 'POST' }); await refreshAll(); };
  const resume = async () => { await fetch(`${webhookAIBase()}/pause/resume`, { method: 'POST' }); await refreshAll(); };

  useEffect(()=>{ ensureWebhookBase().then(refreshAll); }, []);

  return (
    <div className="flex flex-col gap-2 p-3 border rounded">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={paused ? 'destructive' : 'default'}>
            Bot global: {paused ? 'Pausado' : 'Ativo'}
          </Badge>
          {paused ? (
            <Button size="sm" variant="outline" onClick={resume} disabled={loading} title="Despausa o bot para todas as conversas">
              {loading ? '...' : 'Despausar bot (global)'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={pause} disabled={loading} title="Pausa o bot para todas as conversas">
              {loading ? '...' : 'Pausar bot (global)'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={wa?.connected ? 'default' : 'secondary'}>
            WhatsApp: {wa?.connected ? `Conectado${wa?.me?.id ? ' como '+wa.me.id : ''}` : 'Desconectado'}
          </Badge>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading} title="Atualiza bot global e WhatsApp">
          {loading ? 'Atualizando...' : 'Atualizar tudo'}
        </Button>
      </div>
      {paused && (
        <div className="text-sm text-red-900 bg-red-50 p-2 rounded">
          Bot pausado globalmente. Nenhuma conversa será respondida até despausar.
        </div>
      )}
    </div>
  );
}

