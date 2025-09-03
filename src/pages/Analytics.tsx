import React, { useEffect, useState } from 'react';

export default function Analytics(){
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(()=>{ load(); }, []);

  async function load(){
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/analytics/pricing-divergences?days=${days}`);
      const json = await res.json();
      setRows(json?.data||[]);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Relatório de Divergências de Preço</h1>
      <div className="flex items-center gap-2">
        <label>Dias</label>
        <input className="border rounded p-1 w-24" type="number" value={days} onChange={e=> setDays(parseInt(e.target.value||'30')||30)} />
        <button className="border rounded px-3 py-1" onClick={load} disabled={loading}>{loading?'Carregando...':'Atualizar'}</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[600px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Perfil</th>
              <th className="border p-2 text-right">Qtd</th>
              <th className="border p-2 text-right">Média Diferença</th>
              <th className="border p-2 text-right">Mostrado (média)</th>
              <th className="border p-2 text-right">Final (média)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=> (
              <tr key={i}>
                <td className="border p-2">{r.profile||'—'}</td>
                <td className="border p-2 text-right">{r.count}</td>
                <td className="border p-2 text-right">R$ {Number(r.avg_diff||0).toFixed(2)}</td>
                <td className="border p-2 text-right">R$ {Number(r.avg_shown||0).toFixed(2)}</td>
                <td className="border p-2 text-right">R$ {Number(r.avg_final||0).toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="border p-2 text-center" colSpan={5}>Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

