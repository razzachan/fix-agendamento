import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHint } from '@/components/ui/section-hint';

import { useBotConfig } from '@/hooks/useBotConfig';
import { botService } from '@/services/bot/botService';
import { Bot, Send, Save, Upload } from 'lucide-react';
import { BotToggle } from './BotToggle';

export function BotOverview() {
  const { config, integrations, reload } = useBotConfig();
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste do assistente.');

  const whatsapp = integrations.find(i => i.channel === 'whatsapp');
  const hasCredentials = true; // Sempre habilitado para QR via webhook-ai

  const publish = async () => {
    if (!config) return;
    setPublishing(true);
    try {
      await botService.upsertConfig({
        ...config,
        status: 'published',
        published_at: new Date().toISOString()
      });
      await reload();
    } finally {
      setPublishing(false);
    }
  };

  const testSend = async () => {
    if (!testPhone.trim()) return;
    setTesting(true);
    try {
      // Envia via WhatsApp Web (QR) usando webhook-ai
      const WEBHOOK = (import.meta as any).env?.VITE_WEBHOOK_AI || 'http://localhost:3100';
      // Normaliza para dígitos e adiciona @c.us
      const digits = String(testPhone).replace(/\D+/g,'');
      const to = digits ? `${digits}@c.us` : testPhone;
      const resp = await fetch(`${WEBHOOK}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body: testMessage })
      });
      if (!resp.ok) throw new Error('Falha ao enviar (webhook-ai)');
      alert('Enviado via WhatsApp Web (QR)');
    } catch (error) {
      console.error('[Teste WhatsApp] Erro ao enviar via webhook-ai', error);
      alert('Falha ao enviar. Verifique se o webhook-ai está rodando e conectado ao WhatsApp (QR).');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Status do Assistente
          </CardTitle>
          <div className="mt-2">
            <SectionHint
              title="Publicação"
              description="Publicar congela o estado atual da configuração para uso em produção. Você pode continuar editando em rascunho e publicar novamente quando estiver pronto."
            />
          </div>
          <CardDescription>
            Controle de publicação e teste do bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={config?.status === 'published' ? 'default' : 'secondary'}>
              {config?.status === 'published' ? 'Publicado' : 'Rascunho'}
            </Badge>
            {config?.published_at && (
              <span className="text-sm text-muted-foreground">
                Última publicação: {new Date(config.published_at).toLocaleString('pt-BR')}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={publish} disabled={publishing || !config}>
              <Upload className="h-4 w-4 mr-2" />
              {publishing ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de Envio</CardTitle>
          <CardDescription>
            Envie uma mensagem de teste via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCredentials ? (
            <div className="text-sm text-muted-foreground">
              Configure as credenciais do WhatsApp na aba "Integrações" para habilitar o teste.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testPhone">Número de teste (com +55)</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="+5511999999999"
                  />
                </div>
                <div>
                  <Label htmlFor="testMessage">Mensagem</Label>
                  <Input
                    id="testMessage"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={testSend} disabled={testing || !testPhone.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {testing ? 'Enviando...' : 'Enviar Teste'}
              </Button>
            </>
          )}
      <BotToggle />

        </CardContent>
      </Card>
    </div>
  );
}
