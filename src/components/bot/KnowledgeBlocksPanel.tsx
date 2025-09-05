import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { KnowledgePreview } from './KnowledgePreview';

type KB = { id?: string; key: string; type?: string; description?: string; data?: any; enabled?: boolean; created_at?: string };

export function KnowledgeBlocksPanel(){
  const [items, setItems] = useState<KB[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<KB|null>(null);
  const [json, setJson] = useState('');
  const [keyField, setKeyField] = useState('');
  const [descField, setDescField] = useState('');
  const [enabledField, setEnabledField] = useState(true);

  const filtered = useMemo(()=>{
    const q = filter.toLowerCase();
    return items.filter(i => !q || i.key.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
  }, [items, filter]);

  const load = async ()=>{
    setLoading(true);
    try{
      const { data, error } = await supabase.from('bot_knowledge_blocks').select('*').order('key');
      if (error) throw error;
      setItems(data as KB[]);
    } catch(e:any){ toast.error('Falha ao carregar blocos: '+(e.message||e)); }
    finally{ setLoading(false); }
  };

  const onEdit = (kb: KB)=>{
    setEditing(kb);
    setKeyField(kb.key || '');
    setDescField(kb.description || '');
    setEnabledField(kb.enabled ?? true);
    setJson(JSON.stringify(kb.data || {}, null, 2));
  };

  const onNew = ()=>{
    setEditing({ key: '', description: '', enabled: true, data: {} });
    setKeyField('');
    setDescField('');
    setEnabledField(true);
    setJson('{}');
  };

  const onSave = async ()=>{
    if (!editing) return;
    if (!keyField.trim()) { toast.error('Informe a chave (key) do bloco'); return; }
    let parsed: any;
    try{ parsed = json.trim() ? JSON.parse(json) : {}; }
    catch{ toast.error('JSON inválido'); return; }

    if (editing.id) {
      const { error } = await supabase.from('bot_knowledge_blocks').update({ key: keyField.trim(), description: descField, enabled: enabledField, data: parsed }).eq('id', editing.id);
      if (error) { toast.error('Erro ao salvar: '+error.message); return; }
    } else {
      const { error } = await supabase.from('bot_knowledge_blocks').upsert({ key: keyField.trim(), type: 'knowledge_block', description: descField, enabled: enabledField, data: parsed }, { onConflict: 'key' });
      if (error) { toast.error('Erro ao criar: '+error.message); return; }
    }
    toast.success('Bloco salvo');
    setEditing(null);
    await load();
  };

  const onToggle = async (kb: KB, enabled: boolean)=>{
    const { error } = await supabase.from('bot_knowledge_blocks').update({ enabled }).eq('id', kb.id);
    if (error) { toast.error('Erro ao atualizar: '+error.message); return; }
    setItems(prev => prev.map(x=> x.id===kb.id ? { ...x, enabled } : x));
  };

  useEffect(()=>{ load(); }, []);

  return (<>


    <Card>
      <CardHeader>
        <CardTitle>Blocos de Conhecimento (IA)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Filtrar por chave/descrição" value={filter} onChange={e=>setFilter(e.target.value)} />
          <Button variant="outline" onClick={load} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</Button>
          <Button onClick={onNew}>Novo bloco</Button>
        </div>
        <div className="space-y-2">
          {filtered.map(kb=> (
            <div key={kb.id} className="flex items-center gap-3 border rounded-md p-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm truncate">{kb.key}</div>
                {kb.description && <div className="text-muted-foreground text-xs truncate">{kb.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ativo</span>
                <Switch checked={!!kb.enabled} onCheckedChange={(c)=>onToggle(kb, c)} />
                <Button size="sm" onClick={()=>onEdit(kb)}>Editar JSON</Button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="text-sm text-muted-foreground">Nenhum bloco encontrado.</div>}
        </div>

        {editing && (
          <div className="mt-4 border rounded-md p-3 space-y-2">
            <div className="mb-2 font-semibold">{editing.id ? 'Editando' : 'Novo'} bloco</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Key</div>
                <Input value={keyField} onChange={e=>setKeyField(e.target.value)} placeholder="ex.: diagnostico_fogao_nao_acende" />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Descrição</div>
                <Input value={descField} onChange={e=>setDescField(e.target.value)} placeholder="Descrição do bloco" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch checked={enabledField} onCheckedChange={setEnabledField} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">JSON (data)</div>
              <Textarea value={json} onChange={e=>setJson(e.target.value)} className="font-mono" rows={14} />
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={onSave}>Salvar</Button>
              <Button variant="outline" onClick={()=>setEditing(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </>);
}

