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
    expect((text || '').toLowerCase()).toMatch(/orçamento|orcamento/);
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
    const out1 = await orchestrateInbound(FROM, 'na verdade é fogão elétrico', session);
    expect(out1).toBeTruthy();

    // recarrega sessão e verifica flag
    session = await getOrCreateSession('wa', FROM);
    const st = (session as any).state || {};
    expect(!!st.orcamento_entregue).toBe(false);

    // Mesmo pedindo agendamento, não deve agendar sem novo orçamento
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão elétrico' },
      resposta_sugerida: 'Vamos agendar',
    });
    const out2 = await orchestrateInbound(FROM, 'pode agendar', session);
    const text2 = typeof out2 === 'string' ? out2 : (out2 as any)?.text || '';
    expect((text2 || '').toLowerCase()).toMatch(/orçamento|orcamento/);
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
    expect(t1.toLowerCase()).toMatch(/elétric|eletric/);

    const s2 = await getOrCreateSession('wa', 'test:+5511966666666');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão a gás' },
    });
    const o2 = await orchestrateInbound('test:+5511966666666', 'fogão gas', s2);
    const t2 = typeof o2 === 'string' ? o2 : (o2 as any).text || '';
    expect(t2.toLowerCase()).toMatch(/gás|gas/);

    const s3 = await getOrCreateSession('wa', 'test:+5511955555555');
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: { equipamento: 'fogão de indução' },
    });
    const o3 = await orchestrateInbound('test:+5511955555555', 'fogão indu', s3);
    const t3 = typeof o3 === 'string' ? o3 : (o3 as any).text || '';
    expect(t3.toLowerCase()).toMatch(/indu/);
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
});
