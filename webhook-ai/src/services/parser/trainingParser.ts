import fs from 'fs';
import path from 'path';

export type ParsedBlock = {
  key: string;
  type: string;
  description?: string;
  data: any;
};

const EQUIPAMENTOS = [
  // Fogão / Forno
  'fogão','fogao',
  'forno','forno elétrico','forno eletrico','forno a gás','forno a gas','forno de embutir','forno embutir',
  // Cooktop
  'cooktop','cook top','cook-top',
  // Micro-ondas
  'micro-ondas','microondas','micro ondas','forno microondas','forno micro-ondas','forno de microondas',
  // Lava-louças
  'lava louças','lava-louças','lava louça','lava-louça','lava-louca','lava louca',
  'lavalouças','lavalouça','lava loucas','lava-loucas','lavaloucas','lavalouca',
  // Lava-roupas / Lavadora
  'lava roupas','lava-roupas','lavadora','lavadora de roupas','máquina de lavar','maquina de lavar','máquina lavar','maquina lavar',
  // Lava e seca
  'lava e seca','lava-seca','lava & seca','lava&seca','lava seca',
  // Secadora
  'secadora','secadora de roupas',
  // Coifa
  'coifa','exaustor','depurador',
  // Adega
  'adega','adega climatizada','adega de vinhos','adega de vinho'
];

function guessEquipment(text: string){
  const b = text.toLowerCase();
  for (const e of EQUIPAMENTOS){ if (b.includes(e)) return e.replace('fogao','fogão'); }
  return undefined;
}

function extractListAfter(label: RegExp, body: string){
  const m = body.match(label);
  if (!m) return [];
  const start = m.index! + m[0].length;
  const after = body.slice(start).split(/\n\n|\r\n\r\n/)[0];
  return after.split(/\n|\r\n/).map(s=>s.replace(/^[-•\s]+/,'').trim()).filter(Boolean);
}

export function parseTrainingFile(content: string, filename: string): ParsedBlock{
  const key = path.basename(filename).toLowerCase()
    .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/_txt$/,'');
  const equipment = guessEquipment(content);
  const sintomas = extractListAfter(/(sintomas|problemas|situações|exemplos):?\s*$/i, content);
  const causas = extractListAfter(/(causas|possíveis causas|hipóteses):?\s*$/i, content);
  const mensagens = extractListAfter(/(mensagens|roteiro|script|padr(ã|a)o):?\s*$/i, content);

  const data: any = {
    equipamento: equipment,
    sintomas: sintomas.length ? sintomas : undefined,
    causas_possiveis: causas.length ? causas : undefined,
    mensagens_base: mensagens.length ? { base: mensagens.join(' ') } : undefined,
    raw_text: content.slice(0, 4000)
  };

  return { key, type: 'knowledge_block', description: filename, data };
}

export function parseDirectory(dir: string): ParsedBlock[] {
  const files = fs.readdirSync(dir);
  const out: ParsedBlock[] = [];
  for (const f of files){
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) continue;
    const content = fs.readFileSync(p, 'utf-8');
    out.push(parseTrainingFile(content, f));
  }
  return out;
}

