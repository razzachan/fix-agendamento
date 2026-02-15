import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

// Regression: em produção o LLM pode errar e cair em "instalação" mesmo sendo manutenção.
// Esse teste garante que negação explícita e mensagens típicas de conserto
// NÃO retornem o template de instalação (embutido/bancada).

describe('Instalação: negação e manutenção não devem ficar presas no template', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('"não é instalação, é manutenção": não deve responder como instalação', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'instalacao',
      acao_principal: 'coletar_dados',
      dados_extrair: { equipamento: 'fogão' },
      resposta_sugerida:
        'Legal! Para a instalação, preciso de: equipamento, tipo (embutido ou bancada)...'
    });

    const out = await orchestrateInbound('test:+5599001', 'não é instalação; é manutenção do meu fogão', {
      id: 'sess-install-neg-1',
      channel: 'whatsapp',
      peer: '+5599001',
      state: {}
    } as any);

    const text = typeof out === 'string' ? out : (out as any).text || '';
    const lower = text.toLowerCase();

    expect(lower).not.toMatch(/para a instala/);
    expect(lower).toMatch(/marca|defeito|problema|equipamento/);
  });

  it('mensagem típica de conserto: não deve responder como instalação', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'instalacao',
      acao_principal: 'coletar_dados',
      dados_extrair: { equipamento: 'fogão' },
      resposta_sugerida:
        'Legal! Para a instalação, preciso de: equipamento, tipo (embutido ou bancada)...'
    });

    const out = await orchestrateInbound('test:+5599002', 'meu fogão não liga as chamas', {
      id: 'sess-install-neg-2',
      channel: 'whatsapp',
      peer: '+5599002',
      state: {}
    } as any);

    const text = typeof out === 'string' ? out : (out as any).text || '';
    const lower = text.toLowerCase();

    expect(lower).not.toMatch(/para a instala/);
    expect(lower).toMatch(/marca|defeito|problema|equipamento/);
  });
});
