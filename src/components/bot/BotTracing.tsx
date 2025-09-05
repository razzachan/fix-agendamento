import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SectionHint } from '@/components/ui/section-hint';


interface Msg { id:string; direction:string; body:string; created_at:string }

export function BotTracing(){
  const [items, setItems] = useState<Msg[]>([]);
  const [peer, setPeer] = useState('');

  async function load(){
    if (!peer) return setItems([]);
    const base = (window as any).__API_URL__ || '';
    const headers: any = {};
    try { const t = (window as any).BOT_TOKEN; if (t) headers['x-bot-token'] = t; } catch {}
    const url = `${base}/api/bot/tracing?peer=${encodeURIComponent(peer)}`;
    const resp = await fetch(url, { headers });
    const data = await resp.json().catch(()=>({ items:[] }));
    setItems(data.items || []);
  }

  useEffect(()=>{ load(); }, [peer]);

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Como usar o Tracing"
          description="Acompanhe a conversa por peer (telefone) para entender mensagens, intenções e chamadas de ferramentas. Útil para depurar comportamentos neurais."
        />

        <CardTitle>Tracing</CardTitle>
        <CardDescription>Mensagens e ações por conversa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input className="border rounded p-2 w-full" placeholder="peer id (ex.: +5511999999999)" value={peer} onChange={e=>setPeer(e.target.value)} />
        <div className="space-y-2">
          {items.map(it=> (
            <div key={it.id} className="border rounded p-2">
              <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()} • {it.direction}</div>
              <div>{it.body}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

