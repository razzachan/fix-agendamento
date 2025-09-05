import { supabase } from '@/integrations/supabase/client';
import type { BotConfig, BotIntegration, BotTemplate, BotFlow, ConversationMessage, ConversationThread, PartialDeep } from '@/types/bot';

export const botService = {
  async getConfig(): Promise<BotConfig | null> {
    const { data, error } = await supabase.from('bot_configs').select('*').limit(1).single();
    if (error) { console.error('[botService] getConfig error', error); return null; }
    return data as unknown as BotConfig;
  },

  async upsertConfig(cfg: PartialDeep<BotConfig>): Promise<boolean> {
    const { error } = await supabase.from('bot_configs').upsert(cfg as any, { onConflict: 'id' });
    if (error) { console.error('[botService] upsertConfig error', error); return false; }
    return true;
  },

  async listTemplates(): Promise<BotTemplate[]> {
    const { data, error } = await supabase.from('bot_templates').select('*').order('key');
    if (error) { console.error('[botService] listTemplates error', error); return []; }
    return data as any;
  },

  async saveTemplate(t: PartialDeep<BotTemplate>): Promise<boolean> {
    const { error } = await supabase.from('bot_templates').upsert(t as any);
    if (error) { console.error('[botService] saveTemplate error', error); return false; }
    return true;
  },

  async listIntegrations(): Promise<BotIntegration[]> {
    const { data, error } = await supabase.from('bot_integrations').select('*');
    if (error) { console.error('[botService] listIntegrations error', error); return []; }
    return data as any;
  },

  async saveIntegration(i: PartialDeep<BotIntegration>): Promise<boolean> {
    const { error } = await supabase.from('bot_integrations').upsert(i as any);
    if (error) { console.error('[botService] saveIntegration error', error); return false; }
    return true;
  },

  async listFlows(): Promise<BotFlow[]> {
    const { data, error } = await supabase.from('bot_flows').select('*').order('name');
    if (error) { console.error('[botService] listFlows error', error); return []; }
    return data as any;
  },

  async saveFlow(f: PartialDeep<BotFlow>): Promise<boolean> {
    const { error } = await supabase.from('bot_flows').upsert(f as any);
    if (error) { console.error('[botService] saveFlow error', error); return false; }
    return true;
  },

  async listThreads(limit = 50): Promise<ConversationThread[]> {
    const { data, error } = await supabase
      .from('conversation_threads')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[botService] listThreads error', error); return []; }
    return data as any;
  },

  async getThreadMessages(threadId: string): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[botService] getThreadMessages error', error); return []; }
    return data as any;
  }
};

