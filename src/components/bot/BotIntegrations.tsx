import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHint } from '@/components/ui/section-hint';
import WhatsAppConnection from './WhatsAppConnection';
import StatusBar from './StatusBar';
import SessionsList from './SessionsList';
import TestModeToggle from './TestModeToggle';

import { useBotConfig } from '@/hooks/useBotConfig';

export function BotIntegrations() {
  const { integrations } = useBotConfig();
  const whatsapp = useMemo(() => integrations.find(i => i.channel === 'whatsapp'), [integrations]);

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Conecte seu WhatsApp em 2 cliques"
          description="Use o componente abaixo para conectar via QR Code. Não precisa de conta Meta (Cloud API). Você pode fazer isso depois sem impactar outras funções."
        />

        <CardTitle>Canais</CardTitle>
        <CardDescription>Conecte o WhatsApp Web via QR (sem Cloud API)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={whatsapp ? 'default' : 'secondary'}>
            {whatsapp ? 'WhatsApp (canal) configurado' : 'WhatsApp não configurado'}
          </Badge>
        </div>

        {/* Status unificado */}
        <StatusBar />

        {/* Instruções rápidas */}
        <div className="p-3 border rounded bg-amber-50 text-amber-900 text-sm">
          Comandos no WhatsApp: envie ' para pausar o bot nesta conversa e = para despausar.
        </div>

        {/* WhatsApp Connection */}
        <WhatsAppConnection />

        {/* Modo de Teste - apenas número whitelisted */}
        <div>
          <h3 className="text-sm font-semibold mt-4 mb-1">Modo de Teste</h3>
          <p className="text-xs text-muted-foreground mb-2">Ativando o modo de teste, o bot só responde ao número 48991962111 (com ou sem DDI 55).</p>
          <TestModeToggle />
        </div>

        {/* Sessões recentes */}
        <SessionsList />
      </CardContent>
    </Card>
  );
}
