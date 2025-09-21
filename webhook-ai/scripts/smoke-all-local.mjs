import 'dotenv/config'
import { spawnSync } from 'node:child_process'

// Set defaults for local webhook server on port 3211
process.env.WEBHOOK_BASE = process.env.WEBHOOK_BASE || 'http://localhost:3211'
process.env.WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3211'

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

