import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_*_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function count(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (error) {
    return { table, error: error.message };
  }
  return { table, count: count ?? 0 };
}

(async () => {
  const tables = [
    'service_orders',
    'clients',
    'technicians',
    'financial_transactions',
    'calendar_events'
  ];
  const results = await Promise.all(tables.map(count));
  for (const r of results) {
    if ('error' in r) {
      console.log(`${r.table}: ERROR ${r.error}`);
    } else {
      console.log(`${r.table}: ${r.count}`);
    }
  }
  process.exit(0);
})();

