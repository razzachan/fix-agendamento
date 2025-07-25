
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MapPin, Calendar, User, Check, AlertCircle, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import ServiceOrderForm from '@/components/ServiceOrderForm';
import { ServiceOrder, Client } from '@/types';
import { clientService } from '@/services';
import { useTechniciansData } from '@/hooks/data/useTechniciansData';
import { v4 as uuidv4 } from 'uuid';
import { generateUUID } from '@/utils/uuid';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/utils/phoneFormatter';

// Schema de validação para o formulário simplificado
const formSchema = z.object({
  clientName: z.string().min(3, { message: 'Nome do cliente é obrigatório' }),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email({ message: 'Email inválido' }).optional(),
  clientAddress: z.string().optional(),
  clientAddressComplement: z.string().optional(),
  serviceAttendanceType: z.enum(['em_domicilio', 'coleta_conserto', 'coleta_diagnostico'], {
    required_error: 'Selecione o tipo de atendimento'
  }),
  // Array de equipamentos
  equipments: z.array(z.object({
    id: z.string().default(() => generateUUID()),
    equipmentType: z.string().min(2, { message: 'Tipo de equipamento é obrigatório' }),
    equipmentModel: z.string().optional(),
    problem: z.string().min(5, { message: 'Descrição do problema é obrigatória' }),
    serviceValue: z.string().optional(),
  })).min(1, { message: 'Adicione pelo menos um equipamento' }),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  technicianId: z.string().optional(),
});

interface NewOrderDialogProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  onCreateOrder?: (data: Partial<ServiceOrder>) => Promise<ServiceOrder | null>;
  refreshServiceOrders?: () => Promise<void>;
}

const NewOrderDialog: React.FC<NewOrderDialogProps> = ({
  isOpen,
  setIsOpen,
  onCreateOrder,
  refreshServiceOrders
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSimpleForm, setShowSimpleForm] = useState(true);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [useExistingClient, setUseExistingClient] = useState(true);
  const [activeTab, setActiveTab] = useState<'cliente' | 'servico' | 'agendamento'>('cliente');

  // Buscar técnicos disponíveis
  const { technicians, isLoading: isTechniciansLoading } = useTechniciansData();

  // Use either the controlled props or internal state
  const isDialogOpen = isOpen !== undefined ? isOpen : dialogOpen;
  const setIsDialogOpen = setIsOpen || setDialogOpen;

  // Inicializar o formulário simplificado
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      clientAddressComplement: '',
      serviceAttendanceType: 'em_domicilio',
      equipments: [
        {
          id: generateUUID(),
          equipmentType: '',
          equipmentModel: '',
          problem: '',
          serviceValue: '',
        }
      ],
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: format(new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)), 'HH:mm'),
      technicianId: 'none',
    },
  });

  // Buscar cliente existente quando os dados de contato mudarem
  const watchClientPhone = form.watch('clientPhone');
  const watchClientEmail = form.watch('clientEmail');

  useEffect(() => {
    const searchForExistingClient = async () => {
      const phone = watchClientPhone;
      const email = watchClientEmail;

      if (!phone && !email) return;
      if (phone?.length < 8 && !email) return;

      setIsSearchingClient(true);
      try {
        // Buscar cliente por telefone ou email
        const client = await clientService.findByContact(
          phone,
          email,
          null
        );

        setExistingClient(client);
        setUseExistingClient(!!client); // Se encontrou cliente, usar por padrão
      } catch (error) {
        console.error('Erro ao buscar cliente existente:', error);
      } finally {
        setIsSearchingClient(false);
      }
    };

    const debounce = setTimeout(() => {
      searchForExistingClient();
    }, 500);

    return () => clearTimeout(debounce);
  }, [watchClientPhone, watchClientEmail]);

  // Função para alternar entre formulário simples e completo
  const toggleFormMode = () => {
    setShowSimpleForm(!showSimpleForm);
  };

  // Função para criar ordem de serviço a partir do formulário simplificado
  const handleSimpleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🔍 [NewOrderDialog] Valores do formulário:', {
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime
    });

    // Criar data completa a partir da data e hora
    let scheduledDate = null;
    if (values.scheduledDate && values.scheduledTime) {
      try {
        const dateTimeStr = `${values.scheduledDate}T${values.scheduledTime}:00`;
        scheduledDate = new Date(dateTimeStr).toISOString();
        console.log('🔍 [NewOrderDialog] Data processada:', {
          dateTimeStr,
          scheduledDate,
          parsedDate: new Date(scheduledDate).toString()
        });
      } catch (error) {
        console.error('❌ [NewOrderDialog] Erro ao processar data e hora:', error);
      }
    }

    // Verificar se é um serviço que precisa de coleta
    const needsPickup = values.serviceAttendanceType === 'coleta_conserto' ||
                        values.serviceAttendanceType === 'coleta_diagnostico';

    // Gerar descrição a partir dos equipamentos
    const description = values.equipments.length > 1
      ? `Múltiplos equipamentos (${values.equipments.length})`
      : values.equipments[0].problem;

    // Mapear equipamentos para itens de serviço
    const serviceItems = values.equipments.map(equipment => ({
      id: equipment.id || uuidv4(),
      serviceOrderId: uuidv4(),
      serviceType: '',
      serviceAttendanceType: values.serviceAttendanceType,
      equipmentType: equipment.equipmentType,
      equipmentModel: equipment.equipmentModel || null,
      equipmentSerial: null,
      clientDescription: equipment.problem,
      serviceValue: equipment.serviceValue || ''
    }));

    // Determinar se devemos criar um novo cliente ou usar um existente
    let clientId = null;

    if (existingClient && useExistingClient) {
      // Usar cliente existente
      clientId = existingClient.id;
      console.log('Usando cliente existente:', existingClient.name, clientId);
    } else if (values.clientName) {
      // Criar novo cliente
      try {
        console.log('Criando novo cliente com os dados do formulário');
        const newClient = await clientService.create({
          name: values.clientName,
          email: values.clientEmail || null,
          phone: values.clientPhone || null,
          address: values.clientAddress || null
        });

        if (newClient) {
          clientId = newClient.id;
          console.log('Novo cliente criado com sucesso:', newClient.name, clientId);
          toast.success('Novo cliente criado com sucesso');
        } else {
          console.error('Falha ao criar novo cliente');
          toast.error('Falha ao criar novo cliente');
        }
      } catch (error) {
        console.error('Erro ao criar novo cliente:', error);
        toast.error('Erro ao criar novo cliente');
      }
    }

    // Buscar nome do técnico se foi selecionado
    let technicianName = null;
    const technicianId = values.technicianId && values.technicianId !== 'none' ? values.technicianId : null;
    if (technicianId) {
      const selectedTechnician = technicians.find(tech => tech.id === technicianId);
      technicianName = selectedTechnician?.name || null;
    }

    // Criar objeto de ordem de serviço
    const serviceOrder: Partial<ServiceOrder> = {
      // id: removido - deixar o banco gerar o ID fixo
      clientId: clientId,
      clientName: values.clientName,
      clientEmail: values.clientEmail || null,
      clientPhone: values.clientPhone || null,
      technicianId: technicianId,
      technicianName: technicianName,
      status: scheduledDate ? 'scheduled' : (needsPickup ? 'pending_collection' : 'pending'),
      createdAt: new Date().toISOString(),
      scheduledDate: scheduledDate,
      scheduledTime: values.scheduledTime || null,
      completedDate: null,
      description: description,
      equipmentType: values.equipments.length > 1
        ? `Múltiplos equipamentos (${values.equipments.length})`
        : values.equipments[0].equipmentType,
      equipmentModel: values.equipments.length > 1
        ? null
        : values.equipments[0].equipmentModel || null,
      equipmentSerial: null,
      needsPickup: needsPickup,
      pickupAddress: values.clientAddress || null,
      pickupAddressComplement: values.clientAddressComplement || null,
      currentLocation: needsPickup ? 'client' : 'workshop',
      serviceAttendanceType: values.serviceAttendanceType,
      clientDescription: description,
      serviceItems: serviceItems,
      // Para coleta diagnóstico, o valor é o sinal inicial
      // Para outros tipos, é o valor final
      initialCost: values.serviceAttendanceType === 'coleta_diagnostico'
        ? values.equipments.reduce((total, equipment) => {
            const itemValue = parseFloat(equipment.serviceValue || '0') / 100;
            return total + itemValue;
          }, 0) || 350 // Fallback R$ 350,00
        : 0,
      finalCost: values.equipments.reduce((total, equipment) => {
        const itemValue = parseFloat(equipment.serviceValue || '0') / 100;
        return total + itemValue;
      }, 0)
    };

    // Enviar para criação
    if (onCreateOrder) {
      onCreateOrder(serviceOrder).then(result => {
        if (result) {
          setIsDialogOpen(false);
          if (refreshServiceOrders) {
            refreshServiceOrders();
          }
        }
      });
    }
  };

  // Função para criar ordem de serviço a partir do formulário completo
  const handleCompleteFormSubmit = async (data: Partial<ServiceOrder>) => {
    if (onCreateOrder) {
      const result = await onCreateOrder(data);
      if (result) {
        setIsDialogOpen(false);
        if (refreshServiceOrders) {
          await refreshServiceOrders();
        }
      }
      return result;
    }
    return null;
  };

  return (
    <>
      <Button onClick={() => {
        console.log('🔍 [NewOrderDialog] Botão clicado, abrindo modal');
        setIsDialogOpen(true);
      }} className="shadow-md">
        <Plus className="h-4 w-4 mr-2" /> Nova Ordem
      </Button>

      {showSimpleForm ? (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          console.log('🔍 [NewOrderDialog] Dialog onOpenChange:', open);
          setIsDialogOpen(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSimpleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="px-6 pt-6 pb-2">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-green-600" />
                    Nova Ordem de Serviço
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-6">

                  {/* Seções em abas */}
                  <div className="flex border-b mb-4">
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium transition-colors ${activeTab === 'cliente' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setActiveTab('cliente')}
                    >
                      <User className="h-4 w-4 inline mr-1" /> Cliente
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium transition-colors ${activeTab === 'servico' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setActiveTab('servico')}
                    >
                      <FileText className="h-4 w-4 inline mr-1" /> Serviço
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium transition-colors ${activeTab === 'agendamento' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setActiveTab('agendamento')}
                    >
                      <Calendar className="h-4 w-4 inline mr-1" /> Agendamento
                    </button>
                  </div>

                  {/* Informações do cliente */}
                  <div className={`space-y-6 ${activeTab === 'cliente' ? 'block' : 'hidden'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cliente</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome completo" className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="(00) 00000-0000"
                                className="h-10"
                                onChange={(e) => {
                                  const formatted = formatPhoneNumber(e.target.value);
                                  field.onChange(formatted);
                                }}
                                maxLength={15} // (XX) XXXXX-XXXX = 15 caracteres
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="clientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="email@exemplo.com" className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Endereço completo" className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="clientAddressComplement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento do Endereço</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apto, Bloco, Casa, etc." className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Botão para avançar para a próxima aba */}
                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        onClick={() => setActiveTab('servico')}
                        className="bg-primary"
                      >
                        Próximo <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Seção de Serviço */}
                  <div className={`space-y-6 ${activeTab === 'servico' ? 'block' : 'hidden'}`}>
                    {/* Tipo de Atendimento */}
                    <div>
                      <h3 className="text-sm font-medium mb-3">Tipo de Atendimento</h3>
                      <FormField
                        control={form.control}
                        name="serviceAttendanceType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div
                                className={`border rounded-md p-3 cursor-pointer transition-all ${field.value === 'em_domicilio' ? 'bg-green-50 border-green-500 dark:bg-green-900/20 shadow-sm' : 'hover:bg-muted/50'}`}
                                onClick={() => form.setValue('serviceAttendanceType', 'em_domicilio')}
                              >
                                <div className="font-medium flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                                  Em Domicílio
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Técnico vai até o cliente</div>
                              </div>
                              <div
                                className={`border rounded-md p-3 cursor-pointer transition-all ${field.value === 'coleta_conserto' ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 shadow-sm' : 'hover:bg-muted/50'}`}
                                onClick={() => form.setValue('serviceAttendanceType', 'coleta_conserto')}
                              >
                                <div className="font-medium flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                  Coleta para Conserto
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Equipamento será coletado</div>
                              </div>
                              <div
                                className={`border rounded-md p-3 cursor-pointer transition-all ${field.value === 'coleta_diagnostico' ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/20 shadow-sm' : 'hover:bg-muted/50'}`}
                                onClick={() => form.setValue('serviceAttendanceType', 'coleta_diagnostico')}
                              >
                                <div className="font-medium flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-purple-600" />
                                  Coleta para Diagnóstico
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Diagnóstico na oficina</div>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Informações dos equipamentos */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium">Equipamentos</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentEquipments = form.getValues('equipments');
                            form.setValue('equipments', [
                              ...currentEquipments,
                              {
                                id: generateUUID(),
                                equipmentType: '',
                                equipmentModel: '',
                                problem: ''
                              }
                            ]);
                          }}
                          className="h-8"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {form.watch('equipments').map((equipment, index) => (
                          <div key={equipment.id} className="border rounded-md p-4 bg-card">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-medium flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                Equipamento {index + 1}
                              </h4>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentEquipments = form.getValues('equipments');
                                    form.setValue('equipments', currentEquipments.filter((_, i) => i !== index));
                                  }}
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                >
                                  Remover
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`equipments.${index}.equipmentType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tipo de Equipamento</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Ex: Fogão, Geladeira, etc." className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`equipments.${index}.equipmentModel`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Modelo (opcional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Marca e modelo" className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`equipments.${index}.problem`}
                                render={({ field }) => (
                                  <FormItem className="md:col-span-2">
                                    <FormLabel>Descrição do Problema</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Descreva o problema" className="h-10" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`equipments.${index}.serviceValue`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Valor do Serviço (opcional)</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="R$ 0,00"
                                        className="h-10"
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/\D/g, '');
                                          field.onChange(value);
                                          if (value) {
                                            const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', {
                                              style: 'currency',
                                              currency: 'BRL'
                                            });
                                            e.target.value = formatted;
                                          }
                                        }}
                                        value={field.value ? (parseInt(field.value) / 100).toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                        }) : ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botões de navegação */}
                    <div className="flex justify-between mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('cliente')}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab('agendamento')}
                        className="bg-primary"
                      >
                        Próximo <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Seção de Agendamento */}
                  <div className={`space-y-6 ${activeTab === 'agendamento' ? 'block' : 'hidden'}`}>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-6">
                      <h3 className="text-sm font-medium mb-2 flex items-center text-blue-700 dark:text-blue-300">
                        <Calendar className="h-4 w-4 mr-2" /> Agendamento
                      </h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Defina a data e hora para o atendimento. Se não for agendar agora, deixe os campos em branco.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-blue-600" /> Data do Agendamento
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ''}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-blue-600" /> Horário
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value || ''}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Campo de seleção de técnico */}
                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="technicianId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <User className="h-4 w-4 text-blue-600" /> Técnico Responsável (opcional)
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              disabled={isTechniciansLoading}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Selecione um técnico" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nenhum técnico (atribuir depois)</SelectItem>
                                {technicians.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id}>
                                    <div className="flex items-center">
                                      <User className="mr-2 h-4 w-4" />
                                      {tech.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground mt-1">
                              Se não selecionar um técnico agora, a ordem não aparecerá no calendário até ser atribuída.
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Botões de navegação */}
                    <div className="flex justify-between mt-8">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('servico')}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-2 h-4 w-4" /> Criar Ordem de Serviço
                      </Button>
                    </div>
                  </div>

                  {/* Seção de cliente existente - só aparece na aba Cliente */}
                  {activeTab === 'cliente' && isSearchingClient ? (
                    <div className="mt-4 p-3 border rounded-md bg-muted/30 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-2"></div>
                      <span className="text-sm">Verificando cliente existente...</span>
                    </div>
                  ) : activeTab === 'cliente' && existingClient ? (
                    <div className="mt-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-950/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium text-blue-700 dark:text-blue-400">Cliente Existente Encontrado</h4>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="useExistingClient"
                            checked={useExistingClient}
                            onChange={(e) => setUseExistingClient(e.target.checked)}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="useExistingClient" className="text-sm font-medium">
                            Usar este cliente
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 p-2 bg-white/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900/30">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="font-medium text-blue-700 dark:text-blue-300">Nome:</span>
                            <span className="ml-1">{existingClient.name}</span>
                          </div>
                          {existingClient.email && (
                            <div>
                              <span className="font-medium text-blue-700 dark:text-blue-300">Email:</span>
                              <span className="ml-1">{existingClient.email}</span>
                            </div>
                          )}
                          {existingClient.phone && (
                            <div>
                              <span className="font-medium text-blue-700 dark:text-blue-300">Telefone:</span>
                              <span className="ml-1">{existingClient.phone}</span>
                            </div>
                          )}
                          {existingClient.address && (
                            <div className="col-span-2">
                              <span className="font-medium text-blue-700 dark:text-blue-300">Endereço:</span>
                              <span className="ml-1">{existingClient.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {useExistingClient ? (
                        <div className="mt-2 text-xs text-blue-600 flex items-center">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          A ordem de serviço será associada a este cliente existente
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-amber-600 flex items-center">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Um novo cliente será criado com os dados informados
                        </div>
                      )}
                    </div>
                  ) : activeTab === 'cliente' && form.watch('clientName') && (form.watch('clientPhone') || form.watch('clientEmail')) ? (
                    <div className="mt-4 p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-700 dark:text-green-400">Novo Cliente</h4>
                      </div>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                        Um novo cliente será criado automaticamente com os dados informados quando você criar a ordem de serviço.
                      </div>
                      <div className="mt-2 p-2 bg-white/50 dark:bg-green-900/10 rounded-md border border-green-100 dark:border-green-900/30">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">Nome:</span>
                            <span className="ml-1">{form.watch('clientName')}</span>
                          </div>
                          {form.watch('clientEmail') && (
                            <div>
                              <span className="font-medium text-green-700 dark:text-green-300">Email:</span>
                              <span className="ml-1">{form.watch('clientEmail')}</span>
                            </div>
                          )}
                          {form.watch('clientPhone') && (
                            <div>
                              <span className="font-medium text-green-700 dark:text-green-300">Telefone:</span>
                              <span className="ml-1">{form.watch('clientPhone')}</span>
                            </div>
                          )}
                          {form.watch('clientAddress') && (
                            <div className="col-span-2">
                              <span className="font-medium text-green-700 dark:text-green-300">Endereço:</span>
                              <span className="ml-1">{form.watch('clientAddress')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Rodapé do diálogo */}
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    onClick={toggleFormMode}
                    className="p-0 h-auto text-blue-600"
                  >
                    Alternar para formulário avançado
                  </Button>

                  {activeTab !== 'agendamento' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>Nova Ordem de Serviço (Formulário Avançado)</span>
                <Button
                  variant="link"
                  onClick={toggleFormMode}
                  className="text-blue-600"
                >
                  Voltar ao formulário simples
                </Button>
              </DialogTitle>
            </DialogHeader>
            <ServiceOrderForm
              onSubmit={handleCompleteFormSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default NewOrderDialog;
