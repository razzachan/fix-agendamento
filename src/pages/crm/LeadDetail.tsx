import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { CrmStatusBadge } from '@/components/crm/CrmStatusBadge';
import { LeadTimeline } from '@/components/crm/LeadTimeline';
import { AddNoteModal } from '@/components/crm/AddNoteModal';
import { UpdateStatusModal } from '@/components/crm/UpdateStatusModal';
import { useLead } from '@/hooks/crm/useLead';
import { useUpdateLeadStatus } from '@/hooks/crm/useLeadMutations';
import { CrmNav } from '@/components/crm/CrmNav';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const q = useLead(id);
  const lead = q.data?.lead;
  const updateStatus = useUpdateLeadStatus();

  if (q.isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!lead) {
    return <div className="text-sm text-muted-foreground">Lead não encontrado.</div>;
  }

  return (
    <div className="space-y-4">
      <CrmNav />
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{lead.clients?.name || 'Cliente'}</div>
          <div className="text-sm text-muted-foreground">{lead.clients?.phone || '—'}</div>
        </div>
        <Button variant="outline" onClick={() => navigate('/crm/leads')}>Voltar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">Nome: <span className="font-medium">{lead.clients?.name || '—'}</span></div>
            <div className="text-sm">Tel: <span className="font-medium">{lead.clients?.phone || '—'}</span></div>
            <div className="text-sm">End: <span className="font-medium">{lead.clients?.address || '—'}</span></div>
            <div className="flex items-center gap-2">
              <div className="text-sm">Score:</div>
              <ScoreBadge score={lead.crm_score ?? 0} />
            </div>

            <div className="pt-2 border-t" />

            <div className="text-sm font-medium">Equipamento</div>
            <div className="text-sm text-muted-foreground">{lead.equipment_type || '—'}</div>
            <div className="text-sm">Problema: <span className="text-muted-foreground">{lead.problem_description || '—'}</span></div>

            <div className="pt-2 border-t" />

            <div className="text-sm font-medium">Status CRM</div>
            <div className="flex items-center gap-2">
              <CrmStatusBadge status={lead.crm_status} />
              <UpdateStatusModal leadId={lead.id} currentStatus={lead.crm_status} />
            </div>

            <div className="pt-2 border-t" />

            <div className="text-sm font-medium">Ações</div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => navigate('/calendar')}>Agendar</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/admin/whatsapp')}>Follow-up</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await updateStatus.mutateAsync({ id: lead.id, crm_status: 'perdido', notes: 'Marcado como perdido' });
                  navigate('/crm/leads');
                }}
                disabled={updateStatus.isPending}
              >
                Marcar perdido
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline / Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LeadTimeline lead={lead} />
            <div className="pt-2 border-t" />
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Notas</div>
              <AddNoteModal leadId={lead.id} />
            </div>
            <div className="space-y-2">
              {(lead.crm_notes || []).slice().reverse().map((n, idx) => (
                <div key={idx} className="p-3 border rounded text-sm whitespace-pre-wrap">{n}</div>
              ))}
              {(lead.crm_notes || []).length === 0 && (
                <div className="text-sm text-muted-foreground">Sem notas.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
