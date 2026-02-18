import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsBar } from '@/components/crm/MetricsBar';
import { LeadCard } from '@/components/crm/LeadCard';
import { FunnelChart } from '@/components/crm/FunnelChart';
import { FollowUpAlert } from '@/components/crm/FollowUpAlert';
import { useCrmMetrics } from '@/hooks/crm/useCrmMetrics';
import { useLeads } from '@/hooks/crm/useLeads';
import { useAppointments } from '@/hooks/crm/useAppointments';
import { useRealtimeCrm } from '@/hooks/crm/useRealtimeCrm';
import { useNavigate } from 'react-router-dom';
import { CrmNav } from '@/components/crm/CrmNav';

export default function CRMDashboard() {
  useRealtimeCrm();
  const navigate = useNavigate();

  const metricsQ = useCrmMetrics(30);
  const hotQ = useLeads({ score_min: 80, limit: 10, page: 0, order_by: 'crm_score', order: 'desc' });

  const overdueQ = useLeads({
    crm_status: 'aguardando_resposta',
    limit: 50,
    page: 0,
    order_by: 'crm_next_followup',
    order: 'asc',
  });

  const today = new Date().toISOString().slice(0, 10);
  const apptQ = useAppointments({ date_from: today, date_to: today, limit: 10 });

  const overdue = useMemo(() => {
    const leads = overdueQ.data?.leads || [];
    return leads.filter((l) => l.crm_next_followup && new Date(l.crm_next_followup).getTime() <= Date.now());
  }, [overdueQ.data]);

  const metrics = metricsQ.data?.metrics;

  return (
    <div className="space-y-4">
      <CrmNav />
      <Card>
        <CardHeader>
          <CardTitle>CRM — Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics ? <MetricsBar metrics={metrics} /> : <div className="text-sm text-muted-foreground">Carregando métricas...</div>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>🔥 Leads quentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(hotQ.data?.leads || []).map((lead) => (
              <LeadCard key={lead.id} lead={lead} onDetails={() => navigate(`/crm/leads/${lead.id}`)} />
            ))}
            {hotQ.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!hotQ.isLoading && (hotQ.data?.leads || []).length === 0 && (
              <div className="text-sm text-muted-foreground">Sem leads quentes no momento.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⚠️ Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.slice(0, 5).map((lead) => (
              <FollowUpAlert key={lead.id} lead={lead} />
            ))}
            {overdueQ.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!overdueQ.isLoading && overdue.length === 0 && (
              <div className="text-sm text-muted-foreground">Sem follow-ups vencidos.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>📊 Mini funil</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? <FunnelChart metrics={metrics} height={320} /> : <div className="text-sm text-muted-foreground">Carregando...</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📅 Agenda hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(apptQ.data?.appointments || []).map((a) => (
              <div key={a.id} className="p-3 border rounded">
                <div className="text-sm font-medium">
                  {new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {a.client_name}
                </div>
                <div className="text-xs text-muted-foreground">{a.equipment_type || '—'} • {a.status}</div>
              </div>
            ))}
            {apptQ.isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!apptQ.isLoading && (apptQ.data?.appointments || []).length === 0 && (
              <div className="text-sm text-muted-foreground">Sem agendamentos hoje.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
