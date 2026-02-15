import { describe, expect, it } from 'vitest';
import { parseAIRoutingDecision } from '../src/services/orchestrator/aiRouterDecisionSchema.js';

describe('AI router decision schema', () => {
  it('accepts a valid decision', () => {
    const d = parseAIRoutingDecision({
      intent: 'orcamento_equipamento',
      blocos_relevantes: [1, 2],
      dados_extrair: { equipamento: 'forno elétrico', mount: 'embutido' },
      acao_principal: 'gerar_orcamento',
      resposta_sugerida: 'Perfeito! Vou te passar o valor.',
    });

    expect(d.intent).toBe('orcamento_equipamento');
    expect(d.acao_principal).toBe('gerar_orcamento');
    expect(Array.isArray(d.blocos_relevantes)).toBe(true);
  });

  it('rejects invalid intent', () => {
    expect(() =>
      parseAIRoutingDecision({
        intent: 'isso-nao-existe',
        blocos_relevantes: [],
        dados_extrair: {},
        acao_principal: 'coletar_dados',
        resposta_sugerida: '',
      })
    ).toThrow(/schema/i);
  });

  it('rejects invalid acao_principal', () => {
    expect(() =>
      parseAIRoutingDecision({
        intent: 'orcamento_equipamento',
        blocos_relevantes: [],
        dados_extrair: {},
        acao_principal: 'hackear_o_mundo',
        resposta_sugerida: '',
      })
    ).toThrow(/schema/i);
  });
});
