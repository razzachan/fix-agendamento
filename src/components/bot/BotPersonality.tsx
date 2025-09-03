import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useBotConfig } from '@/hooks/useBotConfig';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';

import { botService } from '@/services/bot/botService';

import { Hints } from '@/copy/hints';

  const presets = [
    {
      key: 'fix_cordial_objetivo',
      label: 'Atendimento cordial e objetivo (Fix Fogões)',
      prompt: 'Você é o assistente da Fix Fogões. Seja cordial e objetivo. Priorize resolver rápido: orçamento, agendamento, cancelamento e status. Peça somente as informações essenciais e evite textos longos.',
      tone: 'neutro' as const,
      verbosity: 'medio' as const,
    },
    {
      key: 'amigavel_explicativo',
      label: 'Amigável e explicativo',
      prompt: 'Você é um assistente amigável e claro. Explique brevemente os próximos passos e ofereça ajuda proativa quando fizer sentido.',
      tone: 'casual' as const,
      verbosity: 'medio' as const,
    },
    {
      key: 'tecnico_sucinto',
      label: 'Técnico sucinto',
      prompt: 'Você é um assistente técnico e direto ao ponto. Foque em instruções curtas e precisas. Evite floreios.',
      tone: 'formal' as const,
      verbosity: 'curto' as const,
    },
  ];

export function BotPersonality() {
  const { config, reload } = useBotConfig();
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'neutro'>('neutro');
  const [verbosity, setVerbosity] = useState<'curto' | 'medio' | 'detalhado'>('medio');

  useEffect(() => {
    if (config?.personality) {
      setPrompt(config.personality.systemPrompt || '');
      setTone((config.personality.tone as any) || 'neutro');
      setVerbosity((config.personality.verbosity as any) || 'medio');
    }
  }, [config?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await botService.upsertConfig({
        id: config?.id,
        personality: {
          ...(config?.personality || {}),
          systemPrompt: prompt,
          tone,
          verbosity
        }
      } as any);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
        <SectionHint title={Hints.personality.section.title} description={Hints.personality.section.desc} />

      <CardHeader>
        <div className="space-y-2">
          <Label>Modelos prontos (opcional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {presets.map(p=> (
              <button key={p.key} type="button" className="border rounded p-2 text-left hover:bg-accent" onClick={()=>{ setPrompt(p.prompt); setTone(p.tone); setVerbosity(p.verbosity); }}>
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground">Aplica tom e instruções sugeridos</div>
              </button>
            ))}
          </div>
        </div>

        <CardTitle>Personalidade & Instruções</CardTitle>
        <CardDescription>Defina o tom e as instruções do assistente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="flex items-center">System Prompt <span className="ml-1"><FieldHint text={Hints.personality.systemPrompt} /></span></Label>
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Explique o papel do assistente..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tom</Label>
            <select className="w-full border rounded p-2" value={tone} onChange={e => setTone(e.target.value as any)}>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="neutro">Neutro</option>
            </select>
          </div>
          <div>
            <Label>Detalhamento</Label>
            <select className="w-full border rounded p-2" value={verbosity} onChange={e => setVerbosity(e.target.value as any)}>
              <option value="curto">Curto</option>
              <option value="medio">Médio</option>
              <option value="detalhado">Detalhado</option>
            </select>
          </div>
        </div>

        <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </CardContent>
    </Card>
  );
}

