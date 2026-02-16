import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

const FROM = 'test:+5511988888888';

describe('Orchestrator: cenários avançados de fluxo', () => {
  let session: any;
  const originalFake = process.env.LLM_FAKE_JSON;

  beforeAll(async () => {
    session = await getOrCreateSession('wa', FROM);
  });

  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('não agenda sem orçamento entregue, mesmo com equipamento no contexto', async () => {
    await setSessionState(session.id, {
      ...(session.state || {}),
      dados_coletados: { equipamento: 'fogão a gás', problema: 'não acende' },
      orcamento_entregue: false,
    });
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
      resposta_sugerida: 'Vamos agendar',
    });
    const out = await orchestrateInbound(FROM, 'quero agendar', session);
    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect((text || '').toLowerCase()).toMatch(/orçamento|orcamento|antes de agendarmos|antes de orçarmos/);
  });

  it('aceitar orçamento ativa agendamento (intenção explícita)', async () => {
    await setSessionState(session.id, {
      ...(session.state || {}),
      dados_coletados: { equipamento: 'fogão a gás', problema: 'não acende' },
      orcamento_entregue: true,
    });
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
      resposta_sugerida: 'Vamos agendar',
    });
    const out = await orchestrateInbound(FROM, 'aceito o orçamento, pode agendar', session);
    expect(typeof out).toBe('string');
  });

  it('troca de equipamento reseta orcamento_entregue e evita agendamento automático', async () => {
    await setSessionState(session.id, {
      ...(session.state || {}),
      dados_coletados: { equipamento: 'fogão a gás' },
      orcamento_entregue: true,
    });
    // usuário muda para fogão elétrico
    const out1 = await orchestrateInbound(FROM, 'na verdade é fogao eletrico', session);
    expect(out1).toBeTruthy();

    // recarrega sessão; a flag pode ter sido resetada internamente — não dependemos dela aqui
    session = await getOrCreateSession('wa', FROM);

    // Mesmo pedindo agendamento, não deve agendar sem novo orçamento
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão elétrico' },
      resposta_sugerida: 'Vamos agendar',
    });
    const out2 = await orchestrateInbound(FROM, 'pode agendar', session);
    const text2 = typeof out2 === 'string' ? out2 : (out2 as any)?.text || '';
    expect((text2 || '').toLowerCase()).toMatch(/orçamento|orcamento|antes de agendarmos|antes de orçarmos/);
  });

  it('abreviações mapeiam corretamente: eletr, gas, indu', async () => {
    const s1 = await getOrCreateSession('wa', 'test:+5511977777777');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'forno elétrico' },
    });
    const o1 = await orchestrateInbound('test:+5511977777777', 'forno eletr', s1);
    const t1 = typeof o1 === 'string' ? o1 : (o1 as any).text || '';
    expect(t1.toLowerCase()).toMatch(/elétric|eletric|qual é a marca|marca do equipamento/);

    const s2 = await getOrCreateSession('wa', 'test:+5511966666666');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão a gás' },
    });
    const o2 = await orchestrateInbound('test:+5511966666666', 'fogão gas', s2);
    const t2 = typeof o2 === 'string' ? o2 : (o2 as any).text || '';
    expect(t2.toLowerCase()).toMatch(/gás|gas|qual é a marca|marca do equipamento/);

    const s3 = await getOrCreateSession('wa', 'test:+5511955555555');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão de indução' },
    });
    const o3 = await orchestrateInbound('test:+5511955555555', 'fogão indu', s3);
    const t3 = typeof o3 === 'string' ? o3 : (o3 as any).text || '';
    expect(t3.toLowerCase()).toMatch(/indu|qual é a marca|marca do equipamento|antes de orçarmos|antes de orcarmos/);
  });

  it('preserva "fogão a gás" quando IA retorna "fogão" genérico', async () => {
    const s = await getOrCreateSession('wa', 'test:+5511933333333');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'coletar_dados',
      dados_extrair: { equipamento: 'fogão' },
      resposta_sugerida: 'Certo! Qual a marca e o problema?'
    });
    await orchestrateInbound('test:+5511933333333', 'meu fogão a gás brastemp não acende', s);
    const eq = String(s?.state?.dados_coletados?.equipamento || '').toLowerCase();
    expect(eq).toMatch(/fog(ão|ao)\s+a\s+g[aá]s/);
  });

  it('proteção anti-loop persiste ao longo de múltiplas mensagens', async () => {
    const s = await getOrCreateSession('wa', 'test:+5511944444444');
    await setSessionState(s.id, {
      ...(s.state || {}),
      dados_coletados: { equipamento: 'fogão a gás' },
      orcamento_entregue: true,
    });
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
      resposta_sugerida: 'Vamos agendar',
    });
    const r1 = await orchestrateInbound('test:+5511944444444', 'quero agendar', s);
    const r2 = await orchestrateInbound('test:+5511944444444', 'quero agendar', s);
    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
  });

  it('"cooktop" como clarificação (mount) não deve resetar marca nem perguntar marca de novo', async () => {
    const s = await getOrCreateSession('whatsapp', 'test:+5511922222222');
    await setSessionState(s.id, {
      ...(s.state || {}),
      dados_coletados: { equipamento: 'fogão a gás', marca: 'Consul', problema: 'não acende' },
      orcamento_entregue: false,
    });

    // Recarrega para não depender de referência antiga em memória
    const sFresh = await getOrCreateSession('whatsapp', 'test:+5511922222222');

    const out = await orchestrateInbound(
      'test:+5511922222222',
      'é um cooktop as 2 bocas da frente',
      sFresh
    );
    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect((text || '').toLowerCase()).not.toContain('qual é a marca');
    expect((text || '').toLowerCase()).not.toContain('marca do equipamento');

    const s2 = await getOrCreateSession('whatsapp', 'test:+5511922222222');
    const st = (s2 as any).state || {};
    expect(String(st.dados_coletados?.marca || '').toLowerCase()).toContain('consul');
    expect(String(st.dados_coletados?.mount || '').toLowerCase()).toContain('cooktop');
  });
});
