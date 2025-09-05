import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBotConfig } from '@/hooks/useBotConfig';
import { botService } from '@/services/bot/botService';

export function BotToggle() {
  const { config, reload } = useBotConfig();
  const [saving, setSaving] = useState(false);

  const enabled = config?.status !== 'disabled';

  const onToggle = async (checked: boolean) => {
    if (!config) return;
    setSaving(true);
    try {
      await botService.upsertConfig({ id: config.id, status: checked ? 'published' : 'disabled' } as any);
      await reload();
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot ligado/desligado</CardTitle>
        <CardDescription>Ative para responder automaticamente; desative para pausar respostas.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={saving || !config} />
        <span className="text-sm text-muted-foreground">{enabled ? 'Ligado' : 'Desligado'}</span>
        <div className="ml-auto">
          {enabled ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={saving || !config}>Desligar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desligar o bot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao desligar, o bot para de responder automaticamente no WhatsApp.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={()=>onToggle(false)}>Desligar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="default" onClick={()=>onToggle(true)} disabled={saving || !config}>Ligar</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

