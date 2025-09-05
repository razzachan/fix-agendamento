import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function VisualTraining(){
  const [images, setImages] = useState<{[k:string]: {file:string; url:string}[]}>({});
  const [segment, setSegment] = useState('basico');
  const [type, setType] = useState<'cooktop'|'floor'>('cooktop');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const base = (window as any).__API_URL__ || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  const token = (window as any).BOT_TOKEN || (import.meta as any).env?.VITE_BOT_TOKEN || '';

  async function load(){
    try {
      console.log('[VisualTraining] carregando lista...');
      const resp = await fetch(`${base}/api/vision/training-images`, { headers: { 'x-bot-token': token } });
      if (!resp.ok){
        const txt = await resp.text().catch(()=> '');
        console.error('[VisualTraining] lista falhou:', resp.status, txt);
        toast.error(`Falha ao carregar imagens (${resp.status}). Verifique o BOT_TOKEN e a API.`);
        return;
      }
      const data = await resp.json().catch(()=> null);
      console.log('[VisualTraining] lista carregada:', data);
      if (data?.ok) setImages(data.result||{}); else toast.error('Falha ao carregar imagens.');
    } catch (e) {
      console.error('[VisualTraining] erro ao carregar:', e);
    }
  }
  const [editingMeta, setEditingMeta] = useState<{key:string; file:string; meta:any}|null>(null);


  useEffect(()=>{ void load(); }, []);

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>){
    const files = Array.from(e.target.files || []);
    console.log('[VisualTraining] arquivos selecionados:', files.map(f=>f.name));
    setSelectedFiles(files);
    // Envio automático ao selecionar (para evitar problemas de clique)
    setTimeout(()=> { void onSubmitUpload(files); }, 0);
  }

  async function onSubmitUpload(filesOverride?: File[]){
    const files = filesOverride ?? selectedFiles;
    if (!files.length) { console.warn('[VisualTraining] nenhum arquivo para enviar'); return; }
    setUploading(true);
    try {
      for (const file of files){
        const b64 = await toBase64(file);
        console.log('[VisualTraining] enviando:', {name: file.name, type, segment});
        const resp = await fetch(`${base}/api/vision/training-images`, { method:'POST', headers:{'Content-Type':'application/json', 'x-bot-token': token}, body: JSON.stringify({ type, segment, imageBase64: b64, filename: file.name }) });
        if (!resp.ok){
          const txt = await resp.text().catch(()=> '');
          console.error('[VisualTraining] upload falhou:', resp.status, txt);
          toast.error(`Falha ao enviar ${file.name}: ${resp.status}`);
          continue;
        }
        const data = await resp.json().catch(()=>null);
        console.log('[VisualTraining] upload resp:', data);
        if (!data?.ok) toast.error(`Falha ao processar ${file.name}`);
      }
      await load();
      setSelectedFiles([]);
      try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch {}
    } catch(e){
      console.error('[VisualTraining] erro ao enviar:', e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação Visual — Fogões</CardTitle>
        <CardDescription>Envie imagens de referência por segmento (Básico, Inox, Premium). Essas imagens ajudarão na sugestão automática do segmento durante o orçamento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <select className="border rounded p-2" value={segment} onChange={e=> setSegment(e.target.value)}>
            <option value="basico">Básico</option>
            <option value="inox">Inox</option>
            <option value="premium">Premium</option>
          </select>
          <select className="border rounded p-2" value={type} onChange={e=> setType(e.target.value as any)}>
            <option value="cooktop">Cooktop</option>
            <option value="floor">Fogão de piso</option>
          </select>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileSelect} />
          <Button onClick={onSubmitUpload} disabled={uploading || !selectedFiles.length}>{uploading ? 'Enviando...' : selectedFiles.length ? `Enviar ${selectedFiles.length}` : 'Enviar'}</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'cooktop_basico', label: 'Cooktop • Básico' },
            { key: 'cooktop_inox', label: 'Cooktop • Inox' },
            { key: 'cooktop_premium', label: 'Cooktop • Premium' },
            { key: 'floor_basico', label: 'Fogão de piso • Básico' },
            { key: 'floor_inox', label: 'Fogão de piso • Inox' },
            { key: 'floor_premium', label: 'Fogão de piso • Premium' },
          ].map(({key, label})=> (
            <div key={key}>
              <div className="border rounded p-2">
                <div className="font-medium mb-2">{label}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(images[key]||[]).map(img=> (
                    <img key={img.file} src={img.url} alt={img.file} className="w-full h-20 object-cover rounded cursor-pointer" onClick={async ()=>{
                      const res = await fetch(`${base}/api/vision/training-images/${encodeURIComponent(key)}/meta`, { headers: { 'x-bot-token': token } });
                      if (!res.ok){ const t = await res.text().catch(()=> ''); toast.error(`Falha ao ler metadados (${res.status})`); console.error(t); return; }
                      const data = await res.json().catch(()=> null);
                      setEditingMeta({ key, file: img.file, meta: data?.data?.[img.file] || {} });
                    }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm" onClick={async ()=>{
                  const list = images[key]||[];
                  const last = list[list.length-1];
                  if (!last) return;
                  const del = await fetch(`${base}/api/vision/training-images/${encodeURIComponent(key)}/${encodeURIComponent(last.file)}`, { method:'DELETE', headers: { 'x-bot-token': token } });
                  if (!del.ok){ const t = await del.text().catch(()=> ''); toast.error(`Falha ao excluir (${del.status})`); console.error(t); return; }
                  await load();
                }}>
                  Excluir última
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function toBase64(file: File){
  return new Promise<string>((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

