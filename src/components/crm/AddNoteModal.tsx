import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddLeadNote } from '@/hooks/crm/useLeadMutations';

export function AddNoteModal({ leadId, triggerLabel = '+ Adicionar nota' }: { leadId: string; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const add = useAddLeadNote();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar nota</DialogTitle>
        </DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Digite a nota..." />
        <DialogFooter>
          <Button
            onClick={async () => {
              await add.mutateAsync({ id: leadId, note, author: 'admin' });
              setNote('');
              setOpen(false);
            }}
            disabled={!note.trim() || add.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
