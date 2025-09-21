#!/usr/bin/env node
/*
  Admin Health Check (PROD)
  - Loads .env (if present)
  - Uses ADMIN_HEALTH_URL_PROD (fallback ADMIN_HEALTH_URL)
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
    const rootEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(rootEnv)) {
      const { config } = await import('dotenv');
      config({ path: rootEnv });
    }
  }
} catch {}

let _fetch = globalThis.fetch;
if (typeof _fetch !== 'function') {
  try {
    const nf = await import('node-fetch');
    _fetch = nf.default;
  } catch (e) {
    console.error('[admin-health-check:prod] fetch not available and node-fetch not installed.');
    process.exit(2);
  }
}

const base = process.env.ADMIN_HEALTH_URL_PROD || process.env.ADMIN_HEALTH_URL;
if (!base) {
  console.error('[admin-health-check:prod] Missing ADMIN_HEALTH_URL_PROD or ADMIN_HEALTH_URL in environment.');
  process.exit(2);
}
const url = `${base.replace(/\/$/, '')}/admin/health`;
const key = process.env.ADMIN_API_KEY || '';

if (!key) {
  console.error('[admin-health-check:prod] ADMIN_API_KEY is not set. Please set it in .env');
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
    console.error('[admin-health-check:prod] Request failed', { status: r.status, data });
    process.exit(1);
  }

  const sel = data?.handoff_selected_by || 'unknown';
  const target = data?.handoff_target || {};
  console.log('[admin-health-check:prod] OK');
  console.log('selected_by:', sel);
  console.log('target_id:', target?.id || null);
  console.log('target_email:', target?.email || null);
  console.log('admin_count:', data?.admin_count ?? 'unknown');

  console.log(JSON.stringify(data));
  process.exit(0);
} catch (e) {
  console.error('[admin-health-check:prod] Error:', e?.message || e);
  process.exit(1);
}

