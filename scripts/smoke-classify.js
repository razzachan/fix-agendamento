// Quick smoke test for /api/vision/classify-stove
// Usage: node scripts/smoke-classify.js <imagePath>

import fs from 'fs';

async function main(){
  const imagePath = process.argv[2] || 'public/training-images/fogoes/floor_basico/142c20f7d902710b840b4480913336f5.jpg';
  if (!fs.existsSync(imagePath)) {
    console.error('[smoke] File not found:', imagePath);
    process.exit(1);
  }
  const buf = fs.readFileSync(imagePath);
  const b64 = buf.toString('base64');
  const mime = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : imagePath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${b64}`;

  const body = { imageBase64: dataUrl };
  const url = 'http://localhost:3000/api/vision/classify-stove';
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('Missing BOT_TOKEN in environment');

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-token': token },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}

    console.log('[smoke] status =', resp.status);
    console.log(parsed || text);

    if (!resp.ok) process.exit(2);
  } catch (e) {
    console.error('[smoke] request failed:', e);
    process.exit(3);
  }
}

main();

