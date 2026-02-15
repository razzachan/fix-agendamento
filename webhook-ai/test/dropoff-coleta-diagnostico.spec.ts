import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

const FROM = 'test:+5511912345678';

describe('Coleta diagnóstico: resposta fixa para entrega direta na empresa', () => {
  let session: any;
  const originalFake = process.env.LLM_FAKE_JSON;

  beforeAll(async () => {
    session = await getOrCreateSession('wa', FROM);
  });

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('quando último orçamento é coleta_diagnostico e usuário pergunta se pode levar na empresa, retorna script fixo', async () => {
    await setSessionState(session.id, {
      ...(session.state || {}),
      orcamento_entregue: true,
      last_quote_ts: Date.now(),
      last_quote: {
        service_type: 'coleta_diagnostico',
        found: true,
        value: 350,
      },
    });

    session = await getOrCreateSession('wa', FROM);

    const out = await orchestrateInbound(FROM, 'posso levar diretamente na empresa?', session);
    expect(out).toBe(
      'Atendemos toda região da Grande Floripa e BC, nossa logistica é atrelada às ordens de serviço.\n\n' +
        'Coletador pega ai e já leva pra nossa oficina mais próxima por questão logística.\n\n' +
        'Aqui é só escritório.\n\n' +
        'Mas coletamos aí e entregamos ai.\n\n' +
        'Gostaria de agendar?'
    );
  });

  it('não dispara para outros service_type (evita falso positivo)', async () => {
    await setSessionState(session.id, {
      ...(session.state || {}),
      orcamento_entregue: true,
      last_quote_ts: Date.now(),
      last_quote: {
        service_type: 'domicilio',
        found: true,
        value: 320,
      },
    });
    session = await getOrCreateSession('wa', FROM);

    // Se cair em IA, force um retorno determinístico para não depender de rede
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'informacao',
      acao_principal: 'informar',
      resposta_sugerida: 'Ok',
    });

    const out = await orchestrateInbound(FROM, 'posso levar diretamente na empresa?', session);
    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect(text).not.toContain('Aqui é só escritório.');
  });
});
