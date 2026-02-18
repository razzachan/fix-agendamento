import 'dotenv/config'
import { spawnSync } from 'node:child_process'

// Set defaults for local webhook server on port 3211
process.env.WEBHOOK_BASE = process.env.WEBHOOK_BASE || 'http://localhost:3211'
process.env.WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3211'

// IMPORTANT: force a fresh peer per run to avoid reusing persisted Supabase session state
// (which can make the gates flaky when TEST_FROM is set in the shell environment).
process.env.TEST_FROM = `55000000${Math.floor(1000 + Math.random() * 8999)}@c.us`

function run(cmd, args = []){
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env })
  if (res.status !== 0){
    process.exit(res.status || 1)
  }
}

// Use the current Node executable for reliability
const node = process.execPath

// Execute the same sequence as "smoke:all"
run(node, ['./scripts/ai-router-smoke.mjs'])
run(node, ['./scripts/e2e-gate-orcamento.mjs'])
run(node, ['./scripts/smoke-orcamento.mjs'])
run(node, ['./scripts/smoke-agendamento.mjs'])

console.log('\nOK: smoke-all-local completed successfully.')

