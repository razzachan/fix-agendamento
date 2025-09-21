import 'dotenv/config'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectDir = resolve(__dirname, '..') // webhook-ai

const WEBHOOK_BASE = process.env.WEBHOOK_BASE || 'http://localhost:3211'
const PORT = '3211' // força 3211 para ambiente local

function sleep(ms){ return new Promise(r => setTimeout(r, ms)) }

async function waitForHealthy(timeoutMs = 45000){
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs){
    try{
      const res = await fetch(`${WEBHOOK_BASE}/health`)
      if (res.ok) return true
      lastErr = new Error(`health status ${res.status}`)
    }catch(e){ lastErr = e }
    await sleep(500)
  }
  if (lastErr) throw lastErr
  throw new Error('Timeout esperando /health')
}

async function enableTestMode(){
  try{
    const res = await fetch(`${WEBHOOK_BASE}/test-mode/enable`, { method:'POST' })
    if (!res.ok) throw new Error(`test-mode enable status ${res.status}`)
  }catch(e){
    console.warn('Aviso: falha ao habilitar test-mode:', e?.message || e)
  }
}

async function main(){
  console.log(`Iniciando webhook em PORT=${PORT} ...`)

  // Executa o servidor com Node + tsx CLI diretamente (evita spawn do npm em Windows)
  const tsxCli = join(projectDir, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const dev = spawn(process.execPath, [tsxCli, 'src/app.ts'], {
    cwd: projectDir,
    env: { ...process.env, PORT },
    stdio: 'inherit'
  })

  let exitCode = 1
  try{
    await waitForHealthy(45000)
    console.log('Webhook saudável. Habilitando test-mode...')
    await enableTestMode()

    console.log('Executando smoke-all-local...')
    const res = spawnSync(process.execPath, ['./scripts/smoke-all-local.mjs'], {
      cwd: projectDir,
      env: { ...process.env, WEBHOOK_BASE, WEBHOOK_URL: WEBHOOK_BASE },
      stdio: 'inherit'
    })
    exitCode = res.status ?? 1
    if (exitCode !== 0) throw new Error(`smoke-all-local exited with ${exitCode}`)
    console.log('\nOK: smoke:dev-local concluído com sucesso.')
  } finally {
    console.log('Encerrando servidor dev...')
    dev.kill('SIGINT')
  }
}

main().catch((e)=>{ console.error(e); process.exit(1) })

