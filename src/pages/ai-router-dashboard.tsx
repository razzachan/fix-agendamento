import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AIRouterDashboard(){
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|undefined>();

  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true);
        const { data, error } = await supabase
          .from('bot_ai_router_logs')
          .select('*')
          .order('created_at', { ascending:false })
          .limit(200);
        if (error) throw error;
        setRows(data||[]);
      }catch(e:any){ setError(String(e)); }
      finally{ setLoading(false); }
    })();
  },[]);

  const metrics = useMemo(()=>{
    const total = rows.length;
    const byEvent: Record<string, number> = {};
    for (const r of rows){ byEvent[r.event] = (byEvent[r.event]||0)+1; }
    const outcome = (byEvent['ai_route_success']||0) + (byEvent['ai_route_error']||0);
    const parseErrorRate = total ? Math.round(100*(byEvent['ai_route_parse_error']||0)/total) : 0;
    const successRate = outcome ? Math.round(100*(byEvent['ai_route_success']||0)/outcome) : 0;
    const fallbackRate = outcome ? Math.round(100*(byEvent['ai_route_error']||0)/outcome) : 0;
    const decisions = byEvent['ai_route_decision']||0;
    const effective = byEvent['ai_route_effective']||0;
    return { total, parseErrorRate, successRate, fallbackRate, decisions, effective, byEvent };
  },[rows]);

  return (
    <div style={{padding:16}}>
      <h1>AI Router - Monitor</h1>
      {loading && <p>Carregando...</p>}
      {error && <p style={{color:'red'}}>Erro: {error}</p>}

      <section>
        <h3>Métricas (últimos 200 eventos)</h3>
        <ul>
          <li>Total: {metrics.total}</li>
          <li>Sucesso: {metrics.successRate}% (somente success/(success+error))</li>
          <li>Fallback: {metrics.fallbackRate}%</li>
          <li>Erros de parse JSON: {metrics.parseErrorRate}%</li>
          <li>Decisions: {metrics.decisions} | Effective: {metrics.effective}</li>
        </ul>
      </section>

      <section>
        <h3>Eventos recentes</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Quando</th>
              <th style={{textAlign:'left'}}>Evento</th>
              <th style={{textAlign:'left'}}>Mensagem</th>
              <th style={{textAlign:'left'}}>Intent/ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=>{
              const p = r.payload||{};
              const msg = p.message || p.body || '';
              const dec = p.effective || p.decision || {};
              const intent = dec.intent || '';
              const acao = dec.acao_principal || '';
              return (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.event}</td>
                  <td style={{maxWidth:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={msg}>{String(msg).slice(0,120)}</td>
                  <td>{intent} {acao ? ` / ${acao}`: ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

