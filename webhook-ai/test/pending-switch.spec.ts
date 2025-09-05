import { describe, it, expect, beforeAll } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

const FROM = 'test:+5511990000000';

describe('Confirmação de troca de equipamento (pendingEquipmentSwitch)', () => {
  let session: any;

  beforeAll(async () => {
    session = await getOrCreateSession('wa', FROM);
  });

  it('quando pending existe e usuário confirma (sim), troca equipamento e reseta orçamento', async () => {
    await setSessionState(session.id, { ...(session.state||{}),
      dados_coletados: { equipamento: 'fogão a gás', marca: 'Brastemp', problema: 'não acende' },
      orcamento_entregue: true,
      pendingEquipmentSwitch: 'fogão elétrico'
    });

    const out = await orchestrateInbound(FROM, 'sim, pode trocar', session);
    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect(text.toLowerCase()).toContain('fogão elétrico');

    // Carregar sessão novamente para garantir persistência
    const s2 = await getOrCreateSession('wa', FROM);
    const st = (s2 as any).state || {};
    expect(st.dados_coletados?.equipamento).toBe('fogão elétrico');
    expect(!!st.orcamento_entregue).toBe(false);
    expect(st.pendingEquipmentSwitch).toBeFalsy();
  });

  it('quando pending existe e usuário nega (não), mantém equipamento e limpa pending', async () => {
    await setSessionState(session.id, { ...(session.state||{}),
      dados_coletados: { equipamento: 'fogão a gás' },
      orcamento_entregue: true,
      pendingEquipmentSwitch: 'fogão de indução'
    });

    const out = await orchestrateInbound(FROM, 'não, manter', session);
    const text = typeof out === 'string' ? out : (out as any)?.text || '';
    expect(text.toLowerCase()).toContain('mantemos fogão a gás');

    const s2 = await getOrCreateSession('wa', FROM);
    const st = (s2 as any).state || {};
    expect(st.dados_coletados?.equipamento).toBe('fogão a gás');
    expect(!!st.orcamento_entregue).toBe(true);
    expect(st.pendingEquipmentSwitch).toBeFalsy();
  });
});

