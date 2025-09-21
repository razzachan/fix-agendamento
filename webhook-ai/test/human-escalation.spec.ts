import { describe, it, expect } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

function t(out: any): string {
  return (typeof out === 'string' ? out : (out?.text || '')).toLowerCase();
}

const FROM = 'whatsapp:+551199999999';

describe('Escalação para humano (handoff) e pausa/retomada do bot', () => {
  it('Pedido direto por humano pausa o bot e responde mensagem de handoff', async () => {
    const session: any = { id: 'sess-human-1', channel: 'whatsapp', peer: '+551199999999', state: {} };

    const out = await orchestrateInbound(FROM, 'quero falar com humano', session);
    const text = t(out);

    expect(text).toMatch(/bot pausado|aguardando atendimento humano|vou te transferir|atendentes humanos/);
    expect(session?.state?.bot_paused).toBe(true);
    expect(session?.state?.human_requested).toBe(true);
  });

  it('Enquanto pausado, qualquer mensagem mantém a pausa e orienta como voltar', async () => {
    const session: any = { id: 'sess-human-2', channel: 'whatsapp', peer: '+551199999999', state: { bot_paused: true, human_requested: true } };

    const out = await orchestrateInbound(FROM, 'e aí?', session);
    const text = t(out);

    expect(text).toMatch(/atendentes humanos|voltar ao bot/);
    expect(session?.state?.bot_paused).toBe(true);
  });

  it('Comando de retomada "voltar ao bot" despausa e volta ao funil', async () => {
    const session: any = { id: 'sess-human-3', channel: 'whatsapp', peer: '+551199999999', state: { bot_paused: true, human_requested: true } };

    const out = await orchestrateInbound(FROM, 'voltar ao bot', session);
    const text = t(out);

    expect(text).toMatch(/voltando com o assistente|equipamento e qual o problema/);
    expect(session?.state?.bot_paused).toBe(false);
    expect(session?.state?.human_requested).toBe(false);
  });
});

