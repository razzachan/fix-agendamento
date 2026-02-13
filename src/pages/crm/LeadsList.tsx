import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { CrmStatusBadge } from '@/components/crm/CrmStatusBadge';
import { UpdateStatusModal } from '@/components/crm/UpdateStatusModal';
import { useLeads } from '@/hooks/crm/useLeads';
import { useUpdateLeadStatus } from '@/hooks/crm/useLeadMutations';
import type { CrmStatus } from '@/types/crm';
import { useNavigate } from 'react-router-dom';
import { useRealtimeCrm } from '@/hooks/crm/useRealtimeCrm';
import { CrmNav } from '@/components/crm/CrmNav';

const SCORE_FILTERS = [
  { label: 'Todos', min: undefined, max: undefined },
  { label: 'Quente', min: 80, max: 100 },
  { label: 'Morno', min: 60, max: 79 },
  { label: 'Frio', min: 40, max: 59 },
  { label: 'Congelado', min: 0, max: 39 },
];

const CRM_STATUSES: Array<{ label: string; value: 'ativo' | 'todos' | CrmStatus }> = [
  { label: 'Ativos', value: 'ativo' },
  { label: 'Todos', value: 'todos' },
  { label: 'Novo Lead', value: 'novo_lead' },
  { label: 'Orçamento Enviado', value: 'orcamento_enviado' },
  { label: 'Aguardando Resposta', value: 'aguardando_resposta' },
  { label: 'Interessado', value: 'interessado' },
  { label: 'Agendamento Pendente', value: 'agendamento_pendente' },
  { label: 'Coleta Agendada', value: 'coleta_agendada' },
  { label: 'Em Diagnóstico', value: 'em_diagnostico' },
  { label: 'Orçamento Detalhado', value: 'orcamento_detalhado' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Em Reparo', value: 'em_reparo' },
  { label: 'Pronto para Entrega', value: 'pronto_entrega' },
  { label: 'Entregue', value: 'entregue' },
  { label: 'Perdido', value: 'perdido' },
  { label: 'Cancelado', value: 'cancelado' },
];

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] || {});
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export default function LeadsList() {
  useRealtimeCrm();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativo' | 'todos' | CrmStatus>('ativo');
  const [scorePreset, setScorePreset] = useState(0);
  const [orderBy, setOrderBy] = useState<'crm_score' | 'created_at' | 'crm_last_interaction'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const scoreMin = SCORE_FILTERS[scorePreset]?.min;
  const scoreMax = SCORE_FILTERS[scorePreset]?.max;

  const crmStatus: CrmStatus | undefined =
    statusFilter === 'ativo' || statusFilter === 'todos'
      ? undefined
      : statusFilter;

  const statusParam: string | undefined =
    statusFilter === 'ativo'
      ? 'ativo'
      : undefined;

  const q = useLeads({
    page,
    limit: 20,
    status: statusParam,
    crm_status: crmStatus,
    score_min: scoreMin,
    score_max: scoreMax,
    order_by: orderBy,
    order,
    search: search.trim() || undefined,
  });

  const markLost = useUpdateLeadStatus();

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / 20), 1);

  const rows = useMemo(() => q.data?.leads || [], [q.data]);

  return (
    <div className="space-y-4">
      <CrmNav />
      <Card>
        <CardHeader>
          <CardTitle>CRM — Leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por nome/telefone" />
            <select
              className="h-10 border rounded px-3 bg-background"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ativo' | 'todos' | CrmStatus);
                setPage(0);
              }}
            >
              {CRM_STATUSES.map((s) => (
                <option key={s.label} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              className="h-10 border rounded px-3 bg-background"
              value={String(scorePreset)}
              onChange={(e) => { setScorePreset(parseInt(e.target.value, 10)); setPage(0); }}
            >
              {SCORE_FILTERS.map((s, idx) => (
                <option key={s.label} value={String(idx)}>{s.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const data = rows.map((l) => ({
                    id: l.id,
                    nome: l.clients?.name || '',
                    telefone: l.clients?.phone || '',
                    equipamento: l.equipment_type || '',
                    status: l.crm_status,
                    score: l.crm_score,
                    ultima_interacao: l.crm_last_interaction,
                    proximo_followup: l.crm_next_followup || '',
                  }));
                  const csv = toCsv(data);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'leads.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={rows.length === 0}
              >
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => { setOrder(order === 'asc' ? 'desc' : 'asc'); }}>
                Ordem: {order}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 text-sm">
            <Button size="sm" variant={orderBy === 'created_at' ? 'default' : 'outline'} onClick={() => setOrderBy('created_at')}>Criado</Button>
            <Button size="sm" variant={orderBy === 'crm_score' ? 'default' : 'outline'} onClick={() => setOrderBy('crm_score')}>Score</Button>
            <Button size="sm" variant={orderBy === 'crm_last_interaction' ? 'default' : 'outline'} onClick={() => setOrderBy('crm_last_interaction')}>Interação</Button>
          </div>

          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Última</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.clients?.name || 'Cliente'}</TableCell>
                    <TableCell>{lead.clients?.phone || '—'}</TableCell>
                    <TableCell>{lead.equipment_type || '—'}</TableCell>
                    <TableCell><CrmStatusBadge status={lead.crm_status} /></TableCell>
                    <TableCell><ScoreBadge score={lead.crm_score ?? 0} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.crm_last_interaction ? new Date(lead.crm_last_interaction).toLocaleString('pt-BR') : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.crm_next_followup ? new Date(lead.crm_next_followup).toLocaleString('pt-BR') : '—'}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/crm/leads/${lead.id}`)}>Detalhes</Button>
                      <UpdateStatusModal leadId={lead.id} currentStatus={lead.crm_status} />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await markLost.mutateAsync({ id: lead.id, crm_status: 'perdido', notes: 'Marcado como perdido' });
                        }}
                        disabled={markLost.isPending}
                      >
                        Perder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {q.isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!q.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} • Total {total}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>Anterior</Button>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
