import 'dotenv/config';
import { chatComplete } from './llmClient.js';

export type AiFunnelFields = {
  equipamentosEncontrados?: string[];
  equipamento?: string;
  marca?: string;
  problema?: string;
  mount?: 'piso' | 'cooktop' | 'bancada' | 'embutido' | string;
  num_burners?: string; // '4' | '5' | '6'
};

function extractJsonBlock(text: string): any | null {
  if (!text) return null;
  // Attempt strict JSON first
  try { return JSON.parse(text); } catch {}
  // Fallback: find first JSON object starting with { and ending with matching }
  const cand = String(text);
  const idx = cand.indexOf('{');
  if (idx < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = idx; i < cand.length; i++) {
    const ch = cand[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) {
        const json = cand.slice(idx, i + 1);
        try { return JSON.parse(json); } catch { return null; }
      }}
    }
  }
  return null;
}

function normStr(s?: string): string | undefined {
  if (!s) return undefined;
  return String(s).normalize('NFC').toLowerCase().trim();
}

function normalizeMount(v?: string): AiFunnelFields['mount'] | undefined {
  const t = normStr(v);
  if (!t) return undefined;
  if (/(piso)/.test(t)) return 'piso';
  if (/(cook\s*top|cooktop)/.test(t)) return 'cooktop';
  if (/(bancada)/.test(t)) return 'bancada';
  if (/(embut)/.test(t)) return 'embutido';
  return t;
}

function normalizeBurners(v?: string): string | undefined {
  const t = normStr(v);
  if (!t) return undefined;
  const m = t.match(/\b(4|5|6)\b/);
  if (m) return m[1];
  if (/quatro/.test(t)) return '4';
  if (/cinco/.test(t)) return '5';
  if (/seis/.test(t)) return '6';
  return undefined;
}

function normalizeEquipments(arr?: string[]): string[] | undefined {
  if (!arr || !Array.isArray(arr)) return undefined;
  const map: Record<string,string> = {
    'fogao': 'fogão', 'fogão': 'fogão', 'cooktop':'cooktop',
    'forno': 'forno', 'forno elétrico': 'forno elétrico', 'forno eletrico': 'forno elétrico',
    'microondas':'micro-ondas', 'micro-ondas':'micro-ondas', 'micro ondas':'micro-ondas',
    'lava louças':'lava-louças', 'lava-louças':'lava-louças', 'lava louça':'lava-louças', 'lava-louça':'lava-louças', 'lavalouças':'lava-louças', 'lavalouca':'lava-louças',
    'máquina de lavar louças':'lava-louças', 'maquina de lavar loucas':'lava-louças',
    'lavadora':'lavadora', 'máquina de lavar':'lavadora', 'maquina de lavar':'lavadora',
    'lava e seca':'lava e seca', 'lava-seca':'lava e seca',
    'secadora':'secadora', 'coifa':'coifa', 'depurador':'coifa', 'exaustor':'coifa'
  };
  const out = arr.map(x => map[normStr(x)||''] || normStr(x) || '').filter(Boolean) as string[];
  return Array.from(new Set(out));
}

export async function aiGuessFunnelFields(text: string): Promise<AiFunnelFields | null> {
  try {
    if (process.env.EXTRACTOR_AI === 'off') return null;
    // If API key is missing, gracefully skip
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return null;

    const sys = [
      'Extraia campos estruturados a partir de uma mensagem de cliente. Responda SOMENTE com JSON, sem comentários e sem texto extra.',
      'Campos esperados: {',
      '  "equipamentos": string[] (lista de equipamentos citados, ex: ["lava-louças", "micro-ondas"]),',
      '  "marca": string|null,',
      '  "problema": string|null,',
      '  "mount": "piso"|"cooktop"|"bancada"|"embutido"|null,',
      '  "num_burners": "4"|"5"|"6"|null',
      '}',
      'Regras: não invente; se não souber um campo, use null. Não peça dados pessoais.',
      'Responda apenas JSON válido.'
    ].join('\n');

    const user = `Mensagem: ${text}`;
    const out = await chatComplete({ provider: 'openai', model: process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, maxTokens: 300 }, [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ]);

    const parsed = extractJsonBlock(out);
    if (!parsed || typeof parsed !== 'object') return null;
    const equipamentos = normalizeEquipments(parsed.equipamentos || parsed.equipment || [] as string[]) || [];
    const eq = equipamentos[0];
    const marca = normStr(parsed.marca || parsed.brand);
    const problema = parsed.problema ? String(parsed.problema).trim() : (parsed.problem ? String(parsed.problem).trim() : undefined);
    const mount = normalizeMount(parsed.mount);
    const num_burners = normalizeBurners(parsed.num_burners);
    const result: AiFunnelFields = {
      equipamentosEncontrados: equipamentos,
      equipamento: eq,
      marca: marca,
      problema: problema,
      mount,
      num_burners
    };
    return result;
  } catch {
    return null;
  }
}

