import { chatComplete, buildSystemPrompt, ChatMessage } from '../../../webhook-ai/src/services/llmClient';

export interface InboundMsg {
  channel: 'whatsapp' | 'web';
  from: string; // jid ou id do usuário
  body: string;
}

export interface OrchestratorContext {
  to: string;
  reply: string;
  channel: 'whatsapp'|'web';
}

function simpleIntent(body: string): 'saudacao' | 'orcamento' | 'agendamento' | 'desconhecido' {
  const b = body.toLowerCase();
  if (/(ol[aá]|oi|bom dia|boa tarde|boa noite)/.test(b)) return 'saudacao';
  if (/(pre[cç]o|or[cç]amento|quanto custa)/.test(b)) return 'orcamento';
  if (/(agendar|marcar|agenda|hor[aá]rio)/.test(b)) return 'agendamento';
  return 'desconhecido';
}

export async function processInbound(msg: InboundMsg, llmCfg?: {provider:'openai'|'anthropic';model:string;temperature?:number;maxTokens?:number}, contextBlocks?: Array<{key:string;description?:string;variables?:Record<string,string>}>): Promise<OrchestratorContext> {
  const intent = simpleIntent(msg.body);

  // respostas rápidas por regra
  if (intent === 'saudacao') {
    return { channel: msg.channel, to: msg.from, reply: 'Olá! Sou o assistente da Fix Fogões. Posso ajudar com um orçamento ou agendamento?', };
  }

  if (intent === 'orcamento') {
    // placeholder: integrar QuoteEngine real
    return { channel: msg.channel, to: msg.from, reply: 'Para orçamento, me informe o equipamento (ex.: fogão) e o bairro/CEP, por favor.', };
  }

  // fallback LLM para casos abertos
  const system = buildSystemPrompt(undefined, contextBlocks);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: msg.body }
  ];
  const text = await chatComplete({
    provider: llmCfg?.provider || 'openai',
    model: llmCfg?.model || 'gpt-5',
    temperature: llmCfg?.temperature ?? 0.7,
    maxTokens: llmCfg?.maxTokens ?? 700
  }, messages);
  return { channel: msg.channel, to: msg.from, reply: text };
}

