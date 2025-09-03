#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const webpush = require('web-push');

function run() {
  const keys = webpush.generateVAPIDKeys();
  const cli = process.env.SUPABASE_CLI || 'C:/Users/akrom/scoop/shims/supabase.exe';
  const args = [
    'secrets', 'set',
    `VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `VAPID_PRIVATE_KEY=${keys.privateKey}`,
    'VAPID_SUBJECT=mailto:admin@fixfogoes.com.br'
  ];
  console.log('[VAPID] Updating Supabase secrets with fresh keys...');
  const res = spawnSync(cli, args, { stdio: 'inherit' });
  if (res.error || res.status !== 0) {
    console.error('[VAPID] Failed to set secrets', res.error || res.status);
    process.exit(res.status || 1);
  }
  console.log('[VAPID] Done. Public key:');
  console.log(keys.publicKey);
}

run();

