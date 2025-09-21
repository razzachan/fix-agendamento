#!/usr/bin/env node
/*
  Admin Health Check
  - Loads .env (if present)
  - Calls GET /admin/health with x-admin-key
  - Prints summary and exits with non-zero on failure
*/

import fs from 'node:fs';
import path from 'node:path';

// Load .env if available
try {
  const dotenvPath = path.resolve(process.cwd(), 'webhook-ai', '.env');
  if (fs.existsSync(dotenvPath)) {
    const { config } = await import('dotenv');
    config({ path: dotenvPath });
  } else {
    // also try root .env
    const rootEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(rootEnv)) {
      const { config } = await import('dotenv');
      config({ path: rootEnv });
    }
  }
} catch {}

// Ensure fetch is available (Node 18+), else use node-fetch
let _fetch = globalThis.fetch;
if (typeof _fetch !== 'function') {
  try {
    const nf = await import('node-fetch');
    _fetch = nf.default;
  } catch (e) {
    console.error('[admin-health-check] fetch not available and node-fetch not installed.');
    process.exit(2);
  }
}

const port = process.env.PORT || '3100';
const base = process.env.ADMIN_HEALTH_URL || `http://localhost:${port}`;
const url = `${base}/admin/health`;
const key = process.env.ADMIN_API_KEY || '';

if (!key) {
  console.error('[admin-health-check] ADMIN_API_KEY is not set. Please set it in .env');
  process.exit(2);
}

try {
  const r = await _fetch(url, {
    method: 'GET',
    headers: { 'x-admin-key': key },
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!r.ok) {
    console.error('[admin-health-check] Request failed', { status: r.status, data });
    process.exit(1);
  }

  // Pretty summary
  const sel = data?.handoff_selected_by || 'unknown';
  const target = data?.handoff_target || {};
  console.log('[admin-health-check] OK');
  console.log('selected_by:', sel);
  console.log('target_id:', target?.id || null);
  console.log('target_email:', target?.email || null);
  console.log('admin_count:', data?.admin_count ?? 'unknown');

  // Full JSON (single line)
  console.log(JSON.stringify(data));
  process.exit(0);
} catch (e) {
  console.error('[admin-health-check] Error:', e?.message || e);
  process.exit(1);
}

