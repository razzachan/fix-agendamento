import React from 'react';
import type { Lead } from '@/types/crm';

export function LeadTimeline({ lead }: { lead: Lead }) {
  const items: Array<{ label: string; date?: string | null }> = [
    { label: 'Lead criado', date: lead.created_at },
    { label: 'Última interação', date: lead.crm_last_interaction },
    { label: 'Próximo follow-up', date: lead.crm_next_followup },
  ];

  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="p-3 border rounded">
          <div className="text-sm font-medium">● {i.label}</div>
          <div className="text-xs text-muted-foreground">{i.date ? new Date(i.date).toLocaleString('pt-BR') : '—'}</div>
        </div>
      ))}
    </div>
  );
}
