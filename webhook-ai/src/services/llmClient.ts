import 'dotenv/config';

export type LLMProvider = 'openai' | 'anthropic';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  // Para OpenAI Vision, content pode ser array com {type:'text'|'image_url', ...}
  content: any;
}

export interface ChatOptions {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chatComplete(options: ChatOptions, messages: ChatMessage[]): Promise<string> {
  // Modo de teste: permite injetar a saída do LLM (tool-call JSON) via env
  if (process.env.LLM_FAKE_JSON) {
    const out = process.env.LLM_FAKE_JSON;
    return typeof out === 'string' ? out : JSON.stringify(out);
  }
  // Em ambiente de teste, evitar chamadas externas e retornar string vazia por padrão
  if (process.env.NODE_ENV === 'test') {
    return '';
  }
  const provider = options.provider || 'openai';
  if (provider === 'anthropic') return anthropicComplete(options, messages);
  return openaiComplete(options, messages);
}

async function openaiComplete(options: ChatOptions, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const defaultModel = process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini';
  const body = {
    model: options.model || defaultModel,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  } as any;
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }
  const data: any = await resp.json();
  const out = data?.choices?.[0]?.message?.content?.trim();
  return out || '';
}

async function anthropicComplete(options: ChatOptions, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userAssistantMsgs = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  const body = {
    model: options.model || 'claude-sonnet-4',
    system: systemMsg,
    messages: userAssistantMsgs,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  } as any;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Anthropic error ${resp.status}: ${txt}`);
  }
  const data: any = await resp.json();
  const out = data?.content?.[0]?.text?.trim();
  return out || '';
}

export function buildSystemPrompt(
  basePrompt?: string,
  contextBlocks?: Array<{ key: string; description?: string; variables?: Record<string, string> }>
): string {
  const parts: string[] = [];
  parts.push(
    basePrompt ||
      'Você é um assistente brasileiro da Fix Fogões. Seja natural, amigável e genuinamente humano! 🇧🇷\n\n' +
        'Converse como você conversaria com um amigo - use "oi", "e aí", "nossa", "que chato isso mesmo!". Quando alguém te cumprimentar, responda como uma pessoa real faria.\n\n' +
        'Seu trabalho é ajudar com equipamentos domésticos, mas faça isso de forma natural e empática. Varie suas respostas, seja espontâneo e mostre que você realmente se importa com o problema da pessoa.\n\n' +
        'Não seja robótico - seja você mesmo! O GPT que você é já sabe como ser natural. 😊'
  );
  if (contextBlocks && contextBlocks.length) {
    const ctx = contextBlocks.map((b) => `[${b.key}] ${b.description || ''}`.trim()).join('\n');
    parts.push('Contextos relevantes:\n' + ctx);
  }
  parts.push(
    'Regras: 1) Só prometa o que o sistema permite. 2) Se faltar dado, peça educadamente. 3) Nunca invente preços fora do mecanismo de orçamento. 4) Responda em pt-BR. 5) NUNCA peça dados pessoais (nome, telefone, endereço, CPF) antes do cliente aceitar explicitamente o orçamento.'
  );
  return parts.join('\n\n');
}
