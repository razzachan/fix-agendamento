import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface SlotItem { start: string; end: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean)=>void;
  date: string; // YYYY-MM-DD
  slots: SlotItem[];
  onBooked?: ()=>void;
}

export function BotTestBookingDialog({ open, onOpenChange, date, slots, onBooked }: Props){
  const [clientName, setClientName] = useState('Studio (TESTE)');
  const [address, setAddress] = useState('Studio');
  const [description, setDescription] = useState('Reserva de teste');
  const [equipment, setEquipment] = useState('fogao');
  const [slotIdx, setSlotIdx] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const hasSlots = (slots?.length||0) > 0;
  const selected = useMemo(()=> hasSlots ? slots[Math.min(slotIdx, slots.length-1)] : null, [slotIdx, slots, hasSlots]);

  async function submit(){
    if (!selected) { toast.error('Selecione um horário'); return; }
    setSubmitting(true);
    try{
      const base = (window as any).__API_URL__ || '';
      const headers: any = { 'Content-Type': 'application/json' };
      const t = (window as any).BOT_TOKEN; if (t) headers['x-bot-token'] = t;
      const body = {
        client_name: clientName || 'Studio (TESTE)',
        start_time: `${date}T${selected.start}:00`,
        end_time: `${date}T${selected.end}:00`,
        address,
        description,
        equipment_type: equipment,
      };
      const resp = await fetch(`${base}/api/bot/tools/createAppointment`, { method:'POST', headers, body: JSON.stringify(body) });
      const json = await resp.json().catch(()=>null);
      if (!resp.ok || !json?.ok) { toast.error(json?.message || 'Falha ao criar agendamento'); return; }
      if (json?.conflicts?.suggestions?.length) {
        toast.message('Sugestões de logística', { description: json.conflicts.suggestions.join(' • ') });
      } else {
        toast.success('Agendamento de teste criado');
      }
      onOpenChange(false);
      onBooked?.();
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar (teste)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente</Label>
            <Input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Endereço" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Problema ou observações" />
          </div>
          <div>
            <Label>Equipamento</Label>
            <Input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="ex.: fogao, geladeira, lava roupa" />
          </div>
          <div>
            <Label>Horário</Label>
            {hasSlots ? (
              <select className="border rounded p-2 w-full" value={slotIdx} onChange={e=>setSlotIdx(parseInt(e.target.value,10))}>
                {slots.map((s, i)=> <option key={i} value={i}>{s.start} - {s.end}</option>)}
              </select>
            ) : (
              <div className="text-xs text-muted-foreground">Sem horários disponíveis nesta data</div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting || !hasSlots}>{submitting?'Enviando...':'Agendar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BotTestBookingDialog;

