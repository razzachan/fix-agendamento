import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  status: z.string({
    required_error: 'Por favor selecione um status',
  }),
  notes: z.string().min(3, {
    message: 'As observações devem ter pelo menos 3 caracteres',
  }),
});

interface AddProgressEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: string, notes: string) => Promise<boolean>;
  currentStatus: string;
}

export function AddProgressEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  currentStatus,
}: AddProgressEntryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: currentStatus,
      notes: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(values.status, values.notes);
      if (success) {
        toast({
          title: 'Progresso atualizado',
          description: 'A entrada foi adicionada com sucesso.',
          variant: 'default',
        });
        form.reset();
        onOpenChange(false);
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar a entrada de progresso.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao adicionar a entrada de progresso.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Progresso</DialogTitle>
          <DialogDescription>
            Adicione uma nova entrada ao histórico de progresso desta ordem de serviço.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="scheduled_collection">Coleta Agendada</SelectItem>
                      <SelectItem value="on_the_way">A Caminho</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="collected">Coletado</SelectItem>
                      <SelectItem value="collected_for_diagnosis">Coletado para Diagnóstico</SelectItem>
                      <SelectItem value="at_workshop">Na Oficina</SelectItem>
                      <SelectItem value="received_at_workshop">Recebido na Oficina</SelectItem>
                      <SelectItem value="diagnosis_completed">Diagnóstico Concluído</SelectItem>
                      <SelectItem value="awaiting_quote_approval">Aguardando Aprovação do Orçamento</SelectItem>
                      <SelectItem value="quote_approved">Orçamento Aprovado</SelectItem>
                      <SelectItem value="quote_rejected">Orçamento Rejeitado</SelectItem>
                      <SelectItem value="ready_for_delivery">Pronto para Entrega</SelectItem>
                      <SelectItem value="delivery_scheduled">Entrega Agendada</SelectItem>
                      <SelectItem value="collected_for_delivery">Coletado para Entrega</SelectItem>
                      <SelectItem value="on_the_way_to_deliver">Em Rota de Entrega</SelectItem>
                      <SelectItem value="payment_pending">Aguardando Pagamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que foi feito ou observações sobre esta atualização"
                      className="resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
