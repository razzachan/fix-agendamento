import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getWebhookBaseSync, ensureWebhookBase } from './webhookBase';

export default function WhatsAppConnection() {
  const [waStatus, setWaStatus] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const warnedRef = (typeof window !== 'undefined') ? (window as any).__WA_WARNED_REF ||= { warned: false } : { warned: false };

  const webhookAIBase = () => getWebhookBaseSync();

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${webhookAIBase()}/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
        setUnreachable(false);
        console.log('[WhatsApp] Status:', data);
      } else {
        console.warn('[WhatsApp] Status falhou:', res.status);
        setWaStatus({ connected: false, me: null });
        setUnreachable(true);
      }
    } catch (e) {
      console.error('[WhatsApp] Erro ao buscar status:', e);
      setWaStatus({ connected: false, me: null });
      setUnreachable(true);
      if (!warnedRef.warned) {
        toast.error('Erro ao conectar com webhook-ai. Verifique se está rodando na porta 3100.');
        warnedRef.warned = true;
      }
    }
    finally { setLoading(false); }
  };

  const refreshQr = async () => {
    try {
      const res = await fetch(`${webhookAIBase()}/whatsapp/qr`);
      if (res.status === 204) { 
        setQr(null); 
        return; 
      }
      if (res.ok) {
        const data = await res.json(); 
        setQr(data.qr);
        console.log('[WhatsApp] QR recebido');
      }
    } catch (e) {
      console.error('[WhatsApp] Erro ao buscar QR:', e);
      setQr(null);
    }
  };

  const connect = async () => {
    try {
      await fetch(`${webhookAIBase()}/whatsapp/connect`, { method: 'POST' });
      toast.success('Solicitação de conexão enviada');
      setTimeout(() => { refreshStatus(); refreshQr(); }, 1000);
    } catch (e) {
      toast.error('Erro ao solicitar conexão');
    }
  };

  const disconnect = async () => {
    try {
      await fetch(`${webhookAIBase()}/whatsapp/logout`, { method: 'POST' });
      setWaStatus({ connected: false, me: null });
      setQr(null);
      toast.success('Desconectado');
      setTimeout(() => refreshStatus(), 500);
    } catch (e) {
      toast.error('Erro ao desconectar');
    }
  };

  const sendTest = async () => {
    const to = prompt('Seu número com DDI (ex: 5511999999999):');
    if (!to) return;
    try {
      await fetch(`${webhookAIBase()}/whatsapp/send`, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ to, body: 'Mensagem de teste do Studio' }) 
      });
      toast.success('Mensagem enviada');
    } catch (e) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  useEffect(() => {
    ensureWebhookBase().then(()=>{
      refreshStatus();
      const interval = setInterval(refreshStatus, 10000); // atualiza a cada 10s
      return () => clearInterval(interval);
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da conexão */}
        <div className="flex items-center gap-2 p-3 rounded border">
          <div className={`w-3 h-3 rounded-full ${waStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {waStatus?.connected ? `Conectado como ${waStatus.me?.id || 'WhatsApp'}` : 'Desconectado'}
          </span>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={connect}
            disabled={loading}
          >
            Conectar / Gerar QR
          </Button>
          <Button
            variant="outline"
            onClick={disconnect}
            disabled={loading}
          >
            Desconectar
          </Button>
          <Button
            variant="outline"
            onClick={() => { refreshStatus(); refreshQr(); }}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Atualizar'}
          </Button>
          <Button
            variant="outline"
            onClick={sendTest}
            disabled={!waStatus?.connected || (window as any).__BOT_GLOBAL_PAUSED}
            title={!waStatus?.connected ? 'WhatsApp desconectado' : ((window as any).__BOT_GLOBAL_PAUSED ? 'Bot pausado globalmente' : '')}
          >
            Enviar Teste
          </Button>
        </div>

        {/* QR Code para conexão */}
        {!waStatus?.connected && (
          <div className="space-y-3">
            {unreachable && (
              <div className="text-sm text-red-900 bg-red-50 p-2 rounded border">
                Não foi possível alcançar o Webhook-AI em {webhookAIBase()}. Certifique-se de que está rodando e que este dispositivo consegue acessar esse IP.
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Para conectar o WhatsApp:
            </div>
            {qr ? (
              <div className="space-y-2">
                <img src={qr} alt="QR Code WhatsApp" className="w-64 border rounded bg-white p-2" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>1. Abra WhatsApp no seu celular</div>
                  <div>2. Toque em "Aparelhos conectados"</div>
                  <div>3. Toque em "Conectar um aparelho"</div>
                  <div>4. Escaneie este QR code</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 border rounded bg-gray-50">
                Clique em "Conectar / Gerar QR" para gerar o código QR
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Webhook AI: {webhookAIBase()}
        </div>
      </CardContent>
    </Card>
  );
}
