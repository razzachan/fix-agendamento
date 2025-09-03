import { promises as fs } from 'fs';
import path from 'path';

// Lazy-loaded CLIP from @xenova/transformers (browser/node pure JS)
let model = null;
let processor = null;

const TRAIN_DIR = path.join(process.cwd(), 'public', 'training-images', 'fogoes');
const TYPES = ['cooktop','floor'];
const SEGMENTS = ['basico','inox','premium'];

async function ensureModel(){
  if (model && processor) return;
  const transformers = await import('@xenova/transformers');
  const { CLIPModel, AutoProcessor } = transformers;
  processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
  model = await CLIPModel.from_pretrained('Xenova/clip-vit-base-patch32');
}

async function loadSegmentImages(){
  const data = {};
  for (const type of TYPES){
    for (const seg of SEGMENTS){
      const key = `${type}_${seg}`;
      const dir = path.join(TRAIN_DIR, key);
      try {
        const files = await fs.readdir(dir);
        data[key] = files.map(f => ({ type, seg, file: f, path: path.join(dir, f) }));
      } catch { data[key] = []; }
    }
  }
  return data;
}

async function embedImage(filePath){
  await ensureModel();
  const transformers = await import('@xenova/transformers');
  const { RawImage } = transformers;
  const buffer = await fs.readFile(filePath);
  let image;
  try {
    if (typeof RawImage.decode === 'function') {
      console.log('[clip] using RawImage.decode(buffer)');
      image = await RawImage.decode(buffer);
    } else if (typeof RawImage.read === 'function') {
      console.log('[clip] using RawImage.read(filePath)');
      image = await RawImage.read(filePath);
    } else if (typeof RawImage.fromURL === 'function') {
      console.log('[clip] using RawImage.fromURL(file://)');
      image = await RawImage.fromURL(`file://${filePath}`);
    } else {
      throw new Error('No suitable RawImage loader available');
    }
  } catch (e) {
    console.warn('[clip] image load failed, fallback to RawImage.read if available:', e?.message || e);
    if (typeof RawImage.read === 'function') {
      image = await RawImage.read(filePath);
    } else {
      throw e;
    }
  }
  // Prepare inputs (handle different processor APIs)
  let inputs;
  if (typeof processor?.process === 'function') {
    inputs = await processor.process({ images: image });
  } else if (typeof processor === 'function') {
    inputs = await processor(image);
  } else if (typeof processor?.__call__ === 'function') {
    inputs = await processor.__call__({ images: image });
  } else {
    throw new Error('Unsupported processor API');
  }
  const output = await model.encode_image(inputs);
  // Normalize
  const emb = output.data;
  const norm = Math.hypot(...emb);
  return emb.map(v => v / norm);
}

function cosine(a, b){
  let dot = 0; for (let i=0;i<a.length;i++) dot += a[i]*b[i];
  return dot;
}

export async function classifyStoveImage(tempFilePath){
  const refs = await loadSegmentImages();
  const all = Object.values(refs).flat();
  if (all.length === 0) return { type: 'indeterminado', segment: 'indeterminado', confidence: 0, attributes: {}, nearest: [] };

  const queryEmb = await embedImage(tempFilePath);

  // Compute similarities
  const scored = [];
  for (const ref of all){
    try {
      const refEmb = await embedImage(ref.path);
      const sim = cosine(queryEmb, refEmb);
      scored.push({ ...ref, sim });
    } catch {}
  }
  scored.sort((a,b)=> b.sim - a.sim);

  // Aggregate by type+segment
  const topK = Number(process.env.CLIP_TOP_K || 5);
  const top = scored.slice(0, topK);
  const agg = top.reduce((acc, cur)=>{ const k = `${cur.type}_${cur.seg}`; acc[k] = (acc[k]||0) + cur.sim; return acc; }, {});
  let bestKey = 'indeterminado'; let max = -Infinity;
  for (const [key, val] of Object.entries(agg)){
    if (val > max){ max = val; bestKey = key; }
  }
  const [type, segment] = bestKey.split('_');
  const confidence = Math.max(0, Math.min(1, (max / (top.reduce((s,x)=>s+x.sim,0) || 1)) ));

  // Attributes from nearest reference meta (if exists)
  let attributes = {};
  try {
    const { getMeta } = await import('./trainingMeta.js');
    const best = top[0];
    const bestKey = `${best.type}_${best.seg}`;
    const meta = await getMeta(bestKey, best.file);
    if (meta) attributes = meta;
  } catch {}

  return {
    type: type || 'indeterminado',
    segment: segment || 'indeterminado',
    confidence,
    attributes,
    nearest: top.map(t=> ({ type: t.type, seg: t.seg, file: t.file, sim: t.sim }))
  };
}

