/* eslint-disable no-console */
const { spawn } = require('node:child_process');

const API_PORT = process.env.API_PORT || '3001';
const API_BASE = process.env.API_BASE || `http://localhost:${API_PORT}`;
const API_STATUS_URL = `${API_BASE}/api/status`;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForApi({ timeoutMs = 20000, intervalMs = 300 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(API_STATUS_URL);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(intervalMs);
  }
  throw new Error(`API não respondeu a tempo em ${API_STATUS_URL}`);
}

function spawnLogged(command, args, options) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  return spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
}

function killProcess(child) {
  if (!child || child.killed) return;

  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }

  // On Windows, SIGTERM isn't always enough.
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true });
    } catch {
      // ignore
    }
  }
}

async function main() {
  let api;
  try {
    api = spawnLogged('node', ['api/index.js'], {
      env: {
        ...process.env,
        PORT: API_PORT,
        NODE_ENV: process.env.NODE_ENV || 'test',
      },
    });

    await waitForApi();

    const test = spawnLogged('node', ['--test', 'api/tests/*.mjs'], {
      env: {
        ...process.env,
        API_BASE,
      },
      shell: true, // allow glob on Windows
    });

    const code = await new Promise((resolve) => test.on('close', resolve));
    process.exitCode = typeof code === 'number' ? code : 1;
  } catch (err) {
    console.error(String(err?.stack || err));
    process.exitCode = 1;
  } finally {
    killProcess(api);
  }
}

main();
