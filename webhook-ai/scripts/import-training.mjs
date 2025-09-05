import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRAIN_DIR = process.env.TRAIN_DIR || path.resolve(process.cwd(), 'docs/Treinamento Bot');

// Fallback para valores conhecidos do projeto (apenas ambiente dev)
if (!SUPABASE_URL) SUPABASE_URL = 'https://hdyucwabemspehokoiks.supabase.co';
if (!SUPABASE_SERVICE_ROLE_KEY) SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0';

function guessEquipment(text){
  const b = (text||'').toLowerCase();
  const list = ['fogão','fogao','cooktop','forno','micro-ondas','microondas','coifa','lava louças','lava-louças','lava roupas','lava-roupas','lava e seca','secadora','adega'];
  for (const e of list){ if (b.includes(e)) return e.replace('fogao','fogão'); }
  return undefined;
}

function extractListAfter(regex, body){
  const lines = body.split(/\r?\n/);
  const idx = lines.findIndex(l => regex.test(l));
  if (idx === -1) return [];
  const acc = [];
  for (let i=idx+1;i<lines.length;i++){
    const raw = lines[i].trim();
    if (!raw) break;
    if (/^\s*$/.test(raw)) break;
    acc.push(raw.replace(/^[-•\s]+/, '').trim());
  }
  return acc.filter(Boolean);
}

function toKey(filename){
  return filename.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/_txt$/,'');
}

function parseFile(content, filename){
  const key = toKey(filename);
  const equipamento = guessEquipment(content);
  const sintomas = extractListAfter(/^(sintomas|problemas|situações|exemplos)[:]?\s*$/i, content);
  const causas = extractListAfter(/^(causas|possíveis causas|hipóteses)[:]?\s*$/i, content);
  const mensagens = extractListAfter(/^(mensagens|roteiro|script|padr(ã|a)o)[:]?\s*$/i, content);
  const data = {
    equipamento,
    sintomas: sintomas.length ? sintomas : undefined,
    causas_possiveis: causas.length ? causas : undefined,
    mensagens_base: mensagens.length ? { base: mensagens.join(' ') } : undefined,
    raw_text: content.slice(0, 8000)
  };
  return { key, type: 'knowledge_block', description: filename, data };
}

async function main(){
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (!fs.existsSync(TRAIN_DIR)){
    console.error('Training directory not found:', TRAIN_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(TRAIN_DIR);
  let ok=0, fail=0;
  for (const f of files){
    const full = path.join(TRAIN_DIR, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) continue;
    const content = fs.readFileSync(full, 'utf-8');
    const b = parseFile(content, f);
    const { error } = await supabase.from('bot_knowledge_blocks').upsert({ key: b.key, type: b.type, description: b.description, data: b.data, enabled: true });
    if (error) { console.error('Upsert error', f, error.message); fail++; }
    else { console.log('Upserted', f); ok++; }
  }
  console.log(`Import finished. OK=${ok} FAIL=${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });

