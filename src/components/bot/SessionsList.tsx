import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionRow {
  id: string;
  channel: string;
  peer_id: string;
  state: any;
  updated_at: string;
}

export default function SessionsList(){
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [onlyPaused, setOnlyPaused] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_sessions')
        .select('id, channel, peer_id, state, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('[SessionsList] load error', e);
    } finally {
      setLoading(false);
    }
  };

  const setPaused = async (id: string, paused: boolean) => {
    try {
      const row = items.find(i => i.id === id);
      if (!row) return;
      const newState = { ...(row.state || {}), paused };
      const { error } = await supabase
        .from('bot_sessions')
        .update({ state: newState })
        .eq('id', id);
      if (error) throw error;
      toast.success(paused ? 'Conversa pausada' : 'Conversa despausada');
      await load();
    } catch (e) {
      console.error('[SessionsList] setPaused error', e);
      toast.error('Falha ao atualizar status da conversa');
    }
  };

  useEffect(() => { load(); }, []);

  const pausedCount = items.filter(it => !!it?.state?.paused).length;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conversas (últimas 50)</CardTitle>
          <Badge variant={pausedCount > 0 ? 'destructive' : 'secondary'}>{pausedCount} pausadas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Input placeholder="Buscar por contato (peer id)" value={filter} onChange={e=>setFilter(e.target.value)} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button variant="outline" size="sm" onClick={async()=>{ if (!confirm('Despausar todas as conversas listadas?')) return; const ids = items.map(i=>i.id); for (const id of ids){ await setPaused(id, false);} }}>
            Despausar todas
          </Button>
        </div>
        <div className="space-y-2">
          {items
            .filter(it => !filter || it.peer_id?.toLowerCase().includes(filter.toLowerCase()))
            .filter(it => !onlyPaused || !!it?.state?.paused)
            .map(it => {
              const paused = !!it?.state?.paused;
              return (
                <div key={it.id} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{it.peer_id}</div>
                    <div className="text-xs text-muted-foreground">{it.channel} • {new Date(it.updated_at).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={paused ? 'destructive' : 'secondary'}>
                      {paused ? 'Pausado' : 'Ativo'}
                    </Badge>
                    {paused ? (
                      <Button variant="outline" size="sm" onClick={() => setPaused(it.id, false)} title="Despausar conversa">▶ Despausar</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setPaused(it.id, true)} title="Pausar conversa">⏸ Pausar</Button>
                    )}
                  </div>
                </div>
              );
            })}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma conversa recente.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
