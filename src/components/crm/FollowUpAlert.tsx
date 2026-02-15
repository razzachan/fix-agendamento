import React from 'react';
import type { Lead } from '@/types/crm';

export function FollowUpAlert({ lead }: { lead: Lead }) {
  if (!lead.crm_next_followup) return null;
  const due = new Date(lead.crm_next_followup);
  const overdue = due.getTime() <= Date.now();
  if (!overdue) return null;

  return (
    <div className="p-3 border rounded">
      <div className="text-sm font-medium">⚠️ Follow-up vencido</div>
      <div className="text-xs text-muted-foreground">
        {(lead.clients?.name || 'Cliente')} • {due.toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
