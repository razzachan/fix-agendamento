import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

function toText(out: any): string {
  return (typeof out === 'string' ? out : (out?.text || '')).toLowerCase();
}

describe('Perguntas fora do contexto: respostas do bot', () => {
  const originalFake = process.env.LLM_FAKE_JSON;
  const FROM = 'whatsapp:+551100000001';

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('Durante geração de orçamento, pergunta fora de contexto usa template off_topic ou fallback curto', async () => {
    process.env.NODE_ENV = 'test';
    // Força a decisão do LLM para gerar orçamento, mas a mensagem é off-topic
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: {}
    });

    const out = await orchestrateInbound(FROM, 'Qual a capital do Brasil?', {
      id: 'sess-ot-1', channel: 'whatsapp', peer: '+551100000001', state: {}
    } as any);

    const text = toText(out);
    // Sem template configurado, pode cair no fluxo estático de serviço ou fallback curto
    expect(text).toMatch(/(coleta|valor de manutenção|orçamento|agendamento|status)/i);
  });

  it('Quando a intenção é "outros", responde de forma humanizada curta e redireciona', async () => {
    process.env.NODE_ENV = 'test';
    // Força decisão "outros" para caminho de resposta humanizada
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'outros',
      acao_principal: 'responder_informacao'
    });

    const out = await orchestrateInbound(FROM, 'Me conta uma piada?', {
      id: 'sess-ot-2', channel: 'whatsapp', peer: '+551100000001', state: {}
    } as any);

    const text = toText(out);
    // Em ambiente de teste, chatComplete retorna string vazia → usa fallback curto com redirecionamento
    expect(text).toMatch(/(interessante|posso te ajudar com algum equipamento|equipamento doméstico|posso ajudar com mais alguma coisa)/i);
  });
});

