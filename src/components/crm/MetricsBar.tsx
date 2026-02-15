import React from 'react';
import type { CrmMetrics } from '@/types/crm';

export function MetricsBar({ metrics }: { metrics: CrmMetrics }) {
  const kpis = [
    { label: 'Leads', value: metrics.novos_leads },
    { label: 'Agendados', value: metrics.agendamentos_pendentes },
    { label: 'Aprovados', value: metrics.aprovados },
    { label: 'Entregues', value: metrics.entregues },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="p-3 border rounded">
          <div className="text-xs text-muted-foreground">{k.label}</div>
          <div className="text-2xl font-semibold">{k.value ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
