import { useEffect, useState, useCallback } from 'react';
import { botService } from '@/services/bot/botService';
import type { BotConfig, BotTemplate, BotIntegration, BotFlow } from '@/types/bot';

export function useBotConfig() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [integrations, setIntegrations] = useState<BotIntegration[]>([]);
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, tpls, ints, fls] = await Promise.all([
        botService.getConfig(),
        botService.listTemplates(),
        botService.listIntegrations(),
        botService.listFlows()
      ]);
      setConfig(cfg);
      setTemplates(tpls);
      setIntegrations(ints);
      setFlows(fls);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return {
    config,
    templates,
    integrations,
    flows,
    loading,
    reload,
  };
}

