import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

// Esse teste garante que o modo instalação não fique preso quando o usuário descreve defeito.
describe('Installation mode: exit on repair symptoms', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('clears installation_mode when message looks like maintenance/repair', async () => {
    // Força a IA a não interferir na resposta; o bug aqui é 100% de state-machine.
    process.env.LLM_FAKE_JSON = '';

    const session: any = {
      id: 'sess-install-exit',
      channel: 'whatsapp',
      peer: '+550000',
      state: {
        installation_mode: true,
        installation_has_gas_valve: undefined,
        dados_coletados: {
          equipamento: 'fogão a gás',
        },
      },
    };

    const out = await orchestrateInbound(
      'whatsapp:+550000',
      'o meu fogao esta falhando 2 bocas as chamas nao ligam',
      session
    );

    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect(text.toLowerCase()).not.toMatch(/registro de g[aá]s|registro de gas/);
    expect(!!session.state.installation_mode).toBe(false);
  });
});
