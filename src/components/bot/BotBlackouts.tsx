import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';


interface Row { id?:string; start_time:string; end_time:string; reason?:string }

export function BotBlackouts(){
  const [rows, setRows] = useState<Row[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  async function load(){
    const resp = await fetch('http://localhost:3000/api/blackouts');
    const data = await resp.json().catch(()=>({items:[]}));
    setRows(data.items || []);
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    await fetch('http://localhost:3000/api/blackouts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ start_time:start, end_time:end, reason }) });
    setStart(''); setEnd(''); setReason('');
    load();
  }
  async function remove(id:string){
    await fetch(`http://localhost:3000/api/blackouts/${id}`, { method:'DELETE' });
    load();
  }

  return (
    <Card>
        <SectionHint
          title="Quando usar bloqueios"
          description="Crie janelas de indisponibilidade para feriados, manutenção de time, treinamentos, etc. Esses períodos nunca serão oferecidos na agenda."
        />

      <CardHeader>
        <CardTitle>Bloqueios de Agenda</CardTitle>
        <CardDescription>Feriados/manutenções</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div>
            <Label>Início</Label>
            <Input value={start} onChange={e=>setStart(e.target.value)} placeholder="2025-08-10T08:00:00" />
          </div>
          <div>
            <Label>Fim</Label>
            <Input value={end} onChange={e=>setEnd(e.target.value)} placeholder="2025-08-10T12:00:00" />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={reason} onChange={e=>setReason(e.target.value)} />
          </div>
          <Button onClick={add}>Adicionar</Button>
        </div>
        <div className="space-y-2">
          {rows.map(r=> (
            <div key={r.id} className="flex items-center justify-between border rounded p-2">
              <div>{r.start_time} → {r.end_time} ({r.reason})</div>
              <Button variant="destructive" size="sm" onClick={()=>remove(r.id!)}>Remover</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

