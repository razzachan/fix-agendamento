// Tipos para o Assistente IA (Bot)

export type BotStatus = 'draft' | 'published' | 'disabled';

export interface BotConfig {
  id: string;
  name: string;
  status: BotStatus;
  default_language: string;
  personality: {
    systemPrompt: string;
    tone: 'formal' | 'casual' | 'neutro';
    verbosity: 'curto' | 'medio' | 'detalhado';
    variables: Record<string, string>;
  };
  // Configurações do modelo LLM selecionado pelo usuário
  llm?: {
    provider: 'openai' | 'anthropic';
    model: string; // ex.: 'gpt-5', 'claude-sonnet-4'
    temperature?: number;
    maxTokens?: number;
  };
  // Blocos de contexto por intenção/etapa do funil (para passagem de contexto)
  contextBlocks?: Array<{
    key: string; // ex.: 'coleta_dados', 'orcamento', 'agendamento'
    description?: string;
    intents?: string[]; // intenções associadas a este bloco
    variables?: Record<string, string>; // variáveis padrão do bloco
  }>;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface BotIntegration {
  id: string;
  bot_id: string;
  channel: 'whatsapp' | 'web' | 'telegram';
  settings: {
    // WhatsApp Cloud API (legado/opcional)
    token?: string;
    phone_number_id?: string;
    verify_token?: string;
    webhook_url?: string;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotTemplate {
  id: string;
  bot_id: string;
  key: string; // ex.: greeting, fallback, status_latest_orders
  channel: 'whatsapp' | 'web';
  language: string; // pt-BR
  content: string; // texto com {{variaveis}}
  variables?: string[];
  enabled: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BotFlow {
  id: string;
  bot_id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'keyword' | 'intent' | 'status_change' | 'scheduler';
    value?: string; // ex.: "status", "garantia"
  };
  steps: Array<{ action: string; params?: any; condition?: string }>;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BotPermission {
  id: string;
  bot_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at?: string;
}

export interface ConversationThread {
  id: string;
  bot_id: string;
  contact: string; // telefone E.164
  channel: 'whatsapp' | 'web';
  started_at: string;
  closed_at?: string | null;
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  thread_id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'template' | 'image' | 'audio' | 'video';
  content: string;
  variables?: Record<string, string>;
  created_at: string;
}

export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

