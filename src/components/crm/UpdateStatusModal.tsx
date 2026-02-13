import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CrmStatus } from '@/types/crm';
import { CRM_STATUS_LABELS } from '@/types/crm';
import { useUpdateLeadStatus } from '@/hooks/crm/useLeadMutations';

const ALL_STATUSES: CrmStatus[] = [
  'novo_lead',
  'orcamento_enviado',
  'aguardando_resposta',
  'interessado',
  'agendamento_pendente',
  'coleta_agendada',
  'em_diagnostico',
  'orcamento_detalhado',
  'aprovado',
  'em_reparo',
  'pronto_entrega',
  'entregue',
  'perdido',
  'cancelado',
];

export function UpdateStatusModal({ leadId, currentStatus }: { leadId: string; currentStatus: CrmStatus }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CrmStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const mutation = useUpdateLeadStatus();

  const options = useMemo(() => ALL_STATUSES, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setStatus(currentStatus); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Atualizar status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar status CRM</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Select value={status} onValueChange={(v) => setStatus(v as CrmStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
                <SelectItem key={s} value={s}>{CRM_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota opcional..." />
        </div>

        <DialogFooter>
          <Button
            onClick={async () => {
              await mutation.mutateAsync({ id: leadId, crm_status: status, notes: notes.trim() || undefined });
              setNotes('');
              setOpen(false);
            }}
            disabled={!status || mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
