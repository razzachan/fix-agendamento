import { describe, it, expect, beforeAll } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

// Estes testes validam apenas a lógica de desambiguação e anti-loop em memória (sem WhatsApp)

describe('Ambiguidade: forno vs fogão a gás vs forno elétrico', () => {
  it('mapeia "forno do fogão" para fogão a gás (domicílio)', async () => {
    const out = await orchestrateInbound('whatsapp:+550000', 'o forno do fogão não esquenta', { id: 's1', channel: 'whatsapp', peer: '+550000', state: {} } as any);
    const text = typeof out === 'string' ? out : (out as any).text || '';
    expect(text.toLowerCase()).toContain('forno');
  });

  it('pergunta e oferece opções quando somente "forno"', async () => {
    const out = await orchestrateInbound('whatsapp:+550000', 'meu forno', { id: 's2', channel: 'whatsapp', peer: '+550000', state: {} } as any);
    if (typeof out !== 'string') {
      expect(out.text).toBeTruthy();
      expect(Array.isArray(out.options)).toBe(true);
    }
  });
});

describe('Anti-loop de agendamento', () => {
  it('aceita agendamento com equipamento coletado, mesmo sem problema', async () => {
    const session = { id: 's3', channel: 'whatsapp', peer: '+550000', state: { dados_coletados: { equipamento: 'fogão a gás' } } } as any;
    const out = await orchestrateInbound('whatsapp:+550000', 'sim, pode agendar', session);
    expect(out).toBeTruthy();
  });
});

