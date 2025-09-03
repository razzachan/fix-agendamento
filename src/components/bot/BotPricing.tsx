import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';

interface Rule { id?: string; service_type: string; region?: string; urgency?: string; base?: number; min?: number; max?: number; priority?: number; notes?: string; }

export function BotPricing(){
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    loadRules();
  },[]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('price_list').select('*').order('priority', { ascending: false });
      if (error) throw error;
      setRules(data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar regras de preço: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const add = () => setRules(prev => [...prev, { service_type:'', region:'', urgency:'', base:0, min:0, max:0, priority:1, notes:'' }]);
  const remove = (i:number) => setRules(prev => prev.filter((_,idx)=>idx!==i));

  const save = async () => {
    setSaving(true);
    try {
      // Primeiro, deletar todas as regras existentes
      const { error: deleteError } = await supabase.from('price_list').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // Depois, inserir as novas regras
      if (rules.length > 0) {
        const { error: insertError } = await supabase.from('price_list').insert(
          rules.map(rule => ({
            service_type: rule.service_type,
            region: rule.region || null,
            urgency: rule.urgency || null,
            base: rule.base || 0,
            min: rule.min || 0,
            max: rule.max || 0,
            priority: rule.priority || 1,
            notes: rule.notes || null
          }))
        );
        if (insertError) throw insertError;
      }

      toast.success('Regras de preço salvas com sucesso!');
      await loadRules(); // Recarregar para pegar os IDs
    } catch (e: any) {
      toast.error('Erro ao salvar regras: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Como funcionam as regras de preço"
          description="Cada regra define um preço base e limites (mín/máx), podendo ser filtrada por serviço, região e urgência. O orçamento usa a regra com maior prioridade que combinar com os parâmetros informados."
        />

        <CardTitle>Preços e Orçamento</CardTitle>
        <CardDescription>Defina regras de preço por serviço/região/urgência</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((r,idx)=> (
          <div key={idx} className="border rounded p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <Label className="flex items-center">Serviço <span className="ml-1"><FieldHint text="Tipo de serviço (ex.: fogão, geladeira). Usado para casar com pedidos de orçamento."/></span></Label>
                <Input value={r.service_type} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, service_type:e.target.value}: x))} />
              </div>
              <div>
                <Label className="flex items-center">Região <span className="ml-1"><FieldHint text="Filtra por área de atendimento (ex.: centro, zona sul). Deixe em branco para regra geral."/></span></Label>
                <Input value={r.region||''} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, region:e.target.value}: x))} />
              </div>
              <div>
                <Label className="flex items-center">Urgência <span className="ml-1"><FieldHint text="Sinalize regras para atendimentos urgentes (ex.: 24h)."/></span></Label>
                <Input value={r.urgency||''} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, urgency:e.target.value}: x))} />
              </div>
              <div>
                <Label className="flex items-center">Base <span className="ml-1"><FieldHint text="Preço base estimado para o serviço nessas condições."/></span></Label>
                <Input type="number" value={r.base||0} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, base:Number(e.target.value)}: x))} />
              </div>
              <div>
                <Label className="flex items-center">Mínimo <span className="ml-1"><FieldHint text="Valor mínimo que poderá ser retornado para este tipo de orçamento."/></span></Label>
                <Input type="number" value={r.min||0} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, min:Number(e.target.value)}: x))} />
              </div>
              <div>
                <Label className="flex items-center">Máximo <span className="ml-1"><FieldHint text="Valor máximo que poderá ser retornado. Ajuda a evitar estimativas fora do padrão."/></span></Label>
                <Input type="number" value={r.max||0} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, max:Number(e.target.value)}: x))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <Label className="flex items-center">Prioridade <span className="ml-1"><FieldHint text="Quando várias regras casarem, a de maior prioridade vence (número maior = maior prioridade)."/></span></Label>
                <Input type="number" value={r.priority||1} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, priority:Number(e.target.value)}: x))} />
              </div>
              <div className="md:col-span-5">
                <Label>Notas</Label>
                <Textarea value={r.notes||''} onChange={e=> setRules(s=> s.map((x,i)=> i===idx? {...x, notes:e.target.value}: x))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="destructive" onClick={()=>remove(idx)}>Remover</Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={add}>Adicionar Regra</Button>
          <Button onClick={save} disabled={saving}>{saving? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

