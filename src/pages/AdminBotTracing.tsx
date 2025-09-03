import React, { useState } from 'react'

export default function AdminBotTracing(){
  const [peer, setPeer] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [traceId, setTraceId] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(){
    if (!peer) return
    setLoading(true)
    try {
      const headers: any = { }
      const token = (window as any).BOT_TOKEN || ''
      if (token) headers['x-bot-token'] = token
      const res = await fetch(`/api/bot/tracing?peer=${encodeURIComponent(peer)}`, { headers })
      const data = await res.json()
      setItems(data.items||[])
      setTraceId(data.traceId||'')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Bot Tracing (Admin)</h1>
      <div className="flex gap-2 mb-4">
        <input className="border rounded px-2 py-1" placeholder="Telefone/peer" value={peer} onChange={e=>setPeer(e.target.value)} />
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>{loading? 'Carregando...' : 'Carregar'}</button>
      </div>
      {traceId && <div className="text-sm text-gray-500 mb-2">traceId: {traceId}</div>}
      <div className="space-y-2">
        {items.map((m,i)=> (
          <div key={i} className="border rounded p-2 text-sm">
            <div className="font-mono text-xs text-gray-500">{m.created_at} • {m.direction}</div>
            <div>{m.body}</div>
          </div>
        ))}
        {!items.length && <div className="text-sm text-gray-500">Nenhum item.</div>}
      </div>
    </div>
  )
}

