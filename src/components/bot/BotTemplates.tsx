import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { botService } from '@/services/bot/botService';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';

import { useBotConfig } from '@/hooks/useBotConfig';
import type { BotTemplate } from '@/types/bot';

export function BotTemplates() {
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const { integrations } = useBotConfig();
  const whatsapp = integrations.find(i => i.channel === 'whatsapp');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BotTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await botService.listTemplates();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startNew = () => setEditing({
    id: '', bot_id: '', key: '', channel: 'whatsapp', language: 'pt-BR', content: '', enabled: true
  } as any);

  const save = async () => {
    if (!editing) return;
    await botService.saveTemplate({ ...editing, id: editing.id || undefined });
    setEditing(null);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Como usar templates"
          description="Crie mensagens reutilizáveis por chave (ex.: greeting, fallback). Você pode referenciar variáveis geradas pelo bot usando {{ nome }}."
        />

        <CardTitle>Modelos de Resposta</CardTitle>
        <CardDescription>Templates por categoria e canal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="flex items-center">Chave <span className="ml-1"><FieldHint text="Identificador do template (ex.: greeting, thanks, fallback)."/></span></Label>
                <Input value={editing.key} onChange={e => setEditing({ ...editing, key: e.target.value })} placeholder="greeting" />
              </div>
              <div>
                <Label className="flex items-center">Canal <span className="ml-1"><FieldHint text="Canal onde o template é usado (ex.: whatsapp)."/></span></Label>
                <Input value={editing.channel} onChange={e => setEditing({ ...editing, channel: e.target.value as any })} />
              </div>
              <div>
                <Label className="flex items-center">Idioma <span className="ml-1"><FieldHint text="Padrão do texto (ex.: pt-BR). Pode ter variações por idioma."/></span></Label>
                <Input value={editing.language} onChange={e => setEditing({ ...editing, language: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="flex items-center">Conteúdo <span className="ml-1"><FieldHint text="Texto do template. Suporta variáveis com {{ nome }} e pode ser usado pelo orquestrador em respostas fixas."/></span></Label>
              <textarea className="w-full border rounded p-2 min-h-40" value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Salvar</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">{loading ? 'Carregando...' : `${templates.length} templates`}</div>
              <Button onClick={startNew}>Novo Template</Button>
            </div>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.key}</div>
                    <div className="text-xs text-muted-foreground">{t.channel} • {t.language}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Editar</Button>
                    <Button variant="secondary" size="sm" onClick={async () => {
                      const WEBHOOK = (import.meta as any).env?.VITE_WEBHOOK_AI || 'http://localhost:3100';
                      const phone = prompt('Enviar para número (somente dígitos com DDI+DDD+NÚMERO, ex.: 5548999999999)');
                      if (!phone) return;
                      const to = /^\d+$/.test(phone) ? `${phone}@c.us` : phone;
                      const resp = await fetch(`${WEBHOOK}/whatsapp/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to, body: t.content })
                      });
                      if (resp.ok) alert('Enviado via WhatsApp Web (QR)!'); else alert('Falhou ao enviar (webhook-ai). Verifique conexão QR.');
                    }}>Testar</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

