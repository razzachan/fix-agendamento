import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BotFlow } from '@/types/bot';
import { toolsCatalog } from '@/config/toolsCatalog';
import { FieldHint } from '@/components/ui/field-hint';
import { SectionHint } from '@/components/ui/section-hint';
import { Badge } from '@/components/ui/badge';

import { StovePhotoClassifier } from './StovePhotoClassifier';

import { botService } from '@/services/bot/botService';

export function BotFlows() {
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BotFlow | null>(null);
  const [advancedJSON, setAdvancedJSON] = useState(false);

  function parseCurrentInput(){
    try {
      const raw = editing?.steps?.[0]?.params?.input || '{}';
      return JSON.parse(String(raw));
    } catch { return {}; }
  }

  function updateToolInput(obj: Record<string, any>){
    if (!editing) return;
    const tool = editing.steps?.[0]?.params?.tool || '';
    const input = JSON.stringify(obj);
    setEditing({ ...editing, steps: [{ action: 'execute_tool', params: { tool, input } }] });
  }


  const load = async () => {
    setLoading(true);
    try {
      const data = await botService.listFlows();
      setFlows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startNew = () => setEditing({
    id: '', bot_id: '', name: '', enabled: true,
    trigger: { type: 'keyword', value: '' },
    steps: [{ action: 'send_template', params: { key: '' } }]
  } as any);

  const save = async () => {
    if (!editing) return;
    await botService.saveFlow({ ...editing, id: editing.id || undefined });
    setEditing(null);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <SectionHint
          title="Como funcionam os fluxos"
          description="Fluxos disparam ações com base em gatilhos (ex.: palavras‑chave). Hoje: enviar templates e executar uma tool‑call simples. Lógica avançada (condições/múltiplas ações) via Intenções + Orquestrador."
        />

        <CardTitle>Fluxos e Automações</CardTitle>
        <CardDescription>Dispare ações com palavras‑chave (MVP)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="flex items-center">Palavra‑chave <span className="ml-1"><FieldHint text="Quando esta palavra for recebida, o fluxo será disparado. Use com parcimônia para não conflitar com intenções."/></span></Label>
                <Input value={editing.trigger?.value || ''} onChange={e => setEditing({ ...editing, trigger: { type: 'keyword', value: e.target.value } })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Ação</Label>
                <select
                  className="w-full border rounded p-2"
                  value={editing.steps?.[0]?.action || 'send_template'}
                  onChange={(e)=>{
                    const action = e.target.value as 'send_template'|'execute_tool';
                    const params = action==='send_template' ? { key: editing.steps?.[0]?.params?.key || '' } : { tool: '', input: '{}' };
                    setEditing({ ...editing, steps: [{ action, params }] });
                  }}
                >
                  <option value="send_template">Enviar template</option>
                  <option value="execute_tool">Executar tool‑call</option>
                </select>
              </div>
                  {/* Modo guiado para getAvailability */}
                  {editing.steps?.[0]?.params?.tool==='getAvailability' && !advancedJSON && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <select className="w-full border rounded p-2" onChange={e=>{
                          const v = e.target.value;
                          const obj = parseCurrentInput();
                          if (v==='today') obj.date = '{{today}}'; else obj.date = v;
                          updateToolInput(obj);
                        }}>
                          <option value="today">Hoje</option>
                          <option value="">Escolher manualmente…</option>
                        </select>
                      </div>
                      <div>
                        <Label>Duração (min)</Label>
                        <Input type="number" min={30} step={30} value={parseCurrentInput().duration||60} onChange={e=>{
                          const obj = parseCurrentInput();
                          obj.duration = Number(e.target.value||60);
                          updateToolInput(obj);
                  {/* Modo guiado: buildQuote (catálogo local) */}
                  {editing.steps?.[0]?.params?.tool==='buildQuote' && !advancedJSON && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label>Serviço</Label>
                          <select className="w-full border rounded p-2" value={parseCurrentInput().service_type||''} onChange={e=>{ const obj=parseCurrentInput(); obj.service_type=e.target.value; updateToolInput(obj); }}>
                            <option value="">Selecione…</option>
                            <option value="coifa_diagnostico">Coifa — Visita Diagnóstica</option>
                            <option value="lava_roupas_coleta">Lava Roupas — Coleta Diagnóstico</option>
                            <option value="fogao_residencial_manutencao">Fogão Residencial — Manutenção</option>
                            <option value="fogao_industrial_manutencao">Fogão Industrial — Manutenção</option>
                          </select>
                        </div>
                        {/* Campos genéricos */}
                        <div>
                          <Label>Marca (opcional)</Label>
                          <Input placeholder="ex.: Brastemp" value={parseCurrentInput().brand||''} onChange={e=>{ const obj=parseCurrentInput(); obj.brand=e.target.value; updateToolInput(obj); }} />
                        </div>
                        <div>
                          <Label>Segmento</Label>
                          <select className="w-full border rounded p-2" value={parseCurrentInput().segment||''} onChange={e=>{ const obj=parseCurrentInput(); obj.segment=e.target.value; updateToolInput(obj); }}>
                            <option value="">Selecione…</option>
                            <option value="basico">Básico</option>
                            <option value="inox">Inox</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <Label>Problema (categoria)</Label>
                          <Input placeholder="ex.: motor, filtro, comando, vazamento, acendimento, chamas_fracas" value={parseCurrentInput().problemCategory||''} onChange={e=>{ const obj=parseCurrentInput(); obj.problemCategory=e.target.value; updateToolInput(obj); }} />
                        </div>
                      {/* Classificar por foto (preenche segmento) */}
                      {parseCurrentInput().service_type?.startsWith('fogao_') && (
                        <div className="md:col-span-3">
                          <StovePhotoClassifier onSegment={(seg, _conf, t)=>{ const obj=parseCurrentInput(); obj.segment = seg; if (t){ obj.stoveForm = obj.stoveForm||{}; obj.stoveForm.type = (t === 'floor' ? 'piso' : 'cooktop'); } updateToolInput(obj); }} />
                        </div>
                      )}

                      </div>

                      {/* Fogão Residencial */}
                      {parseCurrentInput().service_type==='fogao_residencial_manutencao' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Tipo</Label>
                            <select className="w-full border rounded p-2" value={parseCurrentInput().stoveForm?.type||''} onChange={e=>{ const obj=parseCurrentInput(); obj.stoveForm = obj.stoveForm||{}; obj.stoveForm.type=e.target.value; updateToolInput(obj); }}>
                              <option value="">Selecione…</option>
                              <option value="piso">Piso</option>
                              <option value="cooktop">Cooktop</option>
                            </select>
                          </div>
                          <div>
                            <Label>Bocas</Label>
                            <select className="w-full border rounded p-2" value={parseCurrentInput().stoveForm?.burners||''} onChange={e=>{ const obj=parseCurrentInput(); obj.stoveForm = obj.stoveForm||{}; obj.stoveForm.burners= Number(e.target.value)||4; updateToolInput(obj); }}>
                              <option value="">Selecione…</option>
                              <option value="2">2</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                              <option value="6">6</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Fogão Industrial */}
                      {parseCurrentInput().service_type==='fogao_industrial_manutencao' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Classe (apenas para inox: basico/premium) */}
                          {parseCurrentInput().segment==='inox' && (
                            <div>
                              <Label>Classe (Inox)</Label>
                              <select className="w-full border rounded p-2" value={parseCurrentInput().stoveForm?.classLevel||''} onChange={e=>{ const obj=parseCurrentInput(); obj.stoveForm = obj.stoveForm||{}; obj.stoveForm.classLevel= e.target.value as any; updateToolInput(obj); }}>
                                <option value="">Selecione…</option>
                                <option value="basico">Básico</option>
                                <option value="premium">Premium</option>
                              </select>
                            </div>
                          )}

                          <div>
                            <Label>Bocas</Label>
                            <select className="w-full border rounded p-2" value={parseCurrentInput().industrialForm?.burners||''} onChange={e=>{ const obj=parseCurrentInput(); obj.industrialForm = obj.industrialForm||{}; obj.industrialForm.burners= Number(e.target.value)||6; updateToolInput(obj); }}>
                              <option value="">Selecione…</option>
                              <option value="4">4</option>
                              <option value="6">6</option>
                              <option value="8">8</option>
                              <option value="10">10</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">Os valores seguem as diretrizes do treinamento (visita diagnosticada/coleta com abatimento, tabelas por bocas e escopo no local com garantia).</div>
                    </div>
                  )}

                        }} />
                  {/* Modo guiado: createAppointment */}
                  {editing.steps?.[0]?.params?.tool==='createAppointment' && !advancedJSON && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nome do cliente</Label>
                        <Input value={parseCurrentInput().client_name||''} onChange={e=>{ const obj=parseCurrentInput(); obj.client_name=e.target.value; updateToolInput(obj); }} />
                      </div>
                      <div>
                        <Label>Data e hora (início)</Label>
                        <Input placeholder="YYYY-MM-DDTHH:mm:00" value={parseCurrentInput().start_time||''} onChange={e=>{ const obj=parseCurrentInput(); obj.start_time=e.target.value||''; updateToolInput(obj); }} />
                      {editing.steps?.[0]?.params?.tool==='buildQuote' && !advancedJSON && (
                        <div className="text-xs text-muted-foreground">Dica: ao salvar, o bot usará o catálogo local para calcular o preço base e enviar a resposta com os textos do treinamento. Podemos alternar depois para a tabela price_list do banco.</div>
                      )}

                        <div className="text-xs text-muted-foreground">Dica: use {'{{today}}'}T14:00:00 para hoje às 14:00</div>
                      </div>
                      <div>
                        <Label>Data e hora (fim)</Label>
                        <Input placeholder="YYYY-MM-DDTHH:mm:00" value={parseCurrentInput().end_time||''} onChange={e=>{ const obj=parseCurrentInput(); obj.end_time=e.target.value||''; updateToolInput(obj); }} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Endereço (opcional)</Label>
                        <Input value={parseCurrentInput().address||''} onChange={e=>{ const obj=parseCurrentInput(); obj.address=e.target.value; updateToolInput(obj); }} />
                      </div>
                    </div>
                  )}

                  {/* Modo guiado: cancelAppointment */}
                  {editing.steps?.[0]?.params?.tool==='cancelAppointment' && !advancedJSON && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>ID do agendamento</Label>
                        <Input value={parseCurrentInput().id||''} onChange={e=>{ const obj=parseCurrentInput(); obj.id=e.target.value; updateToolInput(obj); }} />
                      </div>
                      <div>
                        <Label>Motivo (opcional)</Label>
                        <Input value={parseCurrentInput().reason||''} onChange={e=>{ const obj=parseCurrentInput(); obj.reason=e.target.value; updateToolInput(obj); }} />
                      </div>
                    </div>
                  )}

                  {/* Modo guiado: getOrderStatus */}
                  {editing.steps?.[0]?.params?.tool==='getOrderStatus' && !advancedJSON && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>ID da OS</Label>
                        <Input value={parseCurrentInput().id||''} onChange={e=>{ const obj=parseCurrentInput(); obj.id=e.target.value; updateToolInput(obj); }} />
                        <div className="text-xs text-muted-foreground">Se preferir usar telefone/email, podemos adicionar depois um lookup guiado.</div>
                      </div>
                    </div>
                  )}

                      </div>
                    </div>
                  )}

                  {/* Toggle avançado */}
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={()=> setAdvancedJSON(v=>!v)}>
                      {advancedJSON ? 'Ocultar JSON' : 'Editar como JSON'}
                    </Button>
                  </div>

              {editing.steps?.[0]?.action === 'send_template' ? (
                <div>
                  <Label>Template Key</Label>
                {/* send_template: variáveis opcionais */}
                {editing.steps?.[0]?.action === 'send_template' && (
                  <div className="md:col-span-2">
                    <Label>Variáveis (JSON) — opcional</Label>
                    <Textarea rows={3} placeholder='{"nome":"João","os_id":"123"}' onChange={e=> setEditing({ ...editing, steps: [{ action: 'send_template', params: { key: editing.steps?.[0]?.params?.key || '', vars: e.target.value } }] })} />
                    <div className="text-xs text-muted-foreground">Se informar, substituímos placeholders do template: {'{{nome}}'}, {'{{os_id}}'}, etc.</div>
                  </div>
                )}

                  <Input value={(editing.steps?.[0]?.params?.key) || ''} onChange={e => setEditing({ ...editing, steps: [{ action: 'send_template', params: { key: e.target.value } }] })} placeholder="ex.: greeting" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label>Tool</Label>
                    <select className="w-full border rounded p-2" value={(editing.steps?.[0]?.params?.tool) || ''} onChange={e => setEditing({ ...editing, steps: [{ action: 'execute_tool', params: { tool: e.target.value, input: editing.steps?.[0]?.params?.input || '{}' } }] })}>
                      <option value="">Selecione...</option>
                      {toolsCatalog.map(t=> <option key={t.name} value={t.name}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground -mt-1">Dica: use {'{{today}}'} para a data de hoje automaticamente.</div>

                  {advancedJSON && (
                    <div>
                      <Label>Input JSON</Label>
                      <Textarea rows={4} value={(editing.steps?.[0]?.params?.input) || '{}'} onChange={e => setEditing({ ...editing, steps: [{ action: 'execute_tool', params: { tool: editing.steps?.[0]?.params?.tool || '', input: e.target.value } }] })} placeholder='ex.: {"date":"{{today}}"}' />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Salvar</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">{loading ? 'Carregando...' : `${flows.length} fluxos`}</div>
              <Button onClick={startNew}>Novo Fluxo</Button>
            </div>
            <div className="space-y-2">
              {flows.map(f => (
                <div key={f.id} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">keyword: {f.trigger?.value} → send_template: {f.steps?.[0]?.params?.key}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(f)}>Editar</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

