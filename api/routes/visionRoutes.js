import express from 'express';
import { auditLogger } from '../middleware/audit.js';
import { botAuth } from '../middleware/botAuth.js';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isSupabaseEnabled, uploadFile as supaUpload, removeFile as supaRemove, publicUrl as supaPublicUrl, signedUrl as supaSignedUrl } from '../services/supabaseStorage.js';

const router = express.Router();

const TRAIN_DIR = path.join(process.cwd(), 'public', 'training-images', 'fogoes');

async function ensureDirs(){
  const types = ['cooktop','floor'];
  const segs = ['basico','inox','premium'];
  for (const t of types){
    for (const s of segs){
      await fs.mkdir(path.join(TRAIN_DIR, `${t}_${s}`), { recursive: true });
    }
  }
}

router.use(auditLogger);
// Health ping para diagnosticar 500 rapidamente
router.get('/_health', async (_req, res) => {
  try {
    await ensureDirs();
    res.json({ ok: true, supabase: isSupabaseEnabled(), dir: TRAIN_DIR });
  } catch (e) {
    res.json({ ok: false, error: e?.message || String(e) });
  }
});

// Listar imagens de referencia por segmento
router.get('/training-images', async (_req, res) => {
  try {
    console.log('[vision/training-images] GET - iniciando...');
    await ensureDirs();
    const result = {};
    for (const type of ['cooktop','floor']){
      for (const seg of ['basico','inox','premium']){
        const key = `${type}_${seg}`;
        const dir = path.join(TRAIN_DIR, key);
        try {
          const files = await fs.readdir(dir);
          // Filtrar apenas arquivos de imagem (excluir manifest.json e outros)
          const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
          result[key] = await Promise.all((imageFiles||[]).map(async f=>{
            if (isSupabaseEnabled()){
              const url = await supaSignedUrl(`${key}/${f}`);
              if (url) return { file: f, url };
              return { file: f, url: `/training-images/fogoes/${key}/${encodeURIComponent(f)}` };
            }
            return { file: f, url: `/training-images/fogoes/${key}/${encodeURIComponent(f)}` };
          }));
        } catch { result[key] = []; }
      }
    }
    console.log('[vision/training-images] GET - sucesso, keys:', Object.keys(result));
    return res.json({ ok:true, result });
  } catch (e) {
    console.error('[vision/training-images] GET error', e);
    return res.status(500).json({ ok:false, error:'list_failed', details: e.message });
  }
});

// Upload imagem de referencia (base64 simples)
router.post('/training-images', express.json({limit:'10mb'}), async (req, res) => {
  try {
    console.log('[vision/upload] POST - iniciando...');
    await ensureDirs();
    const { segment, type, imageBase64, filename } = req.body || {};
    console.log('[vision/upload] POST - dados:', { type, segment, filename, hasImage: !!imageBase64 });

    // Validações básicas
    if (!type || !['cooktop','floor'].includes(type)) return res.status(400).json({ ok:false, error:'bad_type' });
    if (!segment || !['basico','inox','premium'].includes(segment)) return res.status(400).json({ ok:false, error:'bad_segment' });
    if (!imageBase64) return res.status(400).json({ ok:false, error:'missing_image' });

    // Detecta content-type do data URL e valida
    const mimeMatch = String(imageBase64).match(/^data:([^;]+);base64,/);
    const contentType = (mimeMatch?.[1] || 'image/jpeg').toLowerCase();
    const allowed = new Set(['image/jpeg','image/jpg','image/png','image/webp']);
    if (!allowed.has(contentType)) return res.status(415).json({ ok:false, error:'unsupported_media_type' });

    // Converte para buffer e confere tamanho
    const b64Data = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(b64Data, 'base64');
    const MAX_IMAGE_BYTES = Number(process.env.TRAINING_MAX_IMAGE_BYTES || 10*1024*1024);
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ ok:false, error:'file_too_large', maxBytes: MAX_IMAGE_BYTES });
    }

    // Deduplicação por hash (dentro do mesmo segmento/chave)
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
    const ext = contentType === 'image/png' ? 'png' : (contentType === 'image/webp' ? 'webp' : 'jpg');
    const key = `${type}_${segment}`;

    const { readManifest, upsertMeta } = await import('../services/trainingMeta.js');
    const manifest = await readManifest(key);
    const existingEntry = Object.entries(manifest || {}).find(([_, meta]) => meta?.hash === hash);
    if (existingEntry) {
      const [existingFile] = existingEntry;
      let url = '';
      if (isSupabaseEnabled()) {
        url = await supaSignedUrl(`${key}/${existingFile}`);
        if (!url) url = `/training-images/fogoes/${key}/${encodeURIComponent(existingFile)}`;
      } else {
        url = `/training-images/fogoes/${key}/${encodeURIComponent(existingFile)}`;
      }
      return res.status(200).json({ ok:true, file: existingFile, url, deduped: true });
    }

    // Nome do arquivo baseado no hash (estável e sem conflitos)
    const name = `${hash}.${ext}`;
    const dest = path.join(TRAIN_DIR, key, name);

    // Persistência local quando possível (pode falhar em ambientes read-only)
    let wroteLocal = false;
    try {
      await fs.writeFile(dest, buf);
      wroteLocal = true;
    } catch (e) {
      console.warn('[vision/upload] writeFile falhou (read-only FS?):', e?.message || e);
    }

    // Upload para Supabase quando habilitado
    try {
      if (isSupabaseEnabled()){
        const up = await supaUpload(`${key}/${name}`, buf, contentType);
        if (!up?.ok){ console.warn('[vision/upload] supabase upload falhou:', up?.error); }
      }
    } catch (e) { console.warn('[vision/upload] supabase upload exception:', e?.message||e); }

    // Salvar metadados mínimos no manifest
    await upsertMeta(key, name, {
      hash,
      contentType,
      size: buf.length,
      originalName: filename || null,
      uploadedAt: new Date().toISOString(),
    });

    let url = '';
    if (isSupabaseEnabled()) {
      url = await supaSignedUrl(`${key}/${name}`);
      if (!url) {
        url = `/training-images/fogoes/${key}/${encodeURIComponent(name)}`;
      }
    } else {
      url = `/training-images/fogoes/${key}/${encodeURIComponent(name)}`;
    }
    return res.json({ ok:true, file: name, url });
  } catch (e) {
    console.error('[vision/upload] POST error', e);
    return res.status(500).json({ ok:false, error:'upload_failed', details: e.message });
  }
});

// Remover imagem de referência
router.delete('/training-images/:key/:file', async (req, res) => {
  try {
    const { key, file } = req.params;
    if (!key || !/^((cooktop|floor)_(basico|inox|premium))$/.test(key)) return res.status(400).json({ ok:false, error:'bad_key' });
    if (!file) return res.status(400).json({ ok:false, error:'missing_file' });
    const target = path.join(TRAIN_DIR, key, file);
    try { await fs.unlink(target); } catch {}
    if (isSupabaseEnabled()){
      await supaRemove(`${key}/${file}`);
    }
    return res.json({ ok:true });
  } catch (e) {
    console.error('[vision/delete] error', e);
    return res.status(500).json({ ok:false, error:'delete_failed' });
  }
});

// Metadados por imagem (manifest)
router.get('/training-images/:key/meta', async (req, res) => {
  try {
    const { key } = req.params;
    const { readManifest } = await import('../services/trainingMeta.js');
    const data = await readManifest(key);
    return res.json({ ok:true, data });
  } catch (e) {
    console.error('[vision/meta:get] error', e);
    return res.status(500).json({ ok:false, error:'meta_read_failed' });
  }
});

router.post('/training-images/:key/meta/:file', express.json(), async (req, res) => {
  try {
    const { key, file } = req.params;
    const meta = req.body || {};
    const { upsertMeta } = await import('../services/trainingMeta.js');
    const saved = await upsertMeta(key, file, meta);
    return res.json({ ok:true, meta: saved });
  } catch (e) {
    console.error('[vision/meta:post] error', e);
    return res.status(500).json({ ok:false, error:'meta_write_failed' });
  }
});

// Classificar imagem de fogão via CLIP embeddings, com fallback Vision
router.post('/classify-stove', express.json({limit:'12mb'}), async (req, res) => {
  try {
    await ensureDirs();
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ ok:false, error:'missing_image' });
    const buf = Buffer.from(String(imageBase64).replace(/^data:\w+\/\w+;base64,/, ''), 'base64');
    const tmp = path.join(process.cwd(), 'public', 'training-images', 'tmp-' + Date.now() + '.jpg');
    await fs.writeFile(tmp, buf);

    let result = null;
    let clipError = null;
    try {
      const { classifyStoveImage } = await import('../services/clipClassifier.js');
      result = await classifyStoveImage(tmp);
    } catch (err) {
      clipError = err;
      console.warn('[vision/classify-stove] CLIP failed, will try Vision fallback:', err?.message || err);
    } finally {
      try { await fs.unlink(tmp); } catch {}
    }

    // Apply confidence threshold to CLIP-only
    if (result) {
      const threshold = Number(process.env.CLIP_CONFIDENCE_THRESHOLD || 0.6);
      const final = { ...result };
      if ((final.confidence ?? 0) < threshold) {
        final.segment = 'indeterminado';
      }
      return res.json({ ok:true, ...final });
    }

    // Fallback: OpenAI Vision (HTTP direto)
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_TOKEN;
      if (!apiKey) {
        console.warn('[vision/classify-stove] OPENAI_API_KEY ausente. Respondendo indeterminado.');
        return res.json({ ok:true, type:'indeterminado', segment:'indeterminado', burners:'indeterminado', source:'gpt4o-vision' });
      }
      const payload = {
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          { role: 'user', content: [
            { type: 'text', text: 'Analise esta imagem de fogão e responda APENAS com um JSON no formato: {"type":"floor|cooktop|indeterminado","segment":"basico|inox|premium|indeterminado","burners":"4|5|6|indeterminado"}.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]}
        ]
      };
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(`openai_http_${r.status}`);
      const j = await r.json();
      let content = j?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        // new SDKs sometimes return array of parts
        const textPart = content.find(p => p?.type === 'text');
        content = textPart?.text || '';
      }
      const parsed = JSON.parse(String(content||'')
        .replace(/^```json\s*/i,'')
        .replace(/^```\s*/i,'')
        .replace(/```\s*$/i,'')
        .trim() || '{}');
      return res.json({ ok:true, type: parsed.type || 'indeterminado', segment: parsed.segment || 'indeterminado', burners: parsed.burners || 'indeterminado', source: 'gpt4o-vision' });
    } catch (visionErr) {
      console.error('[vision/classify-stove] Vision fallback failed', visionErr, 'original CLIP error:', clipError);
      // Em falha do Vision, devolve indeterminado para permitir que o webhook assuma o fallback dele
      return res.json({ ok:true, type:'indeterminado', segment:'indeterminado', burners:'indeterminado', source:'gpt4o-vision' });
    }
  } catch (e) {
    console.error('[vision/classify-stove] error', e);
    return res.status(500).json({ ok:false, error:'classify_failed' });
  }
});

export default router;

