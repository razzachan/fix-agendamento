import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';


interface Row { weekday:number; start_time:string; end_time:string }
const names = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export function BotWorkingHours(){
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(()=>{ (async()=>{
    const resp = await fetch('http://localhost:3000/api/working_hours');
    const data = await resp.json().catch(()=>({items:[]}));
    setRows(data.items || []);
  })(); },[]);

  const save = async ()=>{
    await fetch('http://localhost:3000/api/working_hours/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items: rows }) });
    alert('Horários salvos');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário de Funcionamento</CardTitle>
        <SectionHint
          title="Janelas de atendimento"
          description="Defina horários de início e fim por dia da semana. A agenda e os orçamentos só oferecerão horários dentro dessas janelas."
        />

        <CardDescription>Defina os horários por dia da semana</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({length:7}).map((_,i)=>{
          const r = rows.find(x=>x.weekday===i) || { weekday:i, start_time:'08:00', end_time:'18:00' };
          return (
            <div key={i} className="grid grid-cols-5 gap-3 items-end">
              <div className="col-span-1 font-medium">{names[i]}</div>
              <div>
                <Label>Início</Label>
                <Input value={r.start_time} onChange={e=> setRows(s=>{ const copy=[...s.filter(x=>x.weekday!==i), {...r, start_time:e.target.value}]; return copy; })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input value={r.end_time} onChange={e=> setRows(s=>{ const copy=[...s.filter(x=>x.weekday!==i), {...r, end_time:e.target.value}]; return copy; })} />
              </div>
            </div>
          );
        })}
        <div>
          <Button onClick={save}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

