import React from 'react';
import type { Lead } from '@/types/crm';
import { ScoreBadge } from './ScoreBadge';
import { Button } from '@/components/ui/button';

export function LeadCard({ lead, onDetails }: { lead: Lead; onDetails?: () => void }) {
  const name = lead.clients?.name || 'Cliente';
  const equipment = lead.equipment_type || '—';
  const problem = lead.problem_description || '—';

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{name}</div>
        <ScoreBadge score={lead.crm_score ?? 0} />
      </div>
      <div className="text-sm text-muted-foreground">{equipment}</div>
      <div className="text-sm line-clamp-2">{problem}</div>
      {onDetails && (
        <Button size="sm" variant="outline" onClick={onDetails}>
          ▶ Detalhes
        </Button>
      )}
    </div>
  );
}
