import { normalizeComparableText, normalizeInboundText, type InboundSignals } from './inboundClassifier.js';
import type { FunnelFields } from './funnelGuesser.js';

export type EquipmentFamily =
  | 'fogao'
  | 'forno'
  | 'microondas'
  | 'lavadora'
  | 'lava_loucas'
  | 'secadora'
  | 'geladeira'
  | 'coifa'
  | 'adega'
  | 'unknown';

export type Mount = 'piso' | 'cooktop' | 'bancada' | 'embutido' | null;
export type PowerType = 'gas' | 'inducao' | 'eletrico' | null;

export type FunnelState = {
  equipamento: string | null;
  equipment_family: EquipmentFamily;
  marca: string | null;
  problema: string | null;
  mount: Mount;
  power_type: PowerType;
  num_burners: string | null;
};

export function getDefaultFunnelState(): FunnelState {
  return {
    equipamento: null,
    equipment_family: 'unknown',
    marca: null,
    problema: null,
    mount: null,
    power_type: null,
    num_burners: null,
  };
}

export function equipmentFamilyOf(equipamento: string | null | undefined): EquipmentFamily {
  const norm = normalizeComparableText(String(equipamento || ''));
  if (!norm) return 'unknown';
  if (/\bfogao\b|\bcooktop\b/.test(norm)) return 'fogao';
  if (/\bmicro\b|microondas/.test(norm)) return 'microondas';
  if (/lava louc|lava louca|lava loucas|lavalouc/.test(norm)) return 'lava_loucas';
  if (/lava e seca|lavadora|maquina de lavar|lava roupa/.test(norm)) return 'lavadora';
  if (/secadora/.test(norm)) return 'secadora';
  if (/geladeira|freezer/.test(norm)) return 'geladeira';
  if (/coifa|depurador|exaustor/.test(norm)) return 'coifa';
  if (/adega/.test(norm)) return 'adega';
  if (/\bforno\b/.test(norm)) return 'forno';
  return 'unknown';
}

function parsePowerTypeFromText(text: string): PowerType {
  const raw = String(text || '');
  const norm = normalizeComparableText(raw);
  if (!norm) return null;
  if (/\binducao\b/.test(norm)) return 'inducao';
  if (/\beletrico\b/.test(norm)) return 'eletrico';
  if (/\bgas\b|\ba gas\b/.test(norm)) return 'gas';
  return null;
}

function parseMountFromText(text: string): Mount {
  const norm = normalizeComparableText(String(text || ''));
  if (!norm) return null;
  if (/\bcooktop\b/.test(norm)) return 'cooktop';
  if (/\b(piso|de piso)\b/.test(norm)) return 'piso';
  if (/\bembut(ido|ir)\b/.test(norm)) return 'embutido';
  if (/\bbancada\b/.test(norm)) return 'bancada';
  return null;
}

export function isSameEquipmentFamily(a: string | null | undefined, b: string | null | undefined): boolean {
  const fa = equipmentFamilyOf(a);
  const fb = equipmentFamilyOf(b);
  if (fa === 'unknown' || fb === 'unknown') return false;
  // Fogão/cooktop é a mesma família por definição.
  return fa === fb;
}

export function normalizeProblemFromDados(dados: any): string | null {
  const prob =
    String(dados?.problema || '').trim() ||
    String(dados?.descricao_problema || '').trim() ||
    String(dados?.description || '').trim() ||
    null;
  return prob;
}

export function mergeFunnelState(prev: FunnelState | null | undefined, patch: Partial<FunnelState>): FunnelState {
  const base = prev ? { ...getDefaultFunnelState(), ...prev } : getDefaultFunnelState();
  const next: FunnelState = { ...base };

  // Only fill missing fields unless patch explicitly sets value (non-null)
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof FunnelState;
    if (v == null) continue;
    const current = next[key];
    if (current == null || current === '' || current === 'unknown') {
      (next as any)[key] = v;
    } else {
      // Allow equipment overwrite only if it is more specific (heuristic)
      if (key === 'equipamento') {
        const cur = normalizeComparableText(String(current));
        const incoming = normalizeComparableText(String(v));
        if (incoming.length > cur.length) (next as any)[key] = v;
      }
    }
  }

  // Derivations
  next.equipment_family = equipmentFamilyOf(next.equipamento);

  return next;
}

export function deriveFunnelPatchFromGuess(guess: FunnelFields, rawText: string): Partial<FunnelState> {
  const patch: Partial<FunnelState> = {};
  if (guess.equipamento) patch.equipamento = guess.equipamento;
  if (guess.marca) patch.marca = guess.marca;
  if (guess.problema) patch.problema = guess.problema;
  if (guess.num_burners) patch.num_burners = guess.num_burners;

  const mount = parseMountFromText(rawText);
  if (mount) patch.mount = mount;

  const power = parsePowerTypeFromText(rawText);
  if (power) patch.power_type = power;

  return patch;
}

export function applyFunnelToDadosColetados(prevDados: any, funnel: FunnelState): any {
  const next = { ...(prevDados || {}) };
  if (funnel.equipamento && !next.equipamento) next.equipamento = funnel.equipamento;
  if (funnel.marca && !next.marca) next.marca = funnel.marca;

  const prob = funnel.problema;
  if (prob) {
    if (!next.problema && !next.descricao_problema && !next.description) {
      next.problema = prob;
    }
  }

  if (funnel.num_burners && !next.num_burners) next.num_burners = funnel.num_burners;
  if (funnel.mount && !next.mount) next.mount = funnel.mount;
  if (funnel.power_type && !next.power_type) next.power_type = funnel.power_type;

  // Keep canonical-ish: if description is filled but problema empty, normalize.
  try {
    const normalizedProblem = normalizeProblemFromDados(next);
    if (normalizedProblem && !next.problema) next.problema = normalizedProblem;
  } catch {}

  return next;
}

export function shouldTreatAsInstall(signals: InboundSignals, sessionState: any, rawText: string): boolean {
  const st = sessionState || {};
  const hasInstallationMode = !!st.installation_mode;

  // If user negates install or looks like repair, do NOT treat as install.
  if (signals.negatedInstall || signals.looksLikeRepair) return false;

  // If already in installation mode, keep it only if message still supports it.
  if (hasInstallationMode) {
    const norm = normalizeInboundText(rawText || '');
    if (/\b(conserto|reparo|manutencao|defeito|nao\s+liga|nao\s+acende)\b/i.test(norm)) return false;
    return true;
  }

  return !!signals.mentionsInstall;
}
