import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Load env
dotenv.config();

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRAIN_DIR = path.join(process.cwd(), 'public', 'training-images', 'fogoes');
const TYPES = ['cooktop', 'floor'];
const SEGS = ['basico', 'inox', 'premium'];
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function ensureDirs(){
  for (const t of TYPES){
    for (const s of SEGS){
      await fs.mkdir(path.join(TRAIN_DIR, `${t}_${s}`), { recursive: true });
    }
  }
}

function getContentTypeByExt(ext){
  switch (ext.toLowerCase()){
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

async function migrate(){
  console.log('▶️  Iniciando migração de imagens de treino...');
  await ensureDirs();

  const { isSupabaseEnabled, uploadFile: supaUpload, publicUrl: supaPublicUrl } = await import('../services/supabaseStorage.js');
  const { readManifest, writeManifest, upsertMeta } = await import('../services/trainingMeta.js');

  for (const type of TYPES){
    for (const seg of SEGS){
      const key = `${type}_${seg}`;
      const dir = path.join(TRAIN_DIR, key);
      console.log(`\n📂 Processando ${key} ...`);

      let files = [];
      try { files = await fs.readdir(dir); } catch {}

      // Carrega manifest atual
      let manifest = await readManifest(key);

      for (const f of files){
        const ext = path.extname(f).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) continue;
        const full = path.join(dir, f);
        const buf = await fs.readFile(full);
        if (!buf.length) continue;
        const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);

        const desiredExt = ext === '.png' ? '.png' : (ext === '.webp' ? '.webp' : '.jpg');
        const targetName = `${hash}${desiredExt}`;
        const targetPath = path.join(dir, targetName);

        // Se já existe um arquivo com mesmo hash, remove o duplicado
        if (f !== targetName){
          if (files.includes(targetName)){
            console.log(`♻️  Duplicado detectado, removendo ${f} -> já existe ${targetName}`);
            try { await fs.unlink(full); } catch {}
          } else {
            console.log(`✏️  Renomeando ${f} -> ${targetName}`);
            try { await fs.rename(full, targetPath); } catch (e) {
              console.warn('Não foi possível renomear, tentando copiar e remover...', e.message);
              await fs.writeFile(targetPath, buf);
              try { await fs.unlink(full); } catch {}
            }
          }
        }

        // Upsert metadados
        await upsertMeta(key, targetName, {
          hash,
          contentType: getContentTypeByExt(desiredExt),
          size: buf.length,
          originalName: f,
          migratedAt: new Date().toISOString(),
        });

        // Upload para Supabase, se habilitado
        if (isSupabaseEnabled()){
          const rel = `${key}/${targetName}`;
          const contentType = getContentTypeByExt(desiredExt);
          const res = await supaUpload(rel, buf, contentType);
          if (res?.ok){
            const url = supaPublicUrl(rel);
            console.log(`☁️  Enviado: ${rel} -> ${url}`);
          } else {
            console.warn(`⚠️  Falha no upload para Supabase: ${rel} (${res?.error})`);
          }
        }
      }

      // Salva manifest consolidado
      manifest = await readManifest(key);
      await writeManifest(key, manifest);
    }
  }

  console.log('\n✅ Migração concluída.');
}

migrate().catch((e)=>{
  console.error('❌ Erro na migração:', e);
  process.exit(1);
});

