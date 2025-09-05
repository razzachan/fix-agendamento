import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallbackKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY; // anon key fallback
  const key = serviceKey || fallbackKey;
  if (!url || !key) return null;
  if (!serviceKey && key) {
    console.warn('[supabaseStorage] SERVICE_ROLE ausente. Usando fallback (anon). Recomenda-se configurar SUPABASE_SERVICE_ROLE_KEY no .env da API.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSupabaseEnabled() {
  // Habilitado quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem presentes (independente de VISION_STORAGE)
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // exigido para writes confiáveis
  return !!(url && serviceKey);
}

export function getBucket() {
  return process.env.SUPABASE_BUCKET || 'training-images';
}

async function ensureBucketExists(client, bucket){
  try {
    const { data: buckets } = await client.storage.listBuckets?.();
    const exists = buckets?.some(b => b.name === bucket);
    if (!exists) {
      await client.storage.createBucket(bucket, { public: true });
    }
  } catch (e) {
    // Ignora se não for possível listar/criar (sem permissão com anon)
  }
}

export async function uploadFile(path, buffer, contentType = 'image/jpeg'){
  const client = getClient();
  if (!client) return { ok:false, error: 'supabase_not_configured' };
  const bucket = getBucket();
  await ensureBucketExists(client, bucket);
  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) return { ok:false, error: error.message };
  return { ok:true };
}

export async function removeFile(path){
  const client = getClient();
  if (!client) return { ok:false, error:'supabase_not_configured' };
  const bucket = getBucket();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) return { ok:false, error: error.message };
  return { ok:true };
}

export function publicUrl(path){
  const client = getClient();
  if (!client) return '';
  const bucket = getBucket();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}

export async function signedUrl(path, expiresInSeconds = 60*60*24*7){
  const client = getClient();
  if (!client) return '';
  const bucket = getBucket();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return '';
  return data?.signedUrl || '';
}

export async function readJSON(path){
  const client = getClient();
  if (!client) return null;
  const bucket = getBucket();
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) return null;
  const txt = await data.text();
  try { return JSON.parse(txt); } catch { return null; }
}

export async function writeJSON(path, obj){
  const client = getClient();
  if (!client) return { ok:false, error:'supabase_not_configured' };
  const bucket = getBucket();
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const { error } = await client.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'application/json' });
  if (error) return { ok:false, error: error.message };
  return { ok:true };
}

