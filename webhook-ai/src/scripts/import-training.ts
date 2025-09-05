import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { parseDirectory } from '../services/parser/trainingParser.js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TRAIN_DIR =
  process.env.TRAIN_DIR || path.resolve(process.cwd(), '../../docs/Treinamento Bot');

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const blocks = parseDirectory(TRAIN_DIR);
  for (const b of blocks) {
    const { error } = await supabase
      .from('bot_knowledge_blocks')
      .upsert({
        key: b.key,
        type: b.type,
        description: b.description,
        data: b.data,
        enabled: true,
      });
    if (error) console.error('Upsert error', b.key, error.message);
    else console.log('Upserted', b.key);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
