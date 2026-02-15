import { describe, it, expect } from 'vitest';
import { getPreferredServicesForEquipment, type ServicePolicyRow } from '../src/services/policies.js';

describe('Policies: normalização e regras explícitas', () => {
  const policies: ServicePolicyRow[] = [];

  it('Reconhece "fogao a gas" sem acentos como domicílio', () => {
    const out = getPreferredServicesForEquipment(policies, 'fogao a gas em domicilio');
    expect(out).toEqual(['domicilio']);
  });

  it('Reconhece "fogão a gás" com acentos como domicílio', () => {
    const out = getPreferredServicesForEquipment(policies, 'fogão a gás');
    expect(out).toEqual(['domicilio']);
  });

  it('Reconhece fogão elétrico (com/sem acento) como coleta diagnóstico', () => {
    const out1 = getPreferredServicesForEquipment(policies, 'fogão elétrico');
    const out2 = getPreferredServicesForEquipment(policies, 'fogao eletrico');
    expect(out1).toEqual(['coleta_diagnostico']);
    expect(out2).toEqual(['coleta_diagnostico']);
  });

  it('Fogão sem tipo (gas/eletrico/inducao) permanece ambíguo', () => {
    const out = getPreferredServicesForEquipment(policies, 'fogao');
    expect(out).toEqual([]);
  });
});
