import React, { useEffect, useState } from 'react';
import { webhookAIBase } from '@/lib/urls';


export default function WhatsApp() {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${webhookAIBase()}/whatsapp/status`);
      const data = await res.json();
      setStatus(data);
    } catch {}
  };

  const fetchQr = async () => {
    try {
      const res = await fetch(`${webhookAIBase()}/whatsapp/qr`);
      if (res.status === 204) { setQr(null); return; }
      const data = await res.json();
      setQr(data.qr);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const i = setInterval(() => { fetchStatus(); fetchQr(); }, 3000);
    return () => clearInterval(i);
  }, []);

  const doLogout = async () => {
    await fetch(`${webhookAIBase()}/whatsapp/logout`, { method: 'POST' });
    setQr(null); setStatus(null);
    await fetchStatus(); await fetchQr();
  };

  const doConnect = async () => {
    await fetch(`${webhookAIBase()}/whatsapp/connect`, { method: 'POST' });
    await fetchStatus(); await fetchQr();
  };

  const restartWebhook = async () => {
    try {
      const res = await fetch(`${webhookAIBase()}/restart`, { method: 'POST' });
      if (res.ok) {
        alert('Webhook reiniciado com sucesso! Aguarde alguns segundos para reconectar.');
        setTimeout(() => {
          fetchStatus();
          fetchQr();
        }, 3000);
      } else {
        alert('Erro ao reiniciar webhook');
      }
    } catch (e) {
      alert('Erro ao reiniciar webhook: ' + e);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Conexão WhatsApp (QR Code)</h1>
      <p>Status: {status?.connected ? 'Conectado' : 'Desconectado'}</p>
      {status?.me && <p>Conectado como: {status.me?.id}</p>}

      {!status?.connected && (
        <div>
          <p>Escaneie o QR abaixo no seu WhatsApp (Aparelhos Conectados):</p>
          {qr ? <img src={qr} alt="QR" style={{ width: 300 }} /> : <p>Gerando QR...</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={restartWebhook}
          style={{
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          🔄 Reiniciar Webhook
        </button>
        <button onClick={() => fetch(`${webhookAIBase()}/whatsapp/reset`, { method: 'POST' })}>
          Resetar conexão
        </button>
        <button onClick={doLogout}>
          Desconectar
        </button>
        {!status?.connected && (
          <button onClick={doConnect}>
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}

