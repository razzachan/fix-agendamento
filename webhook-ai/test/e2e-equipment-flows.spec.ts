import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

function setFakeDecision(intent: string, acaoPrincipal: string, dadosExtrair: any) {
  process.env.LLM_FAKE_JSON = JSON.stringify({
    intent,
    acao_principal: acaoPrincipal,
    dados_extrair: dadosExtrair,
  });
}

async function runTurn(
  session: any,
  message: string,
  decision: { intent: string; acao: string; dados: any }
) {
  setFakeDecision(decision.intent, decision.acao, decision.dados);
  const out = await orchestrateInbound('whatsapp:+550000', message, session);
  return typeof out === 'string' ? out : (out as any)?.text || '';
}

describe('E2E por equipamento (determinístico, sem rede)', () => {
  const originalFake = process.env.LLM_FAKE_JSON;

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('Fogão manutenção: não pergunta registro de gás mesmo se preso em installation_mode', async () => {
    const session: any = {
      id: 'sess-e2e-fogao-repair',
      channel: 'whatsapp',
      peer: '+550000',
      state: {
        installation_mode: true,
        installation_has_gas_valve: undefined,
        dados_coletados: { equipamento: 'fogão a gás' },
      },
    };

    const text = await runTurn(session, 'o meu fogao esta falhando 2 bocas as chamas nao ligam', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: { equipamento: 'fogão a gás', problema: '2 bocas não acendem' },
    });

    const lower = text.toLowerCase();
    expect(lower).not.toMatch(/registro de g[aá]s|mangueira de g[aá]s|\bv[aá]lvula\b|\bvalvula\b/);
    expect(!!session.state.installation_mode).toBe(false);

    // Como não informamos marca, o fluxo deve pedir marca.
    expect(lower).toMatch(/qual é a marca|marca do equipamento|\bmarca\b/);
  });

  it('Fogão: após usuário responder “é Consul”, não deve pedir marca de novo', async () => {
    const session: any = {
      id: 'sess-e2e-brand-repeat',
      channel: 'whatsapp',
      peer: '+550000',
      state: {
        dados_coletados: { equipamento: 'fogão a gás' },
      },
    };

    const first = await runTurn(session, 'meu fogão não acende duas bocas', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: { equipamento: 'fogão a gás', problema: 'duas bocas não acendem' },
    });
    expect(first.toLowerCase()).toMatch(/qual é a marca|marca do equipamento|\bmarca\b/);

    const second = await runTurn(session, 'é Consul', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: { equipamento: 'fogão a gás', marca: 'Consul', problema: 'duas bocas não acendem' },
    });

    const lower2 = second.toLowerCase();
    expect(lower2).not.toMatch(/qual é a marca|marca do equipamento/);
    // Deve avançar (orçamento OU pedir detalhe do defeito), mas nunca voltar para “marca”.
    expect(lower2).toMatch(/problema|defeito|descrever|o que est[aá] acontecendo|bocas?/);
  });

  it('Micro-ondas de bancada: política de coleta + conserto (não domicílio)', async () => {
    const session: any = {
      id: 'sess-e2e-micro',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    };

    const text = await runTurn(session, 'meu microondas não esquenta', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: { equipamento: 'micro-ondas', marca: 'LG', problema: 'não esquenta', mount: 'bancada' },
    });

    const lower = text.toLowerCase();
    const askedBrand =
      lower.includes('qual é a marca') ||
      lower.includes('marca do equipamento') ||
      /\bmarca\b/.test(lower);
    const coletaConserto = lower.includes('coleta + conserto');
    expect(askedBrand || coletaConserto).toBe(true);

    // Canonical funnel state should be persisted on session
    expect(session?.state?.funnel?.mount).toBe('bancada');
    if (coletaConserto) {
      expect(lower).not.toContain('valor de manutenção fica em r$');
    }
    expect(lower).not.toMatch(/registro de g[aá]s/);
  });

  it('Forno elétrico embutido: coleta diagnóstico (não domicílio)', async () => {
    const session: any = {
      id: 'sess-e2e-forno',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    };

    const text = await runTurn(session, 'meu forno elétrico embutido não aquece', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: {
        equipamento: 'forno elétrico',
        marca: 'Electrolux',
        problema: 'não aquece',
        mount: 'embutido',
      },
    });

    const lower = text.toLowerCase();
    const askedBrand =
      lower.includes('qual é a marca') ||
      lower.includes('marca do equipamento') ||
      /\bmarca\b/.test(lower);
    const diag = lower.includes('coleta diagnóstico') || lower.includes('coletamos, diagnosticamos');
    expect(askedBrand || diag).toBe(true);
    if (diag) {
      expect(lower).not.toContain('valor de manutenção fica em r$');
    }
  });

  it('Coifa: usa domicílio e não mistura com perguntas de fogão/registro', async () => {
    const session: any = {
      id: 'sess-e2e-coifa',
      channel: 'whatsapp',
      peer: '+550000',
      state: {},
    };

    const text = await runTurn(session, 'minha coifa faz muito barulho', {
      intent: 'orcamento_equipamento',
      acao: 'gerar_orcamento',
      dados: { equipamento: 'coifa', marca: 'Tramontina', problema: 'faz barulho' },
    });

    const lower = text.toLowerCase();
    expect(lower).not.toMatch(/registro de g[aá]s|bocas? n[aã]o acendem/);
    expect(lower).toMatch(/visita\s+diagn[oó]stic/i);
    expect(lower).toMatch(/r\$\s*\d+/i);
    expect(lower).not.toContain('coleta diagnóstico');
  });
});
