import React from 'react';
import type { CrmStatus, Lead } from '@/types/crm';
import { CRM_STATUS_LABELS } from '@/types/crm';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableLeadCard } from './SortableLeadCard';
import { useDroppable } from '@dnd-kit/core';

export function KanbanColumn({
  status,
  leads,
  onDetails,
}: {
  status: CrmStatus;
  leads: Lead[];
  onDetails: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <div className="w-80 shrink-0">
      <div className="p-3 border rounded mb-2 font-medium">
        {CRM_STATUS_LABELS[status]}
        <span className="text-xs text-muted-foreground ml-2">({leads.length})</span>
      </div>
      <div ref={setNodeRef} className={isOver ? 'rounded border border-dashed p-2' : 'p-2'}>
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onDetails={() => onDetails(lead.id)} />
          ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
