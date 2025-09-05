import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type NearestRef = { type: string; seg: string; file: string; sim: number };

export function StovePhotoClassifier({ onSegment }: { onSegment: (seg: string, confidence: number, type?: string) => void }){
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type?:string; segment:string; confidence:number}|null>(null);
  const [nearest, setNearest] = useState<NearestRef[]>([]);

  async function classify(){
    if (!file) return;
    setLoading(true);
    try {
      const b64 = await toBase64(file);
      const headers: any = { 'Content-Type': 'application/json' };
      const token = (window as any).BOT_TOKEN || '';
      if (token) headers['x-bot-token'] = token;
      const base = (window as any).__API_URL__ || '';
      const resp = await fetch(`${base}/api/vision/classify-stove`, { method:'POST', headers, body: JSON.stringify({ imageBase64: b64 }) });
      const data = await resp.json().catch(()=>null);
      if (!resp.ok || !data?.ok) {
        toast.error('Falha ao analisar imagem. Tente novamente.');
        return;
      }
      setResult({ type: data.type, segment: data.segment, confidence: data.confidence });
      setNearest(Array.isArray(data.nearest) ? data.nearest.slice(0,3) : []);
      onSegment(data.segment, data.confidence, data.type);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-2">
      <Label>Classificar por foto (opcional)</Label>
      <input type="file" accept="image/*" onChange={e=> setFile(e.target.files?.[0]||null)} />
      <Button size="sm" onClick={classify} disabled={!file || loading}>{loading ? 'Analisando...' : 'Analisar imagem'}</Button>
      {result && (
        <div className="text-xs text-muted-foreground">Sugestão: {result.type || '—'}/{result.segment} (confiança {Math.round(result.confidence*100)}%) — você pode ajustar manualmente os campos.</div>
      )}
      {nearest.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium mb-1">Referências similares</div>
          <div className="grid grid-cols-3 gap-2">
            {nearest.map((n, idx)=>{
              const url = `/training-images/fogoes/${n.type}_${n.seg}/${encodeURIComponent(n.file)}`;
              return (
                <div key={idx} className="text-center">
                  <img src={url} alt={`${n.seg}-${n.file}`} className="w-full h-16 object-cover rounded" />
                  <div className="text-[10px] text-muted-foreground mt-1">{n.seg} · sim {Math.round(n.sim*100)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
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

