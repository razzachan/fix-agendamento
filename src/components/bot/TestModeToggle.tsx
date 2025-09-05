import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getWebhookBaseSync, ensureWebhookBase } from './webhookBase';

export default function TestModeToggle(){
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [allowed, setAllowed] = useState<string[]>([]);

  const base = () => getWebhookBaseSync();

  const refresh = async () => {
    try {
      const res = await fetch(`${base()}/test-mode/status`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(!!data.enabled);
        setAllowed(Array.isArray(data.allowed) ? data.allowed : []);
      }
    } catch (e) { console.warn('[TestMode] status error', e); }
  };

  const toggle = async () => {
    setLoading(true);
    try {
      const url = `${base()}/test-mode/${enabled ? 'disable' : 'enable'}`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        setEnabled(!enabled);
        toast.success(`Modo de teste ${enabled ? 'desativado' : 'ativado'}`);
      } else {
        toast.error('Falha ao alternar modo de teste');
      }
    } catch (e) {
      toast.error('Erro ao alternar modo de teste');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    ensureWebhookBase().then(refresh);
  }, []);

  return (
    <div className="p-3 border rounded bg-blue-50 text-blue-900 space-y-2">
      <div className="flex items-center gap-2">
        <Switch id="test-mode" checked={enabled} onCheckedChange={toggle} disabled={loading} />
        <Label htmlFor="test-mode">Modo de Teste (apenas número whitelisted)</Label>
      </div>
      <div className="text-xs text-muted-foreground">
        Permitidos: {allowed && allowed.length ? allowed.join(', ') : '48991962111'} (com ou sem DDI 55)
      </div>
    </div>
  );
}

