import 'dotenv/config'
import http from 'node:http'

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      // hard guard: 1MB
      if (data.length > 1024 * 1024) {
        reject(new Error('Request too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (e) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(obj))
}

async function main() {
  const port = Number(process.env.MOCK_MW_PORT || process.env.PORT || 0)

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost')

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true, service: 'mock-middleware' })
      }

      if (req.method !== 'POST') {
        return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
      }

      if (url.pathname === '/api/bot/tools/buildQuote') {
        const body = await readJson(req)
        const serviceType = body?.service_type || 'servico'
        const region = body?.region || 'Centro'
        return sendJson(res, 200, {
          ok: true,
          result: {
            total: 150,
            description: `Orçamento estimado (${serviceType}, ${region})`,
            items: [
              { description: `Diagnóstico + mão de obra (${serviceType})`, price: 150 },
            ],
          },
        })
      }

      if (url.pathname === '/api/bot/tools/getAvailability') {
        const body = await readJson(req)
        const date = body?.date || new Date().toISOString().slice(0, 10)
        return sendJson(res, 200, {
          ok: true,
          date,
          slots: [
            { start: '09:00', end: '10:00' },
            { start: '14:00', end: '15:00' },
          ],
        })
      }

      // In case future smoke scripts expand
      return sendJson(res, 404, { ok: false, error: 'Not found', path: url.pathname })
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e?.message || String(e) })
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })

  const addr = server.address()
  const actualPort = typeof addr === 'object' && addr ? addr.port : port
  console.log(`[mock-middleware] listening on http://127.0.0.1:${actualPort}`)

  // keep alive
}

main().catch((e) => {
  console.error('[mock-middleware] fatal:', e)
  process.exit(1)
})
