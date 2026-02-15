export function normalizePeerId(channel: string, peer: string): string {
  const ch = String(channel || '').trim().toLowerCase();
  const raw = String(peer || '').trim();
  if (!raw) return '';

  // Remove JID suffix (ex.: 5511999@c.us)
  const noJid = raw.split('@')[0];

  // Remove channel prefix (ex.: whatsapp:+5511...)
  const withoutPrefix = noJid.startsWith(`${ch}:`) ? noJid.slice(ch.length + 1) : noJid;

  if (ch === 'whatsapp') {
    // Canonical: only digits (E.164 without '+')
    return withoutPrefix.replace(/\D+/g, '');
  }

  return withoutPrefix;
}

export function getPeerIdVariants(channel: string, peer: string): string[] {
  const ch = String(channel || '').trim().toLowerCase();
  const raw = String(peer || '').trim();
  const variants = new Set<string>();

  if (!raw) return [];

  const canonical = normalizePeerId(ch, raw);
  if (canonical) variants.add(canonical);

  // Common variants we saw in logs/tests
  variants.add(raw);

  const noJid = raw.split('@')[0];
  variants.add(noJid);

  if (!noJid.startsWith(`${ch}:`)) variants.add(`${ch}:${noJid}`);

  // WhatsApp legacy formats with/without '+'
  if (ch === 'whatsapp') {
    const digits = canonical;
    if (digits) {
      variants.add(`+${digits}`);
      variants.add(`${ch}:+${digits}`);
      variants.add(`${ch}:${digits}`);
      variants.add(digits);
    }
  }

  return Array.from(variants)
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}
