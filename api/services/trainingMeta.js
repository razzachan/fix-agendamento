import { promises as fs } from 'fs';
import path from 'path';
import { isSupabaseEnabled, readJSON as supaReadJSON, writeJSON as supaWriteJSON } from './supabaseStorage.js';

const TRAIN_DIR = path.join(process.cwd(), 'public', 'training-images', 'fogoes');

export async function readManifest(key){
  if (isSupabaseEnabled()){
    const data = await supaReadJSON(`${key}/manifest.json`);
    return data || {};
  }
  const file = path.join(TRAIN_DIR, key, 'manifest.json');
  try {
    const txt = await fs.readFile(file, 'utf-8');
    return JSON.parse(txt);
  } catch { return {}; }
}

export async function writeManifest(key, data){
  if (isSupabaseEnabled()){
    await supaWriteJSON(`${key}/manifest.json`, data);
  }
  const file = path.join(TRAIN_DIR, key, 'manifest.json');
  try { await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8'); } catch {}
}

export async function upsertMeta(key, filename, meta){
  const manifest = await readManifest(key);
  manifest[filename] = { ...(manifest[filename]||{}), ...meta };
  await writeManifest(key, manifest);
  return manifest[filename];
}

export async function getMeta(key, filename){
  const manifest = await readManifest(key);
  return manifest[filename] || null;
}

