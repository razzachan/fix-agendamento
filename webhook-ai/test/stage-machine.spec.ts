import { describe, expect, it } from 'vitest';
import { applyStageToLegacyFlags, deriveStageFromLegacy, mergeStateWithStage } from '../src/services/orchestrator/stageMachine.js';

describe('stageMachine', () => {
  it('derives stage from legacy flags', () => {
    expect(deriveStageFromLegacy({})).toBe('collecting_core');
    expect(deriveStageFromLegacy({ orcamento_entregue: true })).toBe('quoted');
    expect(deriveStageFromLegacy({ accepted_service: true, collecting_personal_data: true })).toBe('collecting_personal');
    expect(deriveStageFromLegacy({ pending_time_selection: true })).toBe('confirming_slot');
  });

  it('applies stage to legacy flags consistently', () => {
    const st = applyStageToLegacyFlags({ stage: 'collecting_personal' });
    expect(st.accepted_service).toBe(true);
    expect(st.collecting_personal_data).toBe(true);
  });

  it('mergeStateWithStage keeps stage updated', () => {
    const st = mergeStateWithStage({}, { orcamento_entregue: true });
    expect(st.stage).toBe('quoted');

    const st2 = mergeStateWithStage(st, { pending_time_selection: true });
    expect(st2.stage).toBe('confirming_slot');
  });

  it('mergeStateWithStage deep-merges dados_coletados', () => {
    const prev = {
      dados_coletados: { equipamento: 'cooktop', marca: 'consul', problema: 'não acende' },
      orcamento_entregue: true,
    };

    const patched = mergeStateWithStage(prev, {
      dados_coletados: { mount: 'cooktop' },
    });

    expect(patched.dados_coletados).toMatchObject({
      equipamento: 'cooktop',
      marca: 'consul',
      problema: 'não acende',
      mount: 'cooktop',
    });

    const patched2 = mergeStateWithStage(prev, {
      dados_coletados: { marca: 'brastemp' },
    });
    expect(patched2.dados_coletados.marca).toBe('brastemp');
  });
});
