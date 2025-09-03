import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';
import { Badge } from '@/components/ui/badge';
import { features } from '@/config/features';
import { toast } from 'sonner';
import { BotTestBookingDialog } from './BotTestBookingDialog';


export function BotSchedule(){
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState<{start:string; end:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const [mode, setMode] = useState<'simulate'|'test'>('simulate');
  const isProd = import.meta.env.MODE === 'production';
  const [suggestionAddr, setSuggestionAddr] = useState('');
  const [suggestionEquip, setSuggestionEquip] = useState('');
  const [suggestionUrgent, setSuggestionUrgent] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const canTestBook = !isProd && features.scheduleTests;

  async function load(){
    setLoading(true);
    try {
      const base = (window as any).__API_URL__ || '';
      const resp = await fetch(`${base}/api/schedule/availability?date=${date}`);
      const data = await resp.json();
      setSlots(data.slots || []);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [date]);

  return (
    <Card>
        <SectionHint
          title="Como a disponibilidade é calculada"
          description="Os horários exibidos consideram: janelas de funcionamento, bloqueios e reservas já existentes. A reserva aqui é um teste rápido e usa o backend local."
        />
        {isProd && (
          <div className="px-6">
            <Badge variant="secondary">Somente simulação (produção)</Badge>
          </div>
        )}


      <CardHeader>
        <CardTitle>Disponibilidade (teste)</CardTitle>
        <CardDescription>Ferramenta de validação do bot — não substitui o calendário do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sugestões inteligentes (bot) */}
        <div className="space-y-2 p-2 border rounded">
          <div className="font-medium">Sugestões inteligentes (2 opções)</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <Label>Endereço do cliente</Label>
              <Input placeholder="Rua, bairro, cidade" value={suggestionAddr} onChange={e=>setSuggestionAddr(e.target.value)} />
            </div>
            <div>
              <Label>Equipamento (opcional)</Label>
              <Input placeholder="fogão, coifa, etc" value={suggestionEquip} onChange={e=>setSuggestionEquip(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={suggestionUrgent} onChange={e=>setSuggestionUrgent(e.target.checked)} /> Urgente
            </label>
            <Button size="sm" disabled={loadingSuggest || !suggestionAddr} onClick={async()=>{
              setLoadingSuggest(true);
              try{
                const base = (window as any).__API_URL__ || '';
                const headers:any={'Content-Type':'application/json'}; const t=(window as any).BOT_TOKEN || (import.meta as any)?.env?.VITE_BOT_TOKEN || ''; if (t) headers['x-bot-token']=t;
                const r = await fetch(`${base}/api/bot/tools/smartSuggestions`, { method:'POST', headers, body: JSON.stringify({ address: suggestionAddr, equipment_type: suggestionEquip||undefined, urgent: suggestionUrgent }) });
                const j = await r.json().catch(()=>null);
                if (!r.ok || !j?.ok) { toast.error('Falha ao gerar sugestões'); return; }
                setSuggestions(j.suggestions||[]);
                if ((j.suggestions||[]).length===0) toast.message('Sem sugestões', { description: 'Tente outro dia/endereço.'});
              } finally { setLoadingSuggest(false); }
            }}>{loadingSuggest?'Gerando...':'Gerar sugestões'}</Button>
          </div>
          {suggestions.length>0 && (
            <div className="grid sm:grid-cols-2 gap-2">
              {suggestions.map((s:any, idx:number)=> (
                <div key={idx} className="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm">{s.text}</div>
                    <div className="text-[11px] text-muted-foreground">Grupo {s.group}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={async()=>{
                    const base = (window as any).__API_URL__ || '';
                    const headers:any={'Content-Type':'application/json'}; const t=(window as any).BOT_TOKEN || (import.meta as any)?.env?.VITE_BOT_TOKEN || ''; if (t) headers['x-bot-token']=t;
                    const r = await fetch(`${base}/api/bot/tools/createAppointment`, { method:'POST', headers, body: JSON.stringify({ client_name:'Studio (TESTE SUG)', start_time: s.from, end_time: s.to, address: suggestionAddr, description:'Reserva via sugestão (teste)', equipment_type: suggestionEquip||undefined }) });
                    const j = await r.json().catch(()=>null);
                    if (!r.ok || !j?.ok) { toast.error('Falha ao reservar (sugestão)'); return; }
                    if (j?.conflicts?.suggestions?.length) { const sug=j.conflicts.suggestions; toast.message('Sugestões de logística', { description: sug.join(' • ') }); }
                    else { toast.success('Reserva registrada (sugestão)'); }
                  }}>Usar</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-end gap-3">
          <div>
            <Label>Data</Label>
          <div className="flex items-center gap-3">
            <Label className="flex items-center">Modo</Label>
            <select className="border rounded p-2" value={mode} onChange={e=> setMode(e.target.value === 'test' ? 'test' : 'simulate')}>
              <option value="simulate">Simular (não grava)</option>
              {canTestBook && <option value="test">Salvar como TESTE</option>}
            </select>
          </div>

            <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={load} disabled={loading}>{loading?'Carregando...':'Atualizar'}</Button>
            {mode==='test' && canTestBook && (
              <Button variant="secondary" onClick={()=>setOpenDialog(true)}>Agendar (teste)</Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {slots.map((s,i)=> (
            <div key={i} className="border rounded p-2 flex items-center justify-between">
              <div>{s.start} - {s.end}</div>
              <Button size="sm" variant="outline" onClick={()=>{
                if (mode==='simulate' || !canTestBook) {
                  alert(`Simulação: ${date} ${s.start}-${s.end}`);

        {/* Dialog de agendamento de teste */}
        <BotTestBookingDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          date={date}
          slots={slots}
          onBooked={load}
        />

                } else {
                  { const base = (window as any).__API_URL__ || ''; const headers:any={'Content-Type':'application/json'}; const t=(window as any).BOT_TOKEN || (import.meta as any)?.env?.VITE_BOT_TOKEN || ''; if (t) headers['x-bot-token']=t; fetch(`${base}/api/bot/tools/createAppointment`, { method:'POST', headers, body: JSON.stringify({ client_name:'Studio (TESTE)', start_time: `${date}T${s.start}:00`, end_time: `${date}T${s.end}:00`, address:'Studio', description:'Reserva de teste', equipment_type:'fogao' }) }).then(async r=>{ const j=await r.json().catch(()=>null); if (!r.ok || !j?.ok) { toast.error('Falha ao reservar (teste)'); return; } if (j?.conflicts?.suggestions?.length) { const sug=j.conflicts.suggestions; toast.message('Sugestões de logística', { description: sug.join(' • ') }); } else { toast.success('Reserva registrada (teste)'); } load(); }); }
                }
              }}>Reservar</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

