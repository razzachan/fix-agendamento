import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';
import { toolsCatalog } from '@/config/toolsCatalog';

import { Hints } from '@/copy/hints';


interface Intent { id?:string; name:string; examples:string[]; tool?:string|null; tool_schema?:any }

export function BotIntents(){
  const [items, setItems] = useState<Intent[]>([]);
  const [name, setName] = useState('');
  const [examples, setExamples] = useState('');
  const [tool, setTool] = useState<string>('');
  const [schema, setSchema] = useState('{}');

  async function load(){
    const resp = await fetch('http://localhost:3000/api/intents');
    const data = await resp.json().catch(()=>({items:[]}));
    setItems(data.items || []);
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    const payload = { name, examples: examples.split('\n').map(s=>s.trim()).filter(Boolean), tool: tool||null, tool_schema: schema? JSON.parse(schema): null };
    await fetch('http://localhost:3000/api/intents', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    setName(''); setExamples(''); setTool(''); setSchema('{}');
    load();
  }

  async function saveItem(it:Intent){
    await fetch(`http://localhost:3000/api/intents/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(it) });
    load();
  }
  async function remove(id:string){ await fetch(`http://localhost:3000/api/intents/${id}`, { method:'DELETE' }); load(); }

  return (
    <Card>
      <CardHeader>
        <SectionHint title={Hints.intents.section.title} description={Hints.intents.section.desc} />

        <CardTitle>Intenções</CardTitle>
        <CardDescription>Configure exemplos e ferramentas por intenção</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="orcamento" />
          </div>
          <div className="md:col-span-2">
            <Label className="flex items-center">Exemplos (1 por linha) <span className="ml-1"><FieldHint text={Hints.intents.examples} /></span></Label>
            <Textarea value={examples} onChange={e=>setExamples(e.target.value)} rows={3} />
          </div>
          <div>
            <Label className="flex items-center">Ferramenta (opcional) <span className="ml-1"><FieldHint text={Hints.intents.tool} /></span></Label>
            <select className="w-full border rounded p-2" value={tool} onChange={e=>setTool(e.target.value)}>
              <option value="">Nenhuma</option>
              {toolsCatalog.map(t=> <option key={t.name} value={t.name}>{t.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-4">
            <Label className="flex items-center">Campos obrigatórios da ferramenta <span className="ml-1"><FieldHint text="O bot só chamará a ferramenta se tiver todos os campos obrigatórios." /></span></Label>
            <div className="text-xs text-muted-foreground">Para a ferramenta selecionada, considere os campos esperados e forneça exemplos acima para o bot coletar.</div>
          </div>
          <div>
            <Button onClick={add}>Adicionar</Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map(it=> (
            <div key={it.id} className="border rounded p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <Label>Nome</Label>
                  <Input value={it.name} onChange={e=> setItems(s=> s.map(x=> x.id===it.id? {...x, name:e.target.value}: x))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Exemplos</Label>
                  <Textarea value={(it.examples||[]).join('\n')} onChange={e=> setItems(s=> s.map(x=> x.id===it.id? {...x, examples: e.target.value.split('\n')}: x))} rows={3} />
                </div>
                <div>
                  <Label>Ferramenta</Label>
                  <select className="w-full border rounded p-2" value={it.tool||''} onChange={e=> setItems(s=> s.map(x=> x.id===it.id? {...x, tool:e.target.value}: x))}>
                    <option value="">Nenhuma</option>
                    {toolsCatalog.map(t=> <option key={t.name} value={t.name}>{t.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <Label>Campos obrigatórios</Label>
                  <div className="text-xs text-muted-foreground">O bot aprende pelos exemplos. Garanta que os exemplos desta intenção contenham os dados necessários para a ferramenta selecionada.</div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={()=>saveItem(it)}>Salvar</Button>
                <Button variant="destructive" onClick={()=>remove(it.id!)}>Remover</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

