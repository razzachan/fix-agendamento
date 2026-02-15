import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

// Estes testes validam a lógica de desambiguação e anti-loop. Usamos LLM_FAKE_JSON para tornar determinístico.

describe('Ambiguidade: forno vs fogão a gás vs forno elétrico', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('mapeia "forno do fogão" para fogão a gás (domicílio)', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão a gás' },
    });
    const out = await orchestrateInbound('whatsapp:+550000', 'o forno do fogão não esquenta', {
      id: 's1',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    } as any);
    const text = typeof out === 'string' ? out : (out as any).text || '';
    const t = text.toLowerCase();
    expect(t.includes('fogão a gás') || t.includes('qual é a marca')).toBe(true);
  });

  it('pergunta e oferece opções quando somente "forno"', async () => {
    const out = await orchestrateInbound('whatsapp:+550000', 'meu forno', {
      id: 's2',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    } as any);
    if (typeof out !== 'string') {
      expect(out.text).toBeTruthy();
      expect(Array.isArray(out.options)).toBe(true);
    }
  });
});

describe('Anti-loop de agendamento', () => {
  it('aceita agendamento com equipamento coletado, mesmo sem problema', async () => {
    const session = {
      id: 's3',
      channel: 'whatsapp',
      peer: '+550000',
      state: { dados_coletados: { equipamento: 'fogão a gás' }, orcamento_entregue: true },
    } as any;
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
    });
    const out = await orchestrateInbound('whatsapp:+550000', 'sim, pode agendar', session);
    expect(out).toBeTruthy();
  });
});

describe('Desambiguação de mount (micro/forno)', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('pergunta embutido/bancada quando micro-ondas vem sem mount', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'micro-ondas', marca: 'LG', problema: 'não esquenta' },
    });
    const out = await orchestrateInbound('whatsapp:+550000', 'não esquenta', {
      id: 's4',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    } as any);
    const text = typeof out === 'string' ? out : (out as any).text || '';
    expect(text.toLowerCase()).toMatch(/embutid|bancada/);
  });

  it('pergunta embutido/bancada quando forno vem sem mount', async () => {
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'forno elétrico', marca: 'Philco', problema: 'não esquenta' },
    });
    const out = await orchestrateInbound('whatsapp:+550000', 'não esquenta', {
      id: 's5',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    } as any);
    const text = typeof out === 'string' ? out : (out as any).text || '';
    expect(text.toLowerCase()).toMatch(/embutid|bancada/);
  });
});
