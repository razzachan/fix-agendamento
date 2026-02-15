import { describe, expect, it } from 'vitest';
import { normalizePeerId, getPeerIdVariants } from '../src/services/peerId.js';

describe('peerId: normalization', () => {
  it('normalizes WhatsApp variants to digits-only', () => {
    expect(normalizePeerId('whatsapp', '+55 (11) 99999-0002')).toBe('5511999990002');
    expect(normalizePeerId('whatsapp', 'whatsapp:+5511999990002')).toBe('5511999990002');
    expect(normalizePeerId('whatsapp', '5511999990002@c.us')).toBe('5511999990002');
  });

  it('provides useful variants for backward-compat lookups', () => {
    const vars = getPeerIdVariants('whatsapp', 'whatsapp:+5511999990002@c.us');
    expect(vars).toContain('5511999990002');
    expect(vars).toContain('+5511999990002');
    expect(vars).toContain('whatsapp:+5511999990002');
  });
});
