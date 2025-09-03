import { describe, it, expect, beforeAll } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

const FROM = 'test:+5511999999999';

describe('Fluxo orçamento -> agendamento', () => {
  let session: any;

  beforeAll(async () => {
    session = await getOrCreateSession('wa', FROM);
  });

  it('"fogão" sozinho retorna prompt de opções (ambiguidade)', async () => {
    const out = await orchestrateInbound(FROM, 'fogão', session);
    expect(out && typeof out !== 'string').toBe(true);
    if (typeof out !== 'string') {
      expect(out.options?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Entrega de orçamento marca orcamento_entregue=true e habilita agendamento', async () => {
    // Simular caminho até orçamento para fogão a gás
    await setSessionState(session.id, { ...(session.state||{}), dados_coletados: { equipamento: 'fogão a gás', marca: 'Brastemp', problema: 'não funciona 2 bocas' } });
    const out1 = await orchestrateInbound(FROM, 'não funciona 2 bocas', session);
    expect(typeof out1).toBe('string');

    // Recarregar sessão para obter state atualizado do Supabase
    session = await getOrCreateSession('wa', FROM);
    const st = (session as any).state || {};
    expect(!!st.orcamento_entregue).toBe(true);

    // Agora intenção de agendamento deve acionar o fluxo de agendar
    const out2 = await orchestrateInbound(FROM, 'quero agendar amanhã 9h', session);
    expect(typeof out2).toBe('string');
  });
});

