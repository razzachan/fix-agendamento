import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LogItem { id:string; entity:string; entity_id:string; action:string; details:any; created_at:string }

export function BotDecisionLogs(){
  const [items, setItems] = useState<LogItem[]>([]);
  const [entity, setEntity] = useState('calendar_event');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState<number|null>(null);

  async function load(){
    setLoading(true);
    try{
      const base = (window as any).__API_URL__ || window.location.origin;
      const headers: any = {}; try { const t=(window as any).BOT_TOKEN; if (t) headers['x-bot-token']=t; } catch {}
      const url = new URL('/api/bot/tools/decision-logs', base);
      if (entity) url.searchParams.set('entity', entity);
      if (q) url.searchParams.set('q', q);
      if (start) url.searchParams.set('start', start);
      if (end) url.searchParams.set('end', end);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      const resp = await fetch(url.toString(), { headers });
      const data = await resp.json().catch(()=>({items:[]}));
      setItems(data.items || []);
      setTotal(data.total ?? null);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [entity, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <select className="border rounded p-2" value={entity} onChange={e=>setEntity(e.target.value)}>
            <option value="">Todos</option>
            <option value="calendar_event">calendar_event</option>
            <option value="service_order">service_order</option>
          </select>
          <input className="border rounded p-2 flex-1" placeholder="Buscar (entity_id ou ação)" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="flex items-center gap-2">
            <input type="date" className="border rounded p-2" value={start} onChange={e=>setStart(e.target.value)} />
            <span className="text-xs text-muted-foreground">a</span>
            <input type="date" className="border rounded p-2" value={end} onChange={e=>setEnd(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-3" onClick={()=>{ setPage(1); load(); }} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</button>
            <a
              className="border rounded px-3"
              href={(function(){ const base=(window as any).__API_URL__||window.location.origin; const headers=''; const url=new URL('/api/bot/tools/decision-logs', base); if(entity) url.searchParams.set('entity',entity); if(q) url.searchParams.set('q', q); if(start) url.searchParams.set('start',start); if(end) url.searchParams.set('end',end); url.searchParams.set('page', String(page)); url.searchParams.set('pageSize', String(pageSize)); return url.toString(); })()}
              target="_blank"
              rel="noopener noreferrer"
            >Exportar</a>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Página {page} {total ? `de ${Math.max(1, Math.ceil(total / pageSize))}` : ''}
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-2 py-1" disabled={page<=1} onClick={()=>{ setPage(p=>Math.max(1,p-1)); }}>
              Anterior
            </button>
            <button className="border rounded px-2 py-1" disabled={total !== null && page >= Math.ceil(total / pageSize)} onClick={()=>{ setPage(p=>p+1); }}>
              Próxima
            </button>
            <select className="border rounded p-1" value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
              {[25,50,100,200].map(n=> <option key={n} value={n}>{n}/página</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2 mt-2">
          {items.map(it=> (
            <div key={it.id} className="border rounded p-2">
              <div className="text-xs text-gray-500 flex items-center justify-between">
                <span>{new Date(it.created_at).toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{it.action}</Badge>
                  <button
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={()=>{ try { navigator.clipboard.writeText(JSON.stringify(it, null, 2)); } catch {} }}
                    title="Copiar JSON"
                  >Copiar</button>
                </div>
              </div>
              <div className="text-sm">{it.entity} • {it.entity_id}</div>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(it.details, null, 2)}</pre>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

