import React from 'react';
import { DiagnosisAwaitingQuote } from './DiagnosisAwaitingQuote';
import { PendingQuotesList } from './PendingQuotesList';

export function AdminQuoteDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Orçamentos</h2>
          <p className="text-muted-foreground">
            Gerencie diagnósticos, crie orçamentos e aprove solicitações dos clientes
          </p>
        </div>
      </div>

      {/* Diagnósticos aguardando orçamento */}
      <DiagnosisAwaitingQuote />

      {/* Orçamentos pendentes de aprovação */}
      <PendingQuotesList />
    </div>
  );
}
