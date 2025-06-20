import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, MapPin, Calendar, User, Check, AlertCircle, Clock, Package, Merge, Split } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendamentoAI } from '@/services/agendamentos';
import { Client } from '@/types';
import { clientService } from '@/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';

interface CreateServiceOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    agendamentoId: string,
    scheduledDate: string | null,
    scheduledTime: string | null,
    existingClientId?: string,
    multipleEquipmentData?: {
      hasMultipleEquipments: boolean;
      creationMode: 'single' | 'multiple';
      suggestedGroups: Array<{
        equipments: string[];
        problems: string[];
        attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
        reasoning: string;
      }>;
    }
  ) => void;
  agendamento: AgendamentoAI | null;
}

// Schema de validação para o formulário
const formSchema = z.object({
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
});

const CreateServiceOrderDialog: React.FC<CreateServiceOrderDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agendamento,
}) => {
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [useExistingClient, setUseExistingClient] = useState(true);

  // Estados para múltiplos equipamentos
  const [hasMultipleEquipments, setHasMultipleEquipments] = useState(false);
  const [creationMode, setCreationMode] = useState<'single' | 'multiple'>('single');
  const [suggestedGroups, setSuggestedGroups] = useState<Array<{
    equipments: string[];
    problems: string[];
    attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    reasoning: string;
  }>>([]);

  // Inicializar o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheduledDate: agendamento?.data_agendada
        ? format(new Date(agendamento.data_agendada), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: agendamento?.data_agendada
        ? format(new Date(agendamento.data_agendada), 'HH:mm')
        : format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), 'HH:mm'),
    },
  });

  // Atualizar valores padrão quando o agendamento mudar
  useEffect(() => {
    if (agendamento && isOpen) {
      form.reset({
        scheduledDate: agendamento.data_agendada
          ? format(new Date(agendamento.data_agendada), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        scheduledTime: agendamento.data_agendada
          ? format(new Date(agendamento.data_agendada), 'HH:mm')
          : format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), 'HH:mm'),
      });
    }
  }, [agendamento, isOpen, form]);

  useEffect(() => {
    // Buscar cliente existente e verificar múltiplos equipamentos quando o diálogo for aberto
    const initializeDialog = async () => {
      if (!agendamento || !isOpen) return;

      // Verificar múltiplos equipamentos
      const hasMultiple = orderLifecycleService.hasMultipleEquipments(agendamento);
      setHasMultipleEquipments(hasMultiple);

      if (hasMultiple) {
        // Obter sugestões de agrupamento
        const groups = orderLifecycleService.suggestEquipmentGrouping(agendamento);
        setSuggestedGroups(groups);

        // Definir modo padrão baseado nas sugestões
        setCreationMode(groups.length > 1 ? 'multiple' : 'single');
      }

      setIsSearchingClient(true);
      try {
        // Buscar cliente por telefone, email ou CPF
        const client = await clientService.findByContact(
          agendamento.telefone,
          agendamento.email,
          agendamento.cpf
        );

        setExistingClient(client);
        setUseExistingClient(!!client); // Se encontrou cliente, usar por padrão
      } catch (error) {
        console.error('Erro ao buscar cliente existente:', error);
      } finally {
        setIsSearchingClient(false);
      }
    };

    initializeDialog();
  }, [agendamento, isOpen]);

  if (!agendamento) return null;

  // Formatar a data agendada (se existir)
  const formattedScheduledDate = agendamento.data_agendada
    ? format(new Date(agendamento.data_agendada), 'dd/MM/yyyy HH:mm')
    : 'Não definida';

  // Função para confirmar a criação da ordem de serviço
  const handleConfirm = (values: z.infer<typeof formSchema>) => {
    // Para múltiplos equipamentos, incluir informações sobre o modo de criação
    if (hasMultipleEquipments) {
      // Adicionar informações sobre múltiplos equipamentos no callback
      onConfirm(
        agendamento.id,
        values.scheduledDate,
        values.scheduledTime,
        useExistingClient ? existingClient?.id : undefined,
        {
          hasMultipleEquipments: true,
          creationMode,
          suggestedGroups
        }
      );
    } else {
      // Comportamento original para equipamento único
      onConfirm(
        agendamento.id,
        values.scheduledDate,
        values.scheduledTime,
        useExistingClient ? existingClient?.id : undefined
      );
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {hasMultipleEquipments ? (
                  <Package className="h-5 w-5 text-[#e5b034]" />
                ) : (
                  <FileText className="h-5 w-5 text-green-600" />
                )}
                {hasMultipleEquipments ? 'Múltiplos Equipamentos Detectados' : 'Criar Ordem de Serviço'}
              </AlertDialogTitle>
              <AlertDialogDescription className="pb-2">
                {hasMultipleEquipments ? (
                  <>
                    Este pré-agendamento possui múltiplos equipamentos.
                    Escolha como deseja criar as ordens de serviço.
                  </>
                ) : (
                  'Você está prestes a criar uma ordem de serviço para este agendamento. Por favor, defina a data e hora para o atendimento.'
                )}
              </AlertDialogDescription>

              {/* Seção de múltiplos equipamentos */}
              {hasMultipleEquipments && (
                <div className="space-y-4 my-4">
                  <div className="text-sm font-medium text-gray-700">
                    Como deseja criar as ordens de serviço?
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Opção: OS Única */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        creationMode === 'single'
                          ? 'border-[#e5b034] bg-[#e5b034]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCreationMode('single')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Merge className="h-5 w-5 text-blue-600" />
                          <h5 className="font-medium">OS Única</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Criar uma única ordem de serviço com todos os equipamentos
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">1 OS</Badge>
                          <Badge variant="outline">Mesmo técnico</Badge>
                          <Badge variant="outline">Mesmo tipo</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Opção: Múltiplas OS */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        creationMode === 'multiple'
                          ? 'border-[#e5b034] bg-[#e5b034]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCreationMode('multiple')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Split className="h-5 w-5 text-green-600" />
                          <h5 className="font-medium">Múltiplas OS</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Criar uma OS para cada equipamento com tipos específicos
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{suggestedGroups.length} OS</Badge>
                          <Badge variant="outline">Tipos específicos</Badge>
                          <Badge variant="outline">Flexível</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Preview dos agrupamentos sugeridos */}
                  {creationMode === 'multiple' && suggestedGroups.length > 0 && (
                    <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">
                        Agrupamentos Sugeridos:
                      </h6>
                      <div className="space-y-2">
                        {suggestedGroups.map((group, index) => (
                          <div key={index} className="text-xs text-gray-600 p-2 bg-white rounded border">
                            <div className="font-medium">OS #{index + 1} - {group.attendanceType}</div>
                            <div>Equipamentos: {group.equipments.join(', ')}</div>
                            <div className="text-gray-500">{group.reasoning}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Campos de data e hora */}
              <div className="grid grid-cols-2 gap-4 mt-4 mb-4 p-4 border rounded-md bg-muted/20">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" /> Data do Agendamento
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Horário
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

          <div className="border rounded-md p-4 bg-muted/20 my-2">
            <div className="font-medium">{agendamento.nome}</div>

            {/* Informações de contato */}
            <div className="mt-2 border-t pt-2">
              <h4 className="text-sm font-medium text-muted-foreground">Informações de Contato:</h4>
              {agendamento.telefone && (
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Telefone:</span> {agendamento.telefone}
                  <a
                    href={`https://wa.me/55${agendamento.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-green-600 hover:underline text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    WhatsApp
                  </a>
                </div>
              )}
              {agendamento.email && (
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Email:</span> {agendamento.email}
                </div>
              )}
              {agendamento.cpf && (
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">CPF/CNPJ:</span> {agendamento.cpf}
                </div>
              )}
            </div>

            {/* Endereço */}
            <div className="mt-2 border-t pt-2">
              <h4 className="text-sm font-medium text-muted-foreground">Endereço:</h4>
              <div className="text-sm text-muted-foreground flex items-center mt-1">
                <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                <span>{agendamento.endereco}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agendamento.endereco)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs flex items-center mt-1"
              >
                <MapPin className="h-3 w-3 mr-1" />
                Ver no Google Maps
              </a>
            </div>

            {/* Detalhes do serviço */}
            <div className="mt-2 border-t pt-2">
              <h4 className="text-sm font-medium text-muted-foreground">Detalhes do Serviço:</h4>
              {agendamento.tecnico && (
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Técnico:</span> {agendamento.tecnico}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span className="font-medium">Data Agendada:</span> {formattedScheduledDate}
              </div>

              {/* Verificar se temos múltiplos equipamentos */}
              {agendamento.equipamentos && Array.isArray(JSON.parse(agendamento.equipamentos)) ? (
                <div className="mt-2">
                  <h5 className="text-sm font-medium text-muted-foreground">Equipamentos:</h5>
                  {JSON.parse(agendamento.equipamentos).map((equipamento: string, index: number) => {
                    const problemas = agendamento.problemas ? JSON.parse(agendamento.problemas) : [];
                    const problema = problemas[index] || 'Não especificado';

                    return (
                      <div key={index} className="ml-2 mt-1 p-2 border-l-2 border-muted">
                        <div className="text-sm">
                          <span className="font-medium">Equipamento {index + 1}:</span> {equipamento}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Problema:</span> {problema}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Equipamento:</span> {agendamento.equipamento}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Problema:</span> {agendamento.problema}
                  </div>
                </>
              )}

              {agendamento.urgente === 'sim' && (
                <div className="text-sm text-red-500 font-medium mt-1">
                  URGENTE
                </div>
              )}
            </div>

            {/* Origem */}
            {agendamento.origem && (
              <div className="mt-2 border-t pt-2">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Origem:</span> {agendamento.origem === 'clientechat' ? 'ClientChat' : agendamento.origem}
                </div>
              </div>
            )}
          </div>

          {/* Seção de cliente existente */}
          {isSearchingClient ? (
            <div className="mt-4 p-3 border rounded-md bg-muted/30 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-2"></div>
              <span className="text-sm">Verificando cliente existente...</span>
            </div>
          ) : existingClient ? (
            <div className="mt-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-700 dark:text-blue-400">Cliente Existente Encontrado</h4>
              </div>
              <div className="mt-2 text-sm">
                <p><span className="font-medium">Nome:</span> {existingClient.name}</p>
                {existingClient.email && <p><span className="font-medium">Email:</span> {existingClient.email}</p>}
                {existingClient.phone && <p><span className="font-medium">Telefone:</span> {existingClient.phone}</p>}
                {existingClient.address && <p><span className="font-medium">Endereço:</span> {existingClient.address}</p>}
              </div>

              <div className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  id="useExistingClient"
                  checked={useExistingClient}
                  onChange={(e) => setUseExistingClient(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="useExistingClient" className="text-sm font-medium">
                  Usar este cliente existente
                </label>
              </div>

              {useExistingClient ? (
                <div className="mt-2 text-xs text-blue-600 flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  A ordem de serviço será associada a este cliente existente
                </div>
              ) : (
                <div className="mt-2 text-xs text-amber-600 flex items-center">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  Um novo cliente será criado com os dados do agendamento
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-3 border rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Novo Cliente</h4>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Um novo cliente será criado com os dados deste agendamento.</p>
              </div>
            </div>
          )}

          <div className="mt-2 text-sm text-green-600">
            <p>Ao criar uma ordem de serviço, o agendamento será vinculado a ela e poderá ser acompanhado no módulo de Ordens de Serviço.</p>
          </div>
        </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => onClose()}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                className="bg-green-500 hover:bg-green-600"
              >
                {hasMultipleEquipments ? (
                  creationMode === 'single'
                    ? 'Criar OS Única'
                    : `Criar ${suggestedGroups.length} Ordens de Serviço`
                ) : (
                  'Criar Ordem de Serviço'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CreateServiceOrderDialog;
