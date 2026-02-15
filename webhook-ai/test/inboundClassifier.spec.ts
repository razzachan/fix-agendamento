import { describe, it, expect } from 'vitest';
import {
  classifyInbound,
  normalizeComparableText,
  normalizeInboundText,
} from '../src/services/inboundClassifier.js';

describe('Inbound classifier: normalize + signals', () => {
  it('normalizeInboundText remove diacríticos e padroniza caixa/espacos', () => {
    expect(normalizeInboundText('  Fico à disposição!  ')).toBe('fico a disposicao!');
  });

  it('normalizeComparableText trata hífen/espaço/pontuação para matching', () => {
    expect(normalizeComparableText('lava-louças')).toBe('lava loucas');
    expect(normalizeComparableText('lava loucas')).toBe('lava loucas');
    expect(normalizeComparableText('  Lava—Louças  ')).toBe('lava loucas');
  });

  it('detecta saudação curta (oi/olá/opa/e aí/tudo bem)', () => {
    expect(classifyInbound('Oi').isGreetingOnly).toBe(true);
    expect(classifyInbound('Olá!').isGreetingOnly).toBe(true);
    expect(classifyInbound('Opa').isGreetingOnly).toBe(true);
    expect(classifyInbound('e aí?').isGreetingOnly).toBe(true);
    expect(classifyInbound('tudo bem!').isGreetingOnly).toBe(true);
  });

  it('detecta pedido de status', () => {
    expect(classifyInbound('Quero status da OS #123').wantsStatus).toBe(true);
    expect(classifyInbound('andamento da ordem por favor').wantsStatus).toBe(true);
    expect(classifyInbound('qual o número da OS?').wantsStatus).toBe(true);
    expect(classifyInbound('preciso do nº da OS').wantsStatus).toBe(true);
    expect(classifyInbound('me passa o numero da ordem').wantsStatus).toBe(true);
  });

  it('detecta despedida/adiamento e evita falso positivo em "vou ver o que aconteceu"', () => {
    expect(classifyInbound('vou ver com meu marido e te falo depois').isDeferralOrBye).toBe(true);
    expect(classifyInbound('tchau, obrigado').isDeferralOrBye).toBe(true);

    // Não é adiamento; é início de investigação de problema
    expect(classifyInbound('vou ver o que aconteceu com meu fogão').isDeferralOrBye).toBe(false);
  });

  it('separa instalação vs manutenção quando há negação explícita', () => {
    const a = classifyInbound('Preciso de instalação de cooktop');
    expect(a.mentionsInstall).toBe(true);
    expect(a.negatedInstall).toBe(false);

    const b = classifyInbound('não é instalação, é manutenção');
    expect(b.mentionsInstall).toBe(true);
    expect(b.negatedInstall).toBe(true);
    expect(b.looksLikeRepair).toBe(true);
  });

  it('looksLikeRepair cobre pistas comuns (chama/bocas/cheiro de gas)', () => {
    expect(classifyInbound('a chama está amarela').looksLikeRepair).toBe(true);
    expect(classifyInbound('cheiro de gás forte').looksLikeRepair).toBe(true);
    expect(classifyInbound('duas bocas não acendem').looksLikeRepair).toBe(true);
  });
});
