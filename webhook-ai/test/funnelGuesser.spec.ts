import { describe, it, expect } from 'vitest';
import { guessFunnelFields } from '../src/services/funnelGuesser.js';

describe('Funnel guesser: heurísticas determinísticas', () => {
  it('detecta fogão + marca + problema + número de bocas', () => {
    const out = guessFunnelFields('Meu fogão Brastemp de 5 bocas não acende');
    expect(out).toMatchObject({
      equipamento: 'fogão',
      marca: 'brastemp',
      problema: 'nao acende',
      num_burners: '5',
    });
    expect(out.equipamentosEncontrados.length).toBeGreaterThan(0);
  });

  it('detecta lavadora + marca + problema', () => {
    const out = guessFunnelFields('Minha lavadora Electrolux não funciona');
    expect(out).toMatchObject({
      equipamento: 'lavadora',
      marca: 'electrolux',
      problema: 'nao funciona',
    });
  });

  it('detecta micro-ondas e problema', () => {
    const out = guessFunnelFields('Micro-ondas não esquenta');
    expect(out.equipamentosEncontrados).toContain('micro-ondas');
    expect(out.problema).toBe('nao esquenta');
  });
});
