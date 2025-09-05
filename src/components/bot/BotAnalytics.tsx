import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { SectionHint } from '@/components/ui/section-hint';


export function BotAnalytics() {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState<{conversations:number;closed:number;appointments:number;resolutionRate:number}|null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const base = (window as any).__API_URL__ || (import.meta as any).env?.VITE_API_URL || '';
      const qs2 = new URLSearchParams();
      if (from) qs2.set('from', from);
      if (to) qs2.set('to', to);
      if (contact) qs2.set('contact', contact);
      const t = await fetch(`${base}/api/analytics/threads?${qs2.toString()}`);
      const td = await t.json();
      const error = !t.ok;
      const data = td?.items || [];

      // KPIs
      try {
        const base = (window as any).__API_URL__ || (import.meta as any).env?.VITE_API_URL || '';
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        const resp = await fetch(`${base}/api/analytics/kpis?${qs.toString()}`);
        const kd = await resp.json();
        if (kd?.ok) setKpis({ conversations: kd.conversations, closed: kd.closed, appointments: kd.appointments, resolutionRate: kd.resolutionRate });
      } catch {}

      if (!error) setThreads(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Conversas do bot em um só lugar"
          description="Filtre por período e contato para revisar atendimentos. Em breve: métricas de conversão e funil."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Conversas</div>
            <div className="text-2xl font-semibold" id="kpi-conv">{kpis?.conversations ?? '—'}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Fechadas</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>{ const d=new Date(); d.setHours(0,0,0,0); setFrom(d.toISOString()); setTo(''); }}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={()=>{ const d=new Date(); const toS=d.toISOString(); d.setDate(d.getDate()-7); setFrom(d.toISOString()); setTo(toS); }}>7 dias</Button>
          <Button variant="outline" size="sm" onClick={()=>{ const d=new Date(); const toS=d.toISOString(); d.setDate(d.getDate()-30); setFrom(d.toISOString()); setTo(toS); }}>30 dias</Button>
        </div>

            <div className="text-2xl font-semibold" id="kpi-closed">{kpis?.closed ?? '—'}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Agendamentos</div>
            <div className="text-2xl font-semibold" id="kpi-appointments">{kpis?.appointments ?? '—'}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Resolução</div>
            <div className="text-2xl font-semibold" id="kpi-resolution">{kpis ? `${kpis.resolutionRate}%` : '—%'}</div>
          </div>
            <div className="text-xs text-muted-foreground">Feche conversas concluídas para melhorar a taxa de resolução.</div>
        <div className="space-y-2">
          {threads.map((t: any) => (
            <div key={t.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{t.channel} • {t.contact} • {new Date(t.started_at).toLocaleString('pt-BR')}</div>
                <div className="mt-2 text-xs">{t.closed_at ? 'Fechada' : 'Aberta'}</div>
              </div>
              {!t.closed_at && (
                <Button size="sm" variant="outline" onClick={async ()=>{
                  await fetch(`/api/analytics/threads/${t.id}/close`, { method:'POST' });
                  await load();
                }}>Fechar conversa</Button>
              )}
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Abaixo, as mensagens detalhadas por conversa (visão completa).</div>


        </div>

        <CardTitle>Analytics & Histórico</CardTitle>
        <CardDescription>Conversas recentes e filtros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>De</Label>
            <Input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Contato</Label>
            <Input value={contact} onChange={e => setContact(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={load} disabled={loading}>{loading ? 'Carregando...' : 'Filtrar'}</Button>
          </div>
        </div>

        <div className="space-y-3">
          {threads.map((t: any) => (
            <div key={t.id} className="p-3 border rounded">
              <div className="text-sm text-muted-foreground">{t.channel} • {t.contact} • {new Date(t.started_at).toLocaleString('pt-BR')}</div>
              <div className="mt-2 space-y-1">
                {t.conversation_messages?.map((m: any) => (
                  <div key={m.id} className="text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded ${m.direction === 'inbound' ? 'bg-muted' : 'bg-primary/10'}`}>
                      {m.direction}
                    </span>
                    <span className="ml-2 whitespace-pre-wrap">{m.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

