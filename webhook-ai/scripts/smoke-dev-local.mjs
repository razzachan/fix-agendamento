import 'dotenv/config'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectDir = resolve(__dirname, '..') // webhook-ai

function reservePort(port){
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const assignedPort = typeof address === 'object' && address ? address.port : port
      server.close(() => resolve(assignedPort))
    })
  })
}

async function pickPort(preferredPort){
  try{
    return await reservePort(preferredPort)
  }catch(e){
    if (e?.code !== 'EADDRINUSE') throw e
    return await reservePort(0)
  }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)) }

async function waitForUrlOk(url, timeoutMs = 15000){
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs){
    try{
      const res = await fetch(url)
      if (res.ok) return true
      lastErr = new Error(`status ${res.status}`)
    }catch(e){ lastErr = e }
    await sleep(250)
  }
  if (lastErr) throw lastErr
  throw new Error(`Timeout esperando ${url}`)
}

async function waitForHealthy(timeoutMs = 45000){
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs){
    try{
      const base = process.env.WEBHOOK_BASE || 'http://localhost:3211'
      const res = await fetch(`${base}/health`)
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
    const base = process.env.WEBHOOK_BASE || 'http://localhost:3211'
    const res = await fetch(`${base}/test-mode/enable`, { method:'POST' })
    if (!res.ok) throw new Error(`test-mode enable status ${res.status}`)
  }catch(e){
    console.warn('Aviso: falha ao habilitar test-mode:', e?.message || e)
  }
}

async function main(){
  // Use a dedicated env var to avoid collisions with globally-set PORT
  // (PORT is commonly set by other tooling and can be in-use locally).
  const preferredPort = Number(process.env.SMOKE_WEBHOOK_PORT || 3211)
  const port = await pickPort(preferredPort)
  const PORT = String(port)
  const WEBHOOK_BASE = process.env.WEBHOOK_BASE || `http://localhost:${PORT}`
  // Propagar para as funções utilitárias e para os scripts filhos
  process.env.WEBHOOK_BASE = WEBHOOK_BASE
  process.env.WEBHOOK_URL = process.env.WEBHOOK_URL || WEBHOOK_BASE

  // Start a local mock middleware API so smoke scripts don't depend on LAN/prod endpoints
  const mwPort = await pickPort(0)
  const MW_BASE = `http://127.0.0.1:${mwPort}`
  process.env.API_URL = MW_BASE
  process.env.API_BASE_URL = MW_BASE

  console.log(`Iniciando webhook em PORT=${PORT} ...`)

  console.log(`Iniciando mock middleware em ${MW_BASE} ...`)
  const mockMw = spawn(process.execPath, ['./scripts/mock-middleware-server.mjs'], {
    cwd: projectDir,
    env: { ...process.env, MOCK_MW_PORT: String(mwPort) },
    stdio: 'inherit'
  })

  // Executa o servidor com Node + tsx CLI diretamente (evita spawn do npm em Windows)
  const tsxCli = join(projectDir, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const dev = spawn(process.execPath, [tsxCli, 'src/app.ts'], {
    cwd: projectDir,
    env: { ...process.env, PORT },
    stdio: 'inherit'
  })

  let exitCode = 1
  try{
    await waitForUrlOk(`${MW_BASE}/health`, 15000)
    await waitForHealthy(45000)
    console.log('Webhook saudável. Habilitando test-mode...')
    await enableTestMode()

    console.log('Executando smoke-all-local...')
    const res = spawnSync(process.execPath, ['./scripts/smoke-all-local.mjs'], {
      cwd: projectDir,
      env: { ...process.env, WEBHOOK_BASE, WEBHOOK_URL: WEBHOOK_BASE, API_URL: MW_BASE, API_BASE_URL: MW_BASE },
      stdio: 'inherit'
    })
    exitCode = res.status ?? 1
    if (exitCode !== 0) throw new Error(`smoke-all-local exited with ${exitCode}`)
    console.log('\nOK: smoke:dev-local concluído com sucesso.')
  } finally {
    console.log('Encerrando servidor dev...')
    dev.kill('SIGINT')
    mockMw.kill('SIGINT')
  }
}

main().catch((e)=>{ console.error(e); process.exit(1) })

