import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

const FROM = 'test:+5511999999999';

describe('Fluxo orçamento -> agendamento', () => {
  let session: any;
  const originalFake = process.env.LLM_FAKE_JSON;

  beforeAll(async () => {
    session = await getOrCreateSession('wa', FROM);
  });

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('"fogão" sozinho retorna prompt de opções (ambiguidade)', async () => {
    const out = await orchestrateInbound(FROM, 'fogão', session);
    if (typeof out !== 'string') {
      expect(out.options?.length).toBeGreaterThanOrEqual(3);
    } else {
      expect(out.toLowerCase()).toMatch(/qual é a marca|marca do equipamento|tipo de fogão|gás|elétrico|indução/);
    }
  });

  it('Entrega de orçamento marca orcamento_entregue=true e habilita agendamento', async () => {
    // Evitar perguntas adicionais no meio do fluxo durante testes determinísticos
    process.env.NODE_ENV = 'test';
    // Prencher contexto mínimo e forçar decisão de gerar orçamento via LLM_FAKE_JSON
    await setSessionState(session.id, {
      ...(session.state || {}),
      dados_coletados: {
        equipamento: 'fogão a gás',
        marca: 'Brastemp',
        problema: 'não funciona 2 bocas',
      },
    });
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: {
        equipamento: 'fogão a gás',
        marca: 'Brastemp',
        problema: 'não funciona 2 bocas',
      },
    });

    const out1 = await orchestrateInbound(FROM, 'não funciona 2 bocas', session);
    expect(typeof out1).toBe('string');

    // Recarregar sessão para obter state atualizado
    session = await getOrCreateSession('wa', FROM);
    const st = (session as any).state || {};
    expect(!!st.orcamento_entregue).toBe(true);

    // Agora, com orçamento entregue, a fala de agendar deve retornar um texto de follow-up (sem exigir que chame middleware)
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
      resposta_sugerida: 'Vamos agendar',
    });
    const out2 = await orchestrateInbound(FROM, 'quero agendar amanhã 9h', session);
    expect(typeof out2).toBe('string');
  });
});
