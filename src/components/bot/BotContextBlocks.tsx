import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';

import { Hints } from '@/copy/hints';

import { useBotConfig } from '@/hooks/useBotConfig';
import { botService } from '@/services/bot/botService';

interface Block { key: string; description?: string; intents?: string[]; variables?: Record<string,string>; }

export function BotContextBlocks(){
  const { config, reload } = useBotConfig();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    const arr = (config as any)?.contextBlocks || [];
    setBlocks(Array.isArray(arr)? arr : []);
  },[config?.id]);

  const addBlock = () => setBlocks(prev => [...prev, { key: '', description: '', intents: [], variables: {} }]);
  const removeBlock = (i:number) => setBlocks(prev => prev.filter((_,idx)=>idx!==i));

  const save = async () => {
    setSaving(true);
    try {
      await botService.upsertConfig({ id: config?.id, contextBlocks: blocks } as any);
      await reload();
    } finally { setSaving(false); }
  };

  return (
    <Card>
        <SectionHint title={Hints.context.section.title} description={Hints.context.section.desc} />

      <CardHeader>
        <CardTitle>Contexto por Intenção</CardTitle>
        <CardDescription>Defina blocos de contexto vinculados a intenções ou etapas do funil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocks.map((b,idx)=> (
          <div key={idx} className="border rounded p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="flex items-center">Chave <span className="ml-1"><FieldHint text={Hints.context.key} /></span></Label>
                <Input value={b.key} onChange={e=>{
                  const v = e.target.value; setBlocks(s=> s.map((x,i)=> i===idx? {...x, key:v}: x));
                }} placeholder="orcamento" />
              </div>
              <div>
                <Label className="flex items-center">Intenções (separadas por vírgula) <span className="ml-1"><FieldHint text={Hints.context.intents} /></span></Label>
                <Input value={(b.intents||[]).join(',')} onChange={e=>{
                  const v = e.target.value.split(',').map(x=>x.trim()).filter(Boolean);
                  setBlocks(s=> s.map((x,i)=> i===idx? {...x, intents:v}: x));
                }} placeholder="orcamento,agendamento" />
              </div>
            </div>
            <div>
              <Label className="flex items-center">Descrição <span className="ml-1"><FieldHint text={Hints.context.description} /></span></Label>
              <Textarea value={b.description||''} onChange={e=>{
                const v = e.target.value; setBlocks(s=> s.map((x,i)=> i===idx? {...x, description:v}: x));
              }} />
            </div>
            <div>
              <Label className="flex items-center">Variáveis (JSON) <span className="ml-1"><FieldHint text={Hints.context.variables} /></span></Label>
              <Textarea value={JSON.stringify(b.variables||{}, null, 2)} onChange={e=>{
                try { const v = JSON.parse(e.target.value||'{}'); setBlocks(s=> s.map((x,i)=> i===idx? {...x, variables:v}: x)); } catch {}
              }} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="destructive" onClick={()=>removeBlock(idx)}>Remover</Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button onClick={addBlock} variant="outline">Adicionar Bloco</Button>
          <Button onClick={save} disabled={saving}>{saving? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

