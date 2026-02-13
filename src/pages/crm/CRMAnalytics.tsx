import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useLeads } from '@/hooks/crm/useLeads';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { CrmNav } from '@/components/crm/CrmNav';

export default function CRMAnalytics() {
  const metricsQ = useCrmMetrics(30);
  const metrics = metricsQ.data?.metrics;

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  const leadsQ = useLeads({ created_from: from, limit: 200, page: 0, order_by: 'created_at', order: 'asc' });

  const scoreData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Quente', value: metrics.leads_quentes, color: 'hsl(var(--destructive))' },
      { name: 'Morno', value: metrics.leads_mornos, color: 'hsl(var(--primary))' },
      { name: 'Frio', value: metrics.leads_frios, color: 'hsl(var(--muted-foreground))' },
      { name: 'Congelado', value: metrics.leads_congelados, color: 'hsl(var(--ring))' },
    ];
  }, [metrics]);

  const perDay = useMemo(() => {
    const rows = leadsQ.data?.leads || [];
    const map = new Map<string, number>();
    for (const l of rows) {
      const d = (l.created_at || '').slice(0, 10);
      if (!d) continue;
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [leadsQ.data]);

  const conversion = useMemo(() => {
    if (!metrics) return 0;
    const base = metrics.novos_leads || 0;
    if (base <= 0) return 0;
    return Math.min(100, Math.round((metrics.entregues / base) * 100));
  }, [metrics]);

  return (
    <div className="space-y-4">
      <CrmNav />
      <Card>
        <CardHeader>
          <CardTitle>CRM — Analytics (30 dias)</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Funil de conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? <FunnelChart metrics={metrics} height={320} /> : <div className="text-sm text-muted-foreground">Carregando...</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de score</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={scoreData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {scoreData.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Leads por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={perDay}>
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="currentColor" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {leadsQ.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de conversão (lead → entregue)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{conversion}%</div>
            <Progress value={conversion} />
            <div className="text-xs text-muted-foreground">Base: novos leads no período</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motivos de perda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Sem dados estruturados de motivo de perda (não há campo/endpoint no schema atual). Quando houver tag/campo específico, este gráfico passa a ser preenchido.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
