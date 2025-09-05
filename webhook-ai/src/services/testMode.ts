let testModeEnabled = false;
// Permitidos podem ser configurados via env TEST_ALLOWED_DIGITS=4899...,55119... (CSV)
const envAllowed = (process.env.TEST_ALLOWED_DIGITS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedDigits = envAllowed.length ? envAllowed : ['48991962111']; // números sem DDI por padrão

function normalizePeerToDigits(peer?: string): string {
  if (!peer) return '';
  const noJid = String(peer).split('@')[0];
  const digits = noJid.replace(/\D+/g, '');
  return digits;
}

export function isTestModeEnabled() {
  return testModeEnabled;
}

export function setTestModeEnabled(v: boolean) {
  testModeEnabled = !!v;
}

export function isPeerAllowedForTestMode(peer?: string): boolean {
  const d = normalizePeerToDigits(peer);
  if (!d) return false;
  // aceita igual ao permitido (sem DDI) ou com DDI 55; também aceita endsWith para cobrir wa jid com sufixos
  for (const base of allowedDigits) {
    const b = base.replace(/\D+/g, '');
    if (!b) continue;
    if (d === b) return true; // 4899...
    if (d === `55${b}`) return true; // 55 + 4899...
    if (d.endsWith(b)) return true; // ...4899... (cobrir variações de jid)
  }
  return false;
}

export function getTestModeStatus() {
  return { enabled: testModeEnabled, allowed: allowedDigits.slice() };
}

// Utilitário para validar destino em modo de teste
export function assertSendAllowedInTestMode(to?: string) {
  if (!isTestModeEnabled()) return;
  if (!isPeerAllowedForTestMode(to)) {
    const d = to || '';
    throw new Error(`test_mode_blocked: envio bloqueado para ${d}`);
  }
}
