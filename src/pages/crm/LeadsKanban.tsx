import React, { useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CrmStatus, Lead } from '@/types/crm';
import { useLeads } from '@/hooks/crm/useLeads';
import { useUpdateLeadStatus } from '@/hooks/crm/useLeadMutations';
import { useNavigate } from 'react-router-dom';
import { KanbanColumn } from '@/components/crm/KanbanColumn';
import { useRealtimeCrm } from '@/hooks/crm/useRealtimeCrm';
import { CrmNav } from '@/components/crm/CrmNav';

const COLUMNS: CrmStatus[] = [
  'novo_lead',
  'orcamento_enviado',
  'aguardando_resposta',
  'interessado',
  'agendamento_pendente',
  'em_diagnostico',
  'orcamento_detalhado',
  'aprovado',
  'em_reparo',
  'entregue',
];

export default function LeadsKanban() {
  useRealtimeCrm();
  const navigate = useNavigate();
  const q = useLeads({ limit: 200, page: 0, order_by: 'crm_score', order: 'desc' });
  const update = useUpdateLeadStatus();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    for (const s of COLUMNS) m[s] = [];
    for (const lead of q.data?.leads || []) {
      if (COLUMNS.includes(lead.crm_status)) m[lead.crm_status].push(lead);
    }
    return m;
  }, [q.data]);

  const leadToStatus = useMemo(() => {
    const map = new Map<string, CrmStatus>();
    for (const s of COLUMNS) {
      for (const l of byStatus[s] || []) map.set(l.id, s);
    }
    return map;
  }, [byStatus]);

  const onDragEnd = async (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const fromStatus = leadToStatus.get(activeId);
    const toStatus = overId.startsWith('column:')
      ? (overId.replace('column:', '') as CrmStatus)
      : leadToStatus.get(overId);

    if (!fromStatus || !toStatus) return;
    if (fromStatus === toStatus) return;

    await update.mutateAsync({ id: activeId, crm_status: toStatus });
  };

  return (
    <div className="space-y-4">
      <CrmNav />
      <Card>
        <CardHeader>
          <CardTitle>CRM — Kanban</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {COLUMNS.map((s) => (
                <KanbanColumn
                  key={s}
                  status={s}
                  leads={byStatus[s] || []}
                  onDetails={(id) => navigate(`/crm/leads/${id}`)}
                />
              ))}
            </div>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
