import React from 'react';
import type { CrmMetrics } from '@/types/crm';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function FunnelChart({ metrics, height = 260 }: { metrics: CrmMetrics; height?: number }) {
  const data = [
    { stage: 'Novo', value: metrics.novos_leads },
    { stage: 'Orçamento', value: metrics.orcamentos_enviados },
    { stage: 'Aguardando', value: metrics.aguardando_resposta },
    { stage: 'Interessado', value: metrics.interessados },
    { stage: 'Agend.', value: metrics.agendamentos_pendentes },
    { stage: 'Diag.', value: metrics.em_diagnostico },
    { stage: 'Aprov.', value: metrics.aprovados },
    { stage: 'Reparo', value: metrics.em_reparo },
    { stage: 'Entregue', value: metrics.entregues },
  ];

  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="stage" width={90} />
          <Tooltip />
          <Bar dataKey="value" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
