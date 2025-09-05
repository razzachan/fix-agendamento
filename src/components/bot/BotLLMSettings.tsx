import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBotConfig } from '@/hooks/useBotConfig';
import { botService } from '@/services/bot/botService';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';

import { Hints } from '@/copy/hints';



export function BotLLMSettings() {
  const { config, reload } = useBotConfig();
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<'openai'|'anthropic'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [creativity, setCreativity] = useState<'conservador'|'equilibrado'|'criativo'>('equilibrado');
  const [responseSize, setResponseSize] = useState<'curta'|'media'|'longa'>('media');

  const modelOptions = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229']
  };

  useEffect(()=>{
    if (config?.llm) {
      setProvider((config.llm.provider as any) || 'openai');
      setModel(config.llm.model || 'gpt-4o-mini');
      setTemperature(config.llm.temperature ?? 0.7);
      setMaxTokens(config.llm.maxTokens ?? 1024);
    }
  },[config?.id]);

  const handleProviderChange = (newProvider: 'openai'|'anthropic') => {
    setProvider(newProvider);
    // Auto-select default model for the provider
    const defaultModel = newProvider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022';
    setModel(defaultModel);
  };

  const save = async () => {
    setSaving(true);
    try {
      await botService.upsertConfig({
        id: config?.id,
        llm: { provider, model, temperature, maxTokens }
      } as any);
      await reload();
    } finally { setSaving(false); }
  };

  return (
    <Card>
        <SectionHint title={Hints.llm.section.title} description={Hints.llm.section.desc} />

      <CardHeader>
        <CardTitle>Modelo de IA</CardTitle>
        <CardDescription>Escolha o provedor, modelo e parâmetros do LLM</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center">Provedor <span className="ml-1"><FieldHint text={Hints.llm.provider} /></span></Label>
            <select className="w-full border rounded p-2" value={provider} onChange={e=>handleProviderChange(e.target.value as any)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <Label className="flex items-center">Modelo <span className="ml-1"><FieldHint text={Hints.llm.model} /></span></Label>
            <select className="w-full border rounded p-2" value={model} onChange={e=>setModel(e.target.value)}>
              {modelOptions[provider].map(modelName => (
                <option key={modelName} value={modelName}>{modelName}</option>
              ))}
            </select>
          <div>
            <Label>Criatividade</Label>
            <select className="w-full border rounded p-2" value={creativity} onChange={e=>{
              const v = e.target.value as typeof creativity;
              setCreativity(v);
              setTemperature(v==='conservador'?0.2: v==='equilibrado'?0.7: 1.0);
            }}>
              <option value="conservador">Conservador (preciso)</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="criativo">Criativo</option>
            </select>
          </div>
          <div>
            <Label>Tamanho da resposta</Label>
            <select className="w-full border rounded p-2" value={responseSize} onChange={e=>{
              const v = e.target.value as typeof responseSize;
              setResponseSize(v);
              setMaxTokens(v==='curta'?512: v==='media'?1024: 1536);
            }}>
              <option value="curta">Curta</option>
              <option value="media">Média</option>
              <option value="longa">Longa</option>
            </select>
          </div>

          </div>
          <div>
            <Label className="flex items-center">Temperature <span className="ml-1"><FieldHint text={Hints.llm.temperature} /></span></Label>
            <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={e=>setTemperature(Number(e.target.value))} />
          </div>
          <div>
            <Label className="flex items-center">Max tokens <span className="ml-1"><FieldHint text={Hints.llm.maxTokens} /></span></Label>
            <Input type="number" min="128" max="8192" value={maxTokens} onChange={e=>setMaxTokens(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Button onClick={save} disabled={saving}>{saving?'Salvando...':'Salvar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

