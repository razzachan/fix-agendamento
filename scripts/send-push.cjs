#!/usr/bin/env node
const webpush = require('web-push');
const fs = require('fs');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no ambiente.');
  process.exit(1);
}

webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const subscriptionFile = process.argv[2] || 'subscription.json';
if (!fs.existsSync(subscriptionFile)) {
  console.error(`Arquivo ${subscriptionFile} não encontrado.`);
  process.exit(1);
}

const subscription = JSON.parse(fs.readFileSync(subscriptionFile, 'utf-8'));

const payload = JSON.stringify({
  title: 'Fix Fogões',
  body: 'Push de teste enviado com sucesso!',
  icon: '/icons/icon-192.png'
});

webpush.sendNotification(subscription, payload)
  .then(() => console.log('Push enviado!'))
  .catch((err) => console.error('Erro ao enviar push:', err));

