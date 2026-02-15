type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function maskDigits(digits: string): string {
  const d = String(digits || '').replace(/\D+/g, '');
  if (d.length <= 4) return '****';
  return `${d.slice(0, 2)}****${d.slice(-2)}`;
}

export function maskPeerId(peerId?: string): string {
  if (!peerId) return '';
  // Common formats: "5511999999999@c.us" or "+5511999999999" etc.
  const digits = String(peerId).replace(/\D+/g, '');
  const masked = digits ? maskDigits(digits) : '****';
  const suffix = String(peerId).includes('@') ? '@…' : '';
  return masked + suffix;
}

function redactString(s: string): string {
  // Redact long digit sequences that look like phone/CPF.
  return s.replace(/\d{8,}/g, (m) => maskDigits(m));
}

function redactObject(value: any): any {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactObject);

  const out: any = {};
  for (const [k, v] of Object.entries(value)) {
    const key = String(k).toLowerCase();
    if (key.includes('peer') || key.includes('from') || key.includes('telefone') || key.includes('phone') || key.includes('cpf')) {
      out[k] = typeof v === 'string' ? maskPeerId(v) : '****';
    } else {
      out[k] = redactObject(v);
    }
  }
  return out;
}

function shouldLog(level: LogLevel): boolean {
  if (level === 'debug') return process.env.DEBUG_WEBHOOK === '1';
  return true;
}

function emit(level: LogLevel, msg: string, meta?: any) {
  if (!shouldLog(level)) return;
  const safeMeta = meta === undefined ? undefined : redactObject(meta);
  const fn = level === 'debug' ? console.log : level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  if (safeMeta !== undefined) fn(msg, safeMeta);
  else fn(msg);
}

export const logger = {
  debug(msg: string, meta?: any) {
    emit('debug', msg, meta);
  },
  info(msg: string, meta?: any) {
    emit('info', msg, meta);
  },
  warn(msg: string, meta?: any) {
    emit('warn', msg, meta);
  },
  error(msg: string, meta?: any) {
    emit('error', msg, meta);
  },
};
