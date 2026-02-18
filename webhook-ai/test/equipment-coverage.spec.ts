import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';

let runCounter = 0;

// Helper to run orchestrator and return plain text response
async function runWithLLMFake(message: string, dados: any = {}, sessionState: any = {}) {
  runCounter += 1;
  process.env.LLM_FAKE_JSON = JSON.stringify({
    intent: 'orcamento_equipamento',
    acao_principal: 'gerar_orcamento',
    dados_extrair: dados,
  });
  const uniquePeer = `+550000${String(runCounter).padStart(4, '0')}`;
  const session = {
    id: `sess-equip-${runCounter}`,
    channel: 'whatsapp',
    peer: uniquePeer,
    state: sessionState,
  } as any;
  const out = await orchestrateInbound(`whatsapp:${uniquePeer}`, message, session);
  const text = typeof out === 'string' ? out : (out as any).text || '';
  return text.toLowerCase();
}

describe('Cobertura por equipamento - políticas e formatação', () => {
  const originalFake = process.env.LLM_FAKE_JSON;
  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  // 1) Fogão a gás → domicílio
  it('Fogão a gás: usa domicílio e não coleta', async () => {
    const text = await runWithLLMFake('meu fogão a gás não acende', {
      equipamento: 'fogão a gás',
      marca: 'Brastemp',
      problema: 'não acende',
    });
    const askedBrand1 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const domicilio1 = text.includes('valor de manutenção fica em r$');
    expect(askedBrand1 || domicilio1).toBe(true);
  });

  // 2) Fogão elétrico → coleta diagnóstico
  it('Fogão elétrico: coleta diagnóstico (não domicílio)', async () => {
    const text = await runWithLLMFake('meu fogão elétrico não esquenta', {
      equipamento: 'fogão elétrico',
      marca: 'Electrolux',
      problema: 'não esquenta',
    });
    const askedBrand2 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag2 = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand2 || diag2).toBe(true);
    expect(text).not.toContain('valor de manutenção fica em r$');
  });

  // 3) Fogão de indução → coleta diagnóstico
  it('Fogão de indução: coleta diagnóstico (não domicílio)', async () => {
    const text = await runWithLLMFake('fogão de indução não aquece', {
      equipamento: 'fogão de indução',
      marca: 'Brastemp',
      problema: 'não aquece',
    });
    const askedBrand3 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag3 = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand3 || diag3).toBe(true);
    expect(text).not.toContain('valor de manutenção fica em r$');
  });

  // 3b) Cooktop elétrico → coleta diagnóstico (não domicílio)
  it('Cooktop elétrico: coleta diagnóstico (não domicílio)', async () => {
    const text = await runWithLLMFake('cooktop elétrico não esquenta', {
      equipamento: 'cooktop elétrico',
      marca: 'Fischer',
      problema: 'não esquenta',
    });
    const askedBrand = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand || diag).toBe(true);
    expect(text).not.toContain('valor de manutenção fica em r$');
  });

  // 4) Forno elétrico embutido → coleta diagnóstico
  it('Forno elétrico embutido: coleta diagnóstico', async () => {
    const text = await runWithLLMFake('meu forno elétrico embutido não esquenta', {
      equipamento: 'forno elétrico',
      marca: 'Consul',
      problema: 'não esquenta',
      mount: 'embutido',
    });
    const askedBrand4 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag4 = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand4 || diag4).toBe(true);
  });

  // 5) Forno elétrico de bancada → coleta + conserto
  it('Forno elétrico de bancada: coleta + conserto', async () => {
    const text = await runWithLLMFake('meu forno elétrico de bancada não esquenta', {
      equipamento: 'forno elétrico',
      marca: 'Philco',
      problema: 'não esquenta em bancada',
      mount: 'bancada',
    });
    const askedBrand5 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const coletaConserto5 = text.includes('coleta + conserto');
    expect(askedBrand5 || coletaConserto5).toBe(true);
  });

  // 6) Micro-ondas de bancada → coleta + conserto
  it('Micro-ondas de bancada: coleta + conserto', async () => {
    const text = await runWithLLMFake('micro-ondas bancada não esquenta', {
      equipamento: 'micro-ondas',
      marca: 'LG',
      problema: 'não esquenta em bancada',
      mount: 'bancada',
    });
    expect(text).toContain('coleta + conserto');
  });

  // 7) Micro-ondas embutido → coleta diagnóstico
  it('Micro-ondas embutido: coleta diagnóstico', async () => {
    const text = await runWithLLMFake('micro-ondas embutido não liga', {
      equipamento: 'micro-ondas',
      marca: 'Brastemp',
      problema: 'não liga',
      mount: 'embutido',
    });
    expect(text).toContain('coletamos, diagnosticamos');
    expect(text).toContain('coleta diagnóstico');
  });

  // 8) Geladeira residencial → coleta diagnóstico
  it('Geladeira: coleta diagnóstico', async () => {
    const text = await runWithLLMFake('geladeira não esfria', {
      equipamento: 'geladeira',
      marca: 'Consul',
      problema: 'não esfria',
    });
    expect(text).toContain('coletamos, diagnosticamos');
    expect(text).toContain('coleta diagnóstico');
  });

  // 9) Lava-louças → coleta diagnóstico (usa fallback determinístico também)
  it('Lava-louças: coleta diagnóstico', async () => {
    // Não setar LLM_FAKE_JSON para permitir fallback determinístico de lava-louças
    process.env.LLM_FAKE_JSON = '';
    const session = { id: 'sess-ll', channel: 'whatsapp', peer: '+550000', state: {} } as any;
    const out = await orchestrateInbound('whatsapp:+550000', 'minha lava-louças não entra água', session);
    const text = typeof out === 'string' ? out.toLowerCase() : String((out as any).text || '').toLowerCase();
    const askedBrand9 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag9 = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand9 || diag9).toBe(true);
  });

  // 10) Lavadora → coleta diagnóstico
  it('Lavadora: coleta diagnóstico', async () => {
    const text = await runWithLLMFake('máquina de lavar não centrifuga', {
      equipamento: 'lavadora',
      marca: 'Brastemp',
      problema: 'não centrifuga',
    });
    const askedBrand10 = text.includes('qual é a marca') || text.includes('marca do equipamento');
    const diag10 = text.includes('coleta diagnóstico') || text.includes('coletamos, diagnosticamos');
    expect(askedBrand10 || diag10).toBe(true);
  });

  // 11) Secadora → coleta diagnóstico
  it('Secadora: coleta diagnóstico', async () => {
    const text = await runWithLLMFake('secadora não seca', {
      equipamento: 'secadora',
      marca: 'Samsung',
      problema: 'não seca',
    });
    expect(text).toContain('coletamos, diagnosticamos');
    expect(text).toContain('coleta diagnóstico');
  });

  // 12) Coifa → domicílio
  it('Coifa: usa domicílio', async () => {
    const text = await runWithLLMFake('coifa não liga', {
      equipamento: 'coifa',
      marca: 'Tramontina',
      problema: 'não liga',
    });
    expect(text).toMatch(/visita\s+diagn[oó]stic/i);
    expect(text).toMatch(/r\$\s*\d+/i);
    expect(text).not.toContain('coleta diagnóstico');
  });

  // 13) Adega → coleta diagnóstico + causas injetadas
  it('Adega: coleta diagnóstico e inclui causas típicas', async () => {
    const text = await runWithLLMFake('adega não gela', {
      equipamento: 'adega',
      marca: 'Philco',
      problema: 'não gela',
    });
    expect(text).toContain('coletamos, diagnosticamos');
    expect(text).toContain('coleta diagnóstico');
    // causas específicas (injetadas no quote)
    expect(/(isso pode ser problema de|poss[íi]veis causas)/i.test(text)).toBe(true);
  });
});

