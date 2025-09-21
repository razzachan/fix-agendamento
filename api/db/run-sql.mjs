import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const filename = process.argv[2]
  if (!filename) {
    console.error('Usage: node run-sql.mjs <migration.sql>')
    process.exit(1)
  }
  const filePath = path.join(__dirname, 'migrations', filename)
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log('Running SQL via exec_sql RPC:', filename)
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.error('exec_sql RPC failed:', error)
    process.exit(1)
  }
  console.log('SQL executed successfully.')
}

main().catch(e=>{ console.error(e); process.exit(1) })

