#!/usr/bin/env node

/**
 * Auto audit WhatsApp conversations periodically and write summaries.
 *
 * Usage examples:
 *   node scripts/autoAudit.mjs --once --since=today-07 --threshold=8
 *   node scripts/autoAudit.mjs --interval-mins=30 --since=2025-09-17T07:00:00-03:00
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { intervalMins: 30, once: false, since: 'today-07', threshold: 8 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--once') out.once = true;
    else if (a.startsWith('--interval-mins=')) out.intervalMins = Number(a.split('=')[1] || 30) || 30;
    else if (a.startsWith('--since=')) out.since = a.split('=')[1];
    else if (a.startsWith('--threshold=')) out.threshold = Number(a.split('=')[1] || 8) || 8;
  }
  return out;
}

function formatToday07() {
  const now = new Date();
  // Format YYYY-MM-DDT07:00:00-03:00 (America/Sao_Paulo typical)
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T07:00:00-03:00`;
}

function resolveSince(since) {
  if (!since || since === 'today-07' || since === 'today') return formatToday07();
  return since;
}

function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, ...opts });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

function timestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

async function runOnce({ since, threshold }) {
  const ts = timestamp();
  const outDir = join(process.cwd(), 'exports', 'auto');
  mkdirSync(outDir, { recursive: true });

  const header = `AutoAudit @ ${new Date().toISOString()}\nSINCE: ${since}\nTHRESHOLD: ${threshold}\n`;

  const results = [];

  // 1) Double replies
  results.push(['findDoubleReplies', await runCmd('node', ['scripts/findDoubleReplies.mjs', `--since=${since}`])]);

  // 2) Gaps/loops
  const auditArgs = ['scripts/auditWhatsAppLogs.mjs'];
  if (threshold) auditArgs.push(`--threshold=${threshold}`);
  auditArgs.push(`--since=${since}`);
  results.push(['auditWhatsAppLogs', await runCmd('node', auditArgs)]);

  // 3) Optional summarize (if available)
  results.push(['summarizeWhatsAppLogs', await runCmd('node', ['scripts/summarizeWhatsAppLogs.mjs', `--since=${since}`])]);

  // Write combined report
  let report = header + '\n';
  for (const [name, r] of results) {
    report += `\n===== ${name} (code ${r.code}) =====\n` + (r.out || r.err || '').trim() + '\n';
  }
  const outPath = join(outDir, `audit-${ts}.txt`);
  writeFileSync(outPath, report, 'utf8');
  console.log(`[autoAudit] Report salvo em ${outPath}`);

  // Short console summary
  try {
    const dbl = (results[0][1].out || '').match(/Total de ocorrências: (\d+)/);
    const doubles = dbl ? Number(dbl[1]) : 'n/a';
    console.log(`[autoAudit] Double replies: ${doubles}`);
  } catch {}
}

async function main() {
  const args = parseArgs();
  const since = resolveSince(args.since);
  console.log(`[autoAudit] iniciando com since=${since}, interval=${args.intervalMins}min, once=${args.once}`);

  if (args.once) return runOnce({ since, threshold: args.threshold });

  await runOnce({ since, threshold: args.threshold });

  const intervalMs = Math.max(1, args.intervalMins) * 60 * 1000;
  setInterval(() => {
    runOnce({ since, threshold: args.threshold }).catch((e) => {
      console.error('[autoAudit] erro no ciclo:', e);
    });
  }, intervalMs);
}

main().catch((e) => {
  console.error('[autoAudit] fatal', e);
  process.exit(1);
});

