import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

function toText(out: any): string {
  return typeof out === 'string' ? out : (out as any)?.text || '';
}

function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

describe('Adiamento/despedida: orquestrador reconhece e não empurra fluxo', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('"vou ver com meu marido e te falo depois" retorna resposta de adiamento e soft-close', async () => {
    // Se cair no LLM por algum motivo, força decisão neutra para manter o teste determinístico.
    process.env.LLM_FAKE_JSON = JSON.stringify({ intent: 'outros', acao_principal: 'responder_informacao' });

    const session: any = { id: 'sess-defer-1', channel: 'whatsapp', peer: '+5599003', state: {} };
    const out = await orchestrateInbound('test:+5599003', 'vou ver com meu marido e te falo depois', session);
    const text = norm(toText(out));

    expect(text).toMatch(/fico\s+a\s+disposi/);
    expect(session.state?.soft_closed_at).toBeTruthy();
  });

  it('"vou ver o que aconteceu" (sem adiamento) não deve soft-close', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão' },
    });

    const session: any = { id: 'sess-defer-2', channel: 'whatsapp', peer: '+5599004', state: {} };
    const out = await orchestrateInbound('test:+5599004', 'vou ver o que aconteceu com meu fogão', session);
    const text = norm(toText(out));

    expect(text).not.toMatch(/fico\s+a\s+disposi/);
    expect(session.state?.soft_closed_at).toBeFalsy();
  });
});
