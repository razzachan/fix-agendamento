import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // manter import se precisarmos mais tarde, mas iremos usar a API do backend para evitar RLS no anon

export function BrandSegmentation(){
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    try {
      const base = (window as any).__API_URL__ || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const resp = await fetch(`${base}/api/brand-rules`);
      if (!resp.ok) throw new Error(`Falha ao listar regras (${resp.status})`);
      const js = await resp.json();
      setItems(js?.items||[]);
    } catch (e:any) {
      toast.error('Erro ao carregar regras: '+(e.message||e));
    } finally { setLoading(false); }
  }

  useEffect(()=>{ void load(); },[]);

  function update(idx:number, patch: any){ setItems(s => s.map((x,i)=> i===idx? {...x, ...patch}: x)); }

  async function add(){
    const next = { brand:'', applies_to:'both', strategy:'infer_by_photos', recommended_segment:null, notes:'' };
    setItems(s => [next, ...s]);
  }

  async function save(){
    try {
      const base = (window as any).__API_URL__ || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const payload = items.map(x=> ({
        brand: x.brand?.trim(),
        applies_to: x.applies_to || 'both',
        strategy: x.strategy || 'infer_by_photos',
        recommended_segment: x.recommended_segment || null,
        notes: x.notes || null
      }));
      const resp = await fetch(`${base}/api/brand-rules/bulk`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items: payload }) });
      if (!resp.ok) throw new Error(`Falha ao salvar regras (${resp.status})`);
      toast.success('Regras salvas');
      await load();
    } catch (e:any) {
      toast.error('Erro ao salvar: '+(e.message||e));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marcas e Segmentação</CardTitle>
        <CardDescription>Defina como consolidar o segmento combinando marca e classificação visual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={add} variant="outline">Adicionar</Button>
          <Button onClick={save}>Salvar</Button>
        </div>
        {loading ? <div>Carregando...</div> : (
          <div className="space-y-3">
            {items.map((it,idx)=> (
              <div key={idx} className="border rounded p-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                <div>
                  <Label>Marca</Label>
                  <Input value={it.brand||''} onChange={e=> update(idx,{brand:e.target.value})} placeholder="Ex.: Franke" />
                </div>
                <div>
                  <Label>Aplica a</Label>
                  <Select value={it.applies_to||'both'} onValueChange={v=> update(idx,{applies_to:v})}>
                    <SelectTrigger><SelectValue placeholder="both"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Ambos</SelectItem>
                      <SelectItem value="cooktop">Cooktop</SelectItem>
                      <SelectItem value="floor">Piso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estratégia</Label>
                  <Select value={it.strategy||'infer_by_photos'} onValueChange={v=> update(idx,{strategy:v})}>
                    <SelectTrigger><SelectValue placeholder="infer_by_photos"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infer_by_photos">Inferir pelas fotos</SelectItem>
                      <SelectItem value="prefer">Preferir recomendado</SelectItem>
                      <SelectItem value="force">Forçar recomendado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segmento recomendado</Label>
                  <Select value={it.recommended_segment||'none'} onValueChange={v=> update(idx,{recommended_segment:v==='none'?null:v})}>
                    <SelectTrigger><SelectValue placeholder="(opcional)"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(nenhum)</SelectItem>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="inox">Inox</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Notas</Label>
                  <Input value={it.notes||''} onChange={e=> update(idx,{notes:e.target.value})} placeholder="Ex.: inox/premium" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

