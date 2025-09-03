#!/usr/bin/env node
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

// Output as JSON in a single line to avoid line wraps
process.stdout.write(JSON.stringify({ publicKey: vapidKeys.publicKey, privateKey: vapidKeys.privateKey }));
