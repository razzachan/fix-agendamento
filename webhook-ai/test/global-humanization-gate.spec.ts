import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

function toText(out: any): string {
  return typeof out === 'string' ? out : (out as any)?.text || '';
}

describe('Global humanization gate (LLM fake in tests)', () => {
  const originalAllow = process.env.LLM_ALLOW_IN_TEST;
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_ALLOW_IN_TEST = originalAllow || '';
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('humaniza saudação curta ("oi") e reconduz com pergunta do funil', async () => {
    process.env.LLM_ALLOW_IN_TEST = 'true';
    process.env.LLM_FAKE_JSON = 'Oi! Claro — me conta rapidinho.';

    const FROM1 = 'test:+559900000101';
    const base1 = await getOrCreateSession('wa', FROM1);
    await setSessionState(base1.id, {
      ...(base1.state || {}),
      __allow_llm_in_test: true,
      dados_coletados: {},
      orcamento_entregue: false,
    });
    const session1: any = await getOrCreateSession('wa', FROM1);

    const out = await orchestrateInbound(FROM1, 'Oi', session1);
    const text = toText(out).toLowerCase();

    expect(text).toContain('oi!');
    expect(text).toContain('qual');
    expect(text).toContain('equipamento');
    expect(text).toContain('problema');
  });

  it('durante coleta de dados pessoais, pergunta fora de contexto vira resposta humana + próximo dado', async () => {
    process.env.LLM_ALLOW_IN_TEST = 'true';
    process.env.LLM_FAKE_JSON = 'Sou um assistente virtual da assistência — posso te ajudar sim.';

    const FROM2 = 'test:+559900000102';
    const base2 = await getOrCreateSession('wa', FROM2);
    await setSessionState(base2.id, {
      ...(base2.state || {}),
      __allow_llm_in_test: true,
      collecting_personal_data: true,
      accepted_service: true,
      orcamento_entregue: false,
      dados_coletados: { nome: 'João da Silva' },
    });
    const session2: any = await getOrCreateSession('wa', FROM2);

    const out = await orchestrateInbound(FROM2, 'Quem é você?', session2);
    const text = toText(out).toLowerCase();

    expect(text).toContain('assist');
    expect(text).toContain('endere');
    expect(text).toContain('cep');
  });
});
