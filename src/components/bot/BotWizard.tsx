import React, { useEffect, useState } from 'react';
import { webhookAIBase } from '@/lib/urls';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBotConfig } from '@/hooks/useBotConfig';
import { botService } from '@/services/bot/botService';

interface Props { onSwitchToAdvanced: () => void }

export function BotWizard({ onSwitchToAdvanced }: Props) {
  const { config, reload } = useBotConfig();
  const [step, setStep] = useState(1);

  // Passo 1: Identidade básica
  const [name, setName] = useState('Assistente Fix');
  const [tone, setTone] = useState<'formal'|'casual'|'neutro'>('neutro');
  const [prompt, setPrompt] = useState('Você é um assistente de suporte técnico cordial e objetivo.');

  // Passo 2: LLM
  const [provider, setProvider] = useState<'openai'|'anthropic'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');

  // Passo 3: Canal
  type WAStatus = { connected: boolean } | null;
  const [status, setStatus] = useState<WAStatus>(null);
  const [qr, setQr] = useState<string|null>(null);
  const [remindLater, setRemindLater] = useState(false);

  useEffect(()=>{
    if (config?.name) setName(config.name);
    if (config?.personality?.systemPrompt) setPrompt(config.personality.systemPrompt);
    if (config?.personality?.tone) setTone(config.personality.tone as 'formal'|'casual'|'neutro');
    if (config?.llm?.provider) setProvider(config.llm.provider as 'openai'|'anthropic');
    if (config?.llm?.model) setModel(config.llm.model);
  },[config?.id]);

  // Auto-refresh QR code quando estiver no passo 3
  useEffect(() => {
    if (step === 3) {
      loadWA(); // Carregar status inicial
      const interval = setInterval(() => {
        if (!status?.connected) {
          loadWA(); // Atualizar QR code a cada 10 segundos se não conectado
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [step, status?.connected]);

  const saveStep1 = async () => {
    await botService.upsertConfig({ id: config?.id, name, personality: { ...(config?.personality||{}), systemPrompt: prompt, tone } } as any);
    await reload();
    setStep(2);
  };

  const saveStep2 = async () => {
    await botService.upsertConfig({ id: config?.id, llm: { provider, model, temperature: 0.7, maxTokens: 1024 } } as any);
    await reload();
    setStep(3);
  };

  const loadWA = async ()=>{
    try{
      const s = await fetch(`${webhookAIBase()}/whatsapp/status`).then(r=>r.json());
      setStatus(s as WAStatus);
    }catch{/* ignore */}
    try{
      const r = await fetch(`${webhookAIBase()}/whatsapp/qr-image`);
      if (r.status===204) {
        setQr(null);
      } else {
        const qrData = await r.text();
        setQr(qrData);
      }
    }catch{/* ignore */}
  };
  useEffect(()=>{ if (step===3){ loadWA(); const i=setInterval(loadWA, 3000); return ()=> clearInterval(i); } },[step]);

  // Persistir preferência de lembrete
  useEffect(()=>{
    try { localStorage.setItem('wa-remind-later', JSON.stringify(remindLater)); } catch {}
  },[remindLater]);
  useEffect(()=>{
    try { const v = localStorage.getItem('wa-remind-later'); if (v) setRemindLater(JSON.parse(v)); } catch {}
  },[]);

  return (
    <div className="space-y-6">
      {/* Passo 1 */}
      {step===1 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Identidade do Assistente</CardTitle>
            <CardDescription>Defina o nome, tom e instruções básicas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div>
                <Label>Tom</Label>
                <select className="w-full border rounded p-2" value={tone} onChange={e=>setTone(e.target.value as any)}>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="neutro">Neutro</option>
                </select>
              </div>
            </div>
            <div>
              <Label>System Prompt</Label>
              <Textarea rows={4} value={prompt} onChange={e=>setPrompt(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onSwitchToAdvanced}>Ir para modo avançado</Button>
              <Button onClick={saveStep1}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 2 */}
      {step===2 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 2: Modelo de IA</CardTitle>
            <CardDescription>Escolha o provedor e modelo principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Provedor</Label>
                <select className="w-full border rounded p-2" value={provider} onChange={e=>setProvider(e.target.value as any)}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <Label>Modelo</Label>
                <select className="w-full border rounded p-2" value={model} onChange={e=>setModel(e.target.value)}>
                  {(provider==='openai'
                    ? ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
                    : ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
                  ).map(m=> <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={()=>setStep(1)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSwitchToAdvanced}>Ir para modo avançado</Button>
                <Button onClick={saveStep2}>Continuar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 3 */}
      {step===3 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 3: Canal WhatsApp</CardTitle>
            <CardDescription>Conecte e teste o canal via QR Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=> fetch(`${webhookAIBase()}/whatsapp/connect`,{method:'POST'})}>Conectar / Gerar QR</Button>
              <Button variant="outline" onClick={()=> fetch(`${webhookAIBase()}/whatsapp/logout`,{method:'POST'})}>Desconectar</Button>
              <Button variant="outline" onClick={loadWA}>Atualizar</Button>
            </div>
            <div className="text-sm text-muted-foreground">Status: {status?.connected? 'Conectado' : 'Desconectado'}</div>
            {!status?.connected && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Você pode pular esta etapa e conectar depois em Canais.</div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={remindLater} onChange={e=>setRemindLater(e.target.checked)} />
                  Lembrar-me de conectar mais tarde
                </label>
                <div className="space-y-3">
                  <div className="text-sm font-medium">📱 QR Code para Conexão:</div>
                  {qr ? (
                    <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border-2 border-green-200 text-center">
                      <img src={qr} alt="QR Code WhatsApp" className="mx-auto max-w-[200px] rounded-lg shadow-md" />
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-green-700">Como conectar:</div>
                        <ol className="text-xs text-gray-600 space-y-1 text-left max-w-xs mx-auto">
                          <li>1. Abra o WhatsApp no celular</li>
                          <li>2. Menu (3 pontos) → "Dispositivos conectados"</li>
                          <li>3. "Conectar um dispositivo"</li>
                          <li>4. Escaneie o QR code acima</li>
                        </ol>
                        <div className="text-xs text-blue-600 mt-2">
                          ⏱️ QR expira em alguns minutos. Use "Atualizar" se necessário.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                      <div className="text-2xl mb-2">📱</div>
                      <div className="text-sm text-gray-600">Gerando QR Code...</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Clique em "Conectar / Gerar QR" se não aparecer
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={()=>setStep(2)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSwitchToAdvanced}>Ir para modo avançado</Button>
                <Button onClick={()=>setStep(4)}>Continuar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 4 */}
      {step===4 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 4: Finalização</CardTitle>
            <CardDescription>Publique e acesse configurações avançadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Pronto! Você concluiu a configuração inicial do assistente. Você pode publicar agora e depois ajustar detalhes no modo avançado.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onSwitchToAdvanced}>Abrir Modo Avançado</Button>
              <Button onClick={()=>setStep(1)}>Recomeçar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

