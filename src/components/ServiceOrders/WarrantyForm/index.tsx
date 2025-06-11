import React, { useState, useEffect } from 'react';
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
import { warrantyService } from '@/services/api';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Shield, Info, CalendarDays } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

// Schema para validação do formulário de garantia
const warrantySchema = z.object({
  warrantyEnabled: z.boolean(),
  warrantyPeriod: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: 'O período de garantia deve ser um número válido maior que zero',
    }
  ).optional().nullable(),
  warrantyStartDate: z.string().optional().nullable(),
  warrantyTerms: z.string().optional().nullable(),
});

type WarrantyFormValues = z.infer<typeof warrantySchema>;

interface WarrantyFormProps {
  serviceOrder: ServiceOrder;
  onSubmit: (warrantyData: any) => Promise<boolean>;
  readOnly?: boolean;
}

/**
 * Componente para configuração de garantia
 * Segue o princípio de Responsabilidade Única (SRP) do SOLID
 */
const WarrantyForm: React.FC<WarrantyFormProps> = ({ serviceOrder, onSubmit, readOnly = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Verificar se a garantia está habilitada
  const hasWarranty = Boolean(
    serviceOrder.warrantyPeriod &&
    serviceOrder.warrantyStartDate &&
    serviceOrder.warrantyEndDate
  );

  // Obter termos de garantia padrão com base no tipo de atendimento
  const defaultWarrantyTerms = warrantyService.getDefaultWarrantyTerms(
    serviceOrder.serviceAttendanceType || 'em_domicilio'
  );

  // Inicializar o formulário com valores padrão
  const form = useForm<WarrantyFormValues>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      warrantyEnabled: hasWarranty,
      warrantyPeriod: serviceOrder.warrantyPeriod?.toString() || '3',
      warrantyStartDate: serviceOrder.warrantyStartDate ||
        format(new Date(), 'yyyy-MM-dd'),
      warrantyTerms: serviceOrder.warrantyTerms || defaultWarrantyTerms,
    },
  });

  // Calcular a data de término da garantia quando o período ou a data de início mudar
  useEffect(() => {
    const startDateValue = form.watch('warrantyStartDate');
    const periodValue = form.watch('warrantyPeriod');
    const enabled = form.watch('warrantyEnabled');

    if (enabled && startDateValue && periodValue) {
      try {
        const startDate = new Date(startDateValue);
        const period = parseInt(periodValue);
        if (!isNaN(period) && period > 0) {
          const calculatedEndDate = addMonths(startDate, period);
          setEndDate(format(calculatedEndDate, 'dd/MM/yyyy', { locale: ptBR }));
        } else {
          setEndDate(null);
        }
      } catch (error) {
        setEndDate(null);
      }
    } else {
      setEndDate(null);
    }
  }, [form.watch('warrantyStartDate'), form.watch('warrantyPeriod'), form.watch('warrantyEnabled')]);

  // Atualizar os termos de garantia quando o tipo de atendimento mudar
  useEffect(() => {
    // Só atualizar se os termos não tiverem sido personalizados
    if (!serviceOrder.warrantyTerms && !form.getValues('warrantyTerms')) {
      const defaultTerms = warrantyService.getDefaultWarrantyTerms(
        serviceOrder.serviceAttendanceType || 'em_domicilio'
      );
      form.setValue('warrantyTerms', defaultTerms);
    }
  }, [serviceOrder.serviceAttendanceType, form]);

  const handleSubmit = async (values: WarrantyFormValues) => {
    if (readOnly) return;

    setIsSubmitting(true);
    try {
      // Se a garantia não estiver habilitada, enviar valores nulos
      if (!values.warrantyEnabled) {
        const warrantyData = {
          serviceOrderId: serviceOrder.id,
          warrantyPeriod: null,
          warrantyStartDate: null,
          warrantyEndDate: null,
          warrantyTerms: null,
        };

        const success = await onSubmit(warrantyData);

        if (success) {
          toast.success('Garantia desabilitada com sucesso!');
        } else {
          toast.error('Erro ao desabilitar garantia.');
        }

        return;
      }

      // Converter o período para número
      const warrantyPeriod = parseInt(values.warrantyPeriod || '0');

      // Calcular a data de término
      const startDate = new Date(values.warrantyStartDate || '');
      const endDate = warrantyService.calculateWarrantyEndDate(startDate, warrantyPeriod);

      // Preparar os dados para envio
      const warrantyData = {
        serviceOrderId: serviceOrder.id,
        warrantyPeriod,
        warrantyStartDate: values.warrantyStartDate,
        warrantyEndDate: format(endDate, 'yyyy-MM-dd'),
        warrantyTerms: values.warrantyTerms,
      };

      // Enviar os dados
      const success = await onSubmit(warrantyData);

      if (success) {
        toast.success('Garantia configurada com sucesso!');
      } else {
        toast.error('Erro ao configurar garantia.');
      }
    } catch (error) {
      console.error('Erro ao processar garantia:', error);
      toast.error('Erro ao processar garantia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obter informações específicas por tipo de atendimento
  const getAttendanceTypeInfo = () => {
    const type = serviceOrder.serviceAttendanceType || 'em_domicilio';

    switch (type) {
      case 'em_domicilio':
        return {
          title: 'Garantia para Atendimento em Domicílio',
          description: 'A garantia cobre peças e serviços realizados no local',
          icon: <Shield className="h-5 w-5 text-blue-500" />,
          color: 'blue'
        };
      case 'coleta_conserto':
        return {
          title: 'Garantia para Coleta e Conserto',
          description: 'A garantia cobre peças e serviços realizados em oficina',
          icon: <Shield className="h-5 w-5 text-green-500" />,
          color: 'green'
        };
      case 'coleta_diagnostico':
        return {
          title: 'Garantia para Diagnóstico e Reparo',
          description: 'A garantia é aplicada após aprovação do diagnóstico',
          icon: <Shield className="h-5 w-5 text-purple-500" />,
          color: 'purple'
        };
      default:
        return {
          title: 'Configuração de Garantia',
          description: 'Configure o período de garantia para esta ordem de serviço',
          icon: <Shield className="h-5 w-5 text-gray-500" />,
          color: 'gray'
        };
    }
  };

  const attendanceInfo = getAttendanceTypeInfo();

  return (
    <Card className="w-full">
      <CardHeader className={`border-b border-${attendanceInfo.color}-100`}>
        <div className="flex items-center">
          {attendanceInfo.icon}
          <CardTitle className="ml-2">{attendanceInfo.title}</CardTitle>
        </div>
        <CardDescription>
          {attendanceInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="warrantyEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Habilitar Garantia</FormLabel>
                    <FormDescription>
                      Ative para configurar garantia para este serviço
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={readOnly}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('warrantyEnabled') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="warrantyPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          Período de Garantia (meses)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-[200px] text-sm">
                                  Período padrão é de 3 meses. Você pode ajustar conforme a política da empresa.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="3"
                            {...field}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warrantyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          Data de Início da Garantia
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-[200px] text-sm">
                                  A garantia será ativada automaticamente quando o serviço for concluído.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {endDate && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800 flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <strong>Data de Término da Garantia:</strong> {endDate}
                    </p>
                  </div>
                )}

                {/* Informações específicas por tipo de atendimento */}
                {serviceOrder.serviceAttendanceType === 'coleta_diagnostico' && (
                  <div className="bg-purple-50 p-3 rounded-md border border-purple-200 mb-4">
                    <p className="text-sm text-purple-800">
                      <strong>Nota:</strong> Para coleta e diagnóstico, a garantia só será ativada após a aprovação do orçamento e conclusão do serviço.
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="warrantyTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Termos da Garantia
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[200px] text-sm">
                                Os termos padrão são definidos com base no tipo de atendimento.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva os termos e condições da garantia"
                          className="min-h-[100px]"
                          {...field}
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        Especifique o que está coberto pela garantia e quaisquer condições especiais.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {!readOnly && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Configuração de Garantia'}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default WarrantyForm;
