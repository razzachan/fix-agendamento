import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

// Schema para validação do formulário de diagnóstico
const diagnosisSchema = z.object({
  diagnosisDetails: z.string().min(10, {
    message: 'O diagnóstico deve ter pelo menos 10 caracteres',
  }),
  recommendedService: z.string().min(5, {
    message: 'O serviço recomendado deve ter pelo menos 5 caracteres',
  }),
  estimatedCost: z.string().refine(
    (val) => !isNaN(Number(val.replace(',', '.'))),
    {
      message: 'O custo estimado deve ser um número válido',
    }
  ),
  estimatedCompletionDate: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    },
    {
      message: 'A data estimada deve ser uma data futura válida',
    }
  ),
  partsPurchaseLink: z.string().url({
    message: 'O link deve ser uma URL válida',
  }).optional().or(z.literal('')),
});

type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;

interface DiagnosisFormProps {
  serviceOrder: ServiceOrder;
  onSubmit: (diagnosisData: any) => Promise<boolean>;
}

const DiagnosisForm: React.FC<DiagnosisFormProps> = ({ serviceOrder, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar o formulário com valores padrão
  const form = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosisDetails: serviceOrder.diagnosis?.diagnosisDetails || '',
      recommendedService: serviceOrder.diagnosis?.recommendedService || '',
      estimatedCost: serviceOrder.diagnosis?.estimatedCost?.toString() || '',
      estimatedCompletionDate: serviceOrder.diagnosis?.estimatedCompletionDate || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias a partir de hoje
      partsPurchaseLink: serviceOrder.diagnosis?.partsPurchaseLink || '',
    },
  });

  const handleSubmit = async (values: DiagnosisFormValues) => {
    setIsSubmitting(true);
    try {
      // Converter o custo estimado para número
      const estimatedCost = parseFloat(values.estimatedCost.replace(',', '.'));
      
      // Preparar os dados para envio
      const diagnosisData = {
        serviceOrderId: serviceOrder.id,
        diagnosisDetails: values.diagnosisDetails,
        recommendedService: values.recommendedService,
        estimatedCost,
        estimatedCompletionDate: values.estimatedCompletionDate,
        partsPurchaseLink: values.partsPurchaseLink || null,
      };
      
      // Enviar os dados
      const success = await onSubmit(diagnosisData);
      
      if (success) {
        toast.success('Diagnóstico salvo com sucesso!');
      } else {
        toast.error('Erro ao salvar diagnóstico.');
      }
    } catch (error) {
      console.error('Erro ao enviar diagnóstico:', error);
      toast.error('Erro ao processar diagnóstico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico do Equipamento</CardTitle>
        <CardDescription>
          Preencha os detalhes do diagnóstico para o equipamento {serviceOrder.equipmentType} {serviceOrder.equipmentModel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="diagnosisDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes do Diagnóstico</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o diagnóstico realizado e os problemas encontrados"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Inclua todos os detalhes técnicos relevantes sobre o estado do equipamento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recommendedService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço Recomendado</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o serviço recomendado para resolver o problema"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Estimado (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimatedCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Estimada de Conclusão</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="partsPurchaseLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link para Compra de Peças (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Se necessário, forneça um link para compra das peças necessárias.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Diagnóstico'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DiagnosisForm;
