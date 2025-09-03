import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { BotWizard } from './BotWizard';
import { BotStudioAdvanced } from './BotStudioAdvanced';
import { useBotConfig } from '@/hooks/useBotConfig';

type ViewMode = 'auto' | 'wizard' | 'advanced';

export function BotStudioContainer() {
  const { config, loading } = useBotConfig();
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [userPreference, setUserPreference] = useState<'wizard' | 'advanced'>('wizard');

  // Detecta se é primeira configuração
  const isFirstTime = !config?.personality?.systemPrompt && !config?.llm?.provider;
  
  // Determina qual modo exibir
  const currentMode = viewMode === 'auto' 
    ? (isFirstTime ? 'wizard' : userPreference)
    : viewMode;

  useEffect(() => {
    // Carrega preferência salva
    const saved = localStorage.getItem('bot-studio-mode') as 'wizard' | 'advanced';
    if (saved) setUserPreference(saved);
  }, []);

  const switchMode = (mode: 'wizard' | 'advanced') => {
    setViewMode(mode);
    setUserPreference(mode);
    localStorage.setItem('bot-studio-mode', mode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Bot className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // Banner de lembrete (WhatsApp)
  const showWABanner = (() => {
    try {
      const remind = JSON.parse(localStorage.getItem('wa-remind-later') || 'false');
      return remind === true;
    } catch { return false; }
  })();

  return (
    <div className="space-y-6">
      {/* Banner opcional para lembrar conexão do WhatsApp */}
      {showWABanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 flex items-center justify-between">
          <div className="text-sm">Conecte o WhatsApp em Canais para ativar o atendimento. Você pode desativar este lembrete no Wizard.</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { try { localStorage.setItem('wa-remind-later','false'); } catch{}; window.dispatchEvent(new Event('storage')); }}
          >
            Dispensar
          </Button>
        </div>
      )}

      {/* Header com controles de modo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Assistente IA</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentMode === 'wizard'
                    ? 'Configuração guiada para primeiros passos'
                    : 'Configuração avançada com controle total'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={config?.status === 'published' ? 'default' : 'secondary'}>
                {config?.status === 'published' ? 'Publicado' : 'Rascunho'}
              </Badge>

              <div className="flex rounded-lg border p-1">
                <Button
                  variant={currentMode === 'wizard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchMode('wizard')}
                  className="h-8 px-3"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Wizard
                </Button>
                <Button
                  variant={currentMode === 'advanced' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => switchMode('advanced')}
                  className="h-8 px-3"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Avançado
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Conteúdo baseado no modo */}
      {currentMode === 'wizard' ? (
        <BotWizard onSwitchToAdvanced={() => switchMode('advanced')} />
      ) : (
        <BotStudioAdvanced onSwitchToWizard={() => switchMode('wizard')} />
      )}
    </div>
  );
}
