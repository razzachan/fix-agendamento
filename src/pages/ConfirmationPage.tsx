import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAgendamentosData } from '@/hooks/data/useAgendamentosData';
import { useServiceOrdersData } from '@/hooks/data/useServiceOrdersData';
import PageHeader from '@/components/layout/PageHeader';
import { Check, Loader2, Calendar, FileText } from 'lucide-react';
import { useUser } from '@/hooks/auth/useUser';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mapboxService } from '@/services/maps/mapboxService';
import { technicianService } from '@/services/technicians';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AgendamentoAI } from '@/services/agendamentos';
import TechnicianCalendarView from '@/components/schedules/TechnicianCalendarView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateServiceOrderDialog from '@/components/schedules/CreateServiceOrderDialog';

const ConfirmationPage: React.FC = () => {
  const { agendamentos, isLoading, updateAgendamento, refreshAgendamentos } = useAgendamentosData();
  const { addServiceOrder } = useServiceOrdersData();
  const { user } = useUser();
  const navigate = useNavigate();

  // Estados adicionais
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoAI | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmationTime, setConfirmationTime] = useState('');
  const [confirmationDate, setConfirmationDate] = useState<Date | undefined>(new Date());
  const [isRoutesLoading, setIsRoutesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('list');

  // Estados para o diálogo de criação de ordem de serviço
  const [isServiceOrderDialogOpen, setIsServiceOrderDialogOpen] = useState(false);
  const [confirmedAgendamento, setConfirmedAgendamento] = useState<AgendamentoAI | null>(null);

  // Estado para armazenar os técnicos
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Estado para armazenar as rotas atribuídas
  const [assignedRoutes, setAssignedRoutes] = useState<any[]>([]);

  // Verificar permissões do usuário
  useEffect(() => {
    // Apenas administradores podem acessar esta página
    if (user && user.role !== 'admin') {
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/');
    }
  }, [user, navigate]);

  // Carregar rotas salvas e técnicos
  useEffect(() => {
    const fetchData = async () => {
      setIsRoutesLoading(true);
      try {
        // Carregar rotas salvas
        const routesData = await mapboxService.getSavedRoutes({});
        setSavedRoutes(routesData);
        console.log(`Carregadas ${routesData.length} rotas salvas`);

        // Carregar técnicos
        const techniciansData = await technicianService.getActiveTechnicians();
        setTechnicians(techniciansData);
        console.log(`Carregados ${techniciansData.length} técnicos ativos`);

        // Criar rotas de teste para visualização no calendário
        let testRoutes = [];

        // Verificar se já existem rotas atribuídas
        const routesWithTechnicians = routesData
          .filter(route => route.technician_id) // Filtrar apenas rotas com técnicos atribuídos
          .map(route => ({
            technicianId: route.technician_id,
            route: route.route_data,
            waypoints: route.waypoints,
            scheduledDate: new Date(route.scheduled_date),
            logisticsGroup: route.logistics_group
          }));

        console.log('Rotas com técnicos atribuídos:', routesWithTechnicians);

        // Se não houver rotas atribuídas, criar algumas para teste
        if (routesWithTechnicians.length === 0 && techniciansData.length > 0 && agendamentos.length > 0) {
          console.log('Criando rotas de teste para visualização no calendário');

          // Encontrar o técnico "Pedro Santos" ou usar o primeiro técnico
          const pedroTechnician = techniciansData.find(t => t.name.includes('Pedro')) || techniciansData[0];

          // Criar uma rota de teste com os primeiros 3 agendamentos
          const testWaypoints = agendamentos.slice(0, 3).map((agendamento, index) => ({
            id: agendamento.id.toString(),
            name: agendamento.nome,
            address: agendamento.endereco || '',
            coordinates: agendamento.coordenadas || [-48.5554 - (index * 0.01), -27.5969 - (index * 0.01)]
          }));

          testRoutes.push({
            technicianId: pedroTechnician.id,
            route: { routes: [{ geometry: { coordinates: [] } }] },
            waypoints: testWaypoints,
            scheduledDate: new Date(),
            logisticsGroup: 'A'
          });

          console.log('Rota de teste criada:', testRoutes);
        }

        // Combinar rotas reais com rotas de teste
        setAssignedRoutes([...routesWithTechnicians, ...testRoutes]);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsRoutesLoading(false);
      }
    };

    fetchData();
  }, [agendamentos]);

  // Filtrar agendamentos por rota selecionada
  useEffect(() => {
    if (!selectedRoute) {
      // Se nenhuma rota estiver selecionada, mostrar agendamentos roteirizados
      const roteirizados = agendamentos.filter(a => a.status === 'roteirizado');
      setFilteredAgendamentos(roteirizados);
      return;
    }

    // Encontrar a rota selecionada
    const selectedRouteData = savedRoutes.find(route => route.id === selectedRoute);

    if (!selectedRouteData) {
      setFilteredAgendamentos([]);
      return;
    }

    console.log('Rota selecionada:', selectedRouteData);

    // Obter os IDs dos agendamentos na rota
    const routeWaypointIds = selectedRouteData.waypoints.map((wp: any) => wp.id);

    // Filtrar agendamentos que estão na rota
    const routeAgendamentos = agendamentos.filter(agendamento =>
      routeWaypointIds.includes(agendamento.id.toString())
    );

    setFilteredAgendamentos(routeAgendamentos);
  }, [agendamentos, selectedRoute, savedRoutes]);

  // Abrir diálogo de confirmação
  const handleOpenConfirmDialog = (agendamento: AgendamentoAI) => {
    console.log('Abrindo diálogo de confirmação para:', agendamento);
    setSelectedAgendamento(agendamento);

    // Obter data sugerida da rota selecionada
    if (selectedRoute) {
      const route = savedRoutes.find(r => r.id === selectedRoute);
      if (route && route.scheduled_date) {
        setConfirmationDate(new Date(route.scheduled_date));
      } else {
        setConfirmationDate(new Date());
      }
    } else {
      setConfirmationDate(new Date());
    }

    // Sugerir um horário com base na posição do agendamento na rota
    if (selectedRoute) {
      const selectedRouteData = savedRoutes.find(route => route.id === selectedRoute);
      if (selectedRouteData) {
        const waypointIndex = selectedRouteData.waypoints.findIndex((wp: any) => wp.id === agendamento.id.toString());
        if (waypointIndex >= 0) {
          // Calcular horário sugerido: 9h + 1h por ponto anterior na rota
          const baseHour = 9; // Começar às 9h
          const suggestedHour = baseHour + waypointIndex;

          // Garantir que o horário esteja dentro do horário comercial (9h-18h)
          const adjustedHour = Math.min(suggestedHour, 17); // Não passar das 17h

          // Formatar o horário sugerido (HH:MM)
          const suggestedTime = `${adjustedHour.toString().padStart(2, '0')}:00`;
          setConfirmationTime(suggestedTime);

          console.log(`Horário sugerido para ponto ${waypointIndex + 1}: ${suggestedTime}`);
        } else {
          setConfirmationTime('');
        }
      }
    } else {
      setConfirmationTime('');
    }

    setIsConfirmDialogOpen(true);
  };

  // Confirmar agendamento
  const handleConfirmAppointment = async () => {
    if (!selectedAgendamento || !confirmationDate || !confirmationTime) {
      toast.error('Selecione data e horário para confirmar o agendamento');
      return;
    }

    try {
      // Formatar data e hora para o formato ISO
      const dateTimeString = `${format(confirmationDate, 'yyyy-MM-dd')}T${confirmationTime}:00`;
      const confirmedDateTime = new Date(dateTimeString);

      // Atualizar o agendamento com o status "confirmado" e a data/hora confirmada
      const updatedAgendamento = {
        ...selectedAgendamento,
        status: 'confirmado',
        data_agendada: confirmedDateTime.toISOString()
      };

      // Usar o método updateAgendamento do hook
      const success = await updateAgendamento(selectedAgendamento.id, updatedAgendamento);

      if (success) {
        setIsConfirmDialogOpen(false);

        // Atualizar o agendamento na lista local para refletir a mudança imediatamente
        // Isso garante que o calendário seja atualizado sem precisar recarregar a página
        const updatedAgendamentos = agendamentos.map(a =>
          a.id === selectedAgendamento.id ? updatedAgendamento : a
        );

        // Atualizar a lista filtrada também
        const updatedFilteredAgendamentos = filteredAgendamentos.map(a =>
          a.id === selectedAgendamento.id ? updatedAgendamento : a
        );

        // Forçar a atualização do componente
        setFilteredAgendamentos([...updatedFilteredAgendamentos]);

        // Armazenar o agendamento confirmado para criar a ordem de serviço
        setConfirmedAgendamento({
          ...updatedAgendamento,
          data_agendada: confirmedDateTime.toISOString()
        });

        // Abrir o diálogo de criação de ordem de serviço
        setIsServiceOrderDialogOpen(true);

        // A mensagem de sucesso e a atualização da lista já são tratadas pelo método updateAgendamento
      }
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast.error('Erro ao confirmar agendamento');
    }
  };

  // Função para criar ordem de serviço a partir do agendamento confirmado
  const handleCreateServiceOrder = async (
    agendamentoId: string,
    scheduledDate: string | null,
    scheduledTime: string | null,
    existingClientId?: string
  ) => {
    try {
      if (!confirmedAgendamento) {
        toast.error('Agendamento não encontrado');
        return;
      }

      // Encontrar o técnico atribuído à rota
      let technicianId = null;
      let technicianName = null;

      if (selectedRoute) {
        const route = savedRoutes.find(r => r.id === selectedRoute);
        if (route && route.technician_id) {
          technicianId = route.technician_id;
          const technician = technicians.find(t => t.id === technicianId);
          technicianName = technician ? technician.name : null;
        }
      }

      // Usar a data e hora do agendamento confirmado
      // Isso garante consistência entre o agendamento e a ordem de serviço
      const confirmedDate = confirmedAgendamento.data_agendada
        ? new Date(confirmedAgendamento.data_agendada)
        : new Date();

      // Formatar a data e hora para o formato correto
      const formattedDate = format(confirmedDate, 'yyyy-MM-dd');
      const formattedTime = format(confirmedDate, 'HH:mm');

      console.log('Criando OS com data/hora:', formattedDate, formattedTime);

      // Criar a ordem de serviço
      const newOrder = {
        clientName: confirmedAgendamento.nome,
        clientPhone: confirmedAgendamento.telefone,
        clientEmail: confirmedAgendamento.email,
        clientCpfCnpj: confirmedAgendamento.cpf,
        clientId: existingClientId,
        description: confirmedAgendamento.problema || 'Sem descrição',
        equipmentType: confirmedAgendamento.equipamento || 'Não especificado',
        // Usar a data e hora do agendamento confirmado, ignorando os valores do formulário
        scheduledDate: formattedDate,
        scheduledTime: formattedTime,
        technicianId: technicianId,
        technicianName: technicianName,
        status: 'scheduled',
        serviceAttendanceType: confirmedAgendamento.tipo_servico === 'coleta' ? 'coleta_conserto' : 'em_domicilio',
        clientFullAddress: confirmedAgendamento.endereco,
        needsPickup: confirmedAgendamento.tipo_servico === 'coleta'
      };

      const createdOrder = await addServiceOrder(newOrder);

      if (createdOrder) {
        toast.success('Ordem de serviço criada com sucesso!');
        setIsServiceOrderDialogOpen(false);

        console.log('Ordem de serviço criada:', createdOrder);
        console.log('Atualizando agendamento com ID da ordem de serviço...');

        try {
          // Atualizar o agendamento com o ID da ordem de serviço
          // Forçar o status para confirmado
          const updatedAgendamento = {
            ...confirmedAgendamento,
            ordem_servico_id: createdOrder.id,
            status: 'confirmado' // Garantir que o status seja confirmado
          };

          console.log('Dados do agendamento a ser atualizado:', updatedAgendamento);

          // Atualizar o agendamento no banco de dados
          const updateSuccess = await updateAgendamento(confirmedAgendamento.id, updatedAgendamento);

          if (updateSuccess) {
            console.log('Agendamento atualizado com sucesso no banco de dados');

            // Atualizar TODOS os agendamentos na lista local
            const allUpdatedAgendamentos = agendamentos.map(a => {
              if (a.id === confirmedAgendamento.id) {
                console.log(`Atualizando agendamento ${a.id} na lista local`);
                return {
                  ...a,
                  ordem_servico_id: createdOrder.id,
                  status: 'confirmado'
                };
              }
              return a;
            });

            // Atualizar a lista filtrada também
            const updatedFilteredAgendamentos = filteredAgendamentos.map(a => {
              if (a.id === confirmedAgendamento.id) {
                console.log(`Atualizando agendamento ${a.id} na lista filtrada`);
                return {
                  ...a,
                  ordem_servico_id: createdOrder.id,
                  status: 'confirmado'
                };
              }
              return a;
            });

            // Forçar a atualização do componente
            console.log('Forçando atualização dos componentes...');
            setFilteredAgendamentos([...updatedFilteredAgendamentos]);

            // Atualizar a lista completa de agendamentos
            console.log('Atualizando lista completa de agendamentos...');
            await refreshAgendamentos();

            // Forçar uma atualização adicional após um pequeno delay
            setTimeout(() => {
              console.log('Executando atualização adicional após delay...');
              refreshAgendamentos();
            }, 1000);

            // Forçar uma atualização da página após 2 segundos
            toast.success('Ordem de serviço criada com sucesso! Atualizando página...');
            setTimeout(() => {
              console.log('Forçando atualização completa da página...');
              window.location.reload();
            }, 2000);

            toast.success('Agendamento confirmado e ordem de serviço criada com sucesso!');
          } else {
            console.error('Falha ao atualizar o agendamento no banco de dados');
            toast.error('Ordem de serviço criada, mas houve um erro ao atualizar o agendamento');
          }
        } catch (error) {
          console.error('Erro ao atualizar o agendamento:', error);
          toast.error('Ordem de serviço criada, mas houve um erro ao atualizar o agendamento');
        }
      }
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error('Erro ao criar ordem de serviço');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-6 px-4 sm:px-6 lg:px-8"
      >
        <PageHeader
          title="Confirmação de Agendamentos"
          description="Confirme os agendamentos roteirizados com os clientes."
          icon={<Check className="h-8 w-8 text-green-600" />}
        />

        {isLoading || isRoutesLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <span className="ml-3 text-lg text-gray-700">Carregando dados...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Rotas Salvas</CardTitle>
                <CardDescription>
                  Selecione uma rota para confirmar os agendamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="route">Rota</Label>
                      <Select
                        value={selectedRoute || 'all'}
                        onValueChange={(value) => setSelectedRoute(value === 'all' ? null : value)}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Selecione uma rota" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os agendamentos roteirizados</SelectItem>
                          {savedRoutes.map(route => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.name} ({route.waypoints.length} pontos)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end">
                      <div className="flex space-x-2">
                        <Button
                          variant={activeTab === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveTab('list')}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Lista
                        </Button>
                        <Button
                          variant={activeTab === 'calendar' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveTab('calendar')}
                          className="flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Calendário
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Lista de Agendamentos
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendário
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Agendamentos</CardTitle>
                    <CardDescription>
                      {filteredAgendamentos.length} agendamentos encontrados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredAgendamentos.length === 0 ? (
                        <p>Nenhum agendamento encontrado para a rota selecionada.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAgendamentos.map(agendamento => (
                            <Card key={agendamento.id}>
                              <CardContent className="p-4">
                                <h3 className="font-medium">{agendamento.nome}</h3>
                                <p className="text-sm text-gray-500">{agendamento.endereco}</p>
                                <p className="text-sm mt-2">
                                  Status: <span className="font-medium">{agendamento.status || 'Pendente'}</span>
                                </p>
                                <Button
                                  className="mt-2 w-full"
                                  variant="outline"
                                  disabled={agendamento.status === 'confirmado'}
                                  onClick={() => handleOpenConfirmDialog(agendamento)}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Confirmar
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar" className="mt-4">
                <TechnicianCalendarView
                  agendamentos={agendamentos}
                  selectedDate={confirmationDate || new Date()}
                  technicians={technicians}
                  assignedRoutes={assignedRoutes}
                  onTimeSlotSelected={(slot, agendamento) => {
                    // Abrir diálogo de confirmação com o horário selecionado
                    setSelectedAgendamento(agendamento);
                    setConfirmationDate(slot.start);
                    setConfirmationTime(format(slot.start, 'HH:mm'));
                    setIsConfirmDialogOpen(true);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Diálogo de confirmação */}
        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Agendamento</DialogTitle>
              <DialogDescription>
                Defina a data e horário para confirmar o agendamento com o cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                  Cliente
                </Label>
                <div className="col-span-3">
                  <p className="font-medium">{selectedAgendamento?.nome}</p>
                  <p className="text-sm text-gray-500">{selectedAgendamento?.endereco}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmDate" className="text-right">
                  Data
                </Label>
                <div className="col-span-3">
                  <Input
                    id="confirmDate"
                    type="date"
                    value={confirmationDate ? format(confirmationDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const dateStr = `${e.target.value}T12:00:00`;
                        const newDate = new Date(dateStr);
                        setConfirmationDate(newDate);
                      } else {
                        setConfirmationDate(undefined);
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmTime" className="text-right">
                  Horário
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="confirmTime"
                    type="time"
                    value={confirmationTime}
                    onChange={(e) => setConfirmationTime(e.target.value)}
                    className="w-full"
                  />

                  <div className="flex flex-wrap gap-2 mt-2">
                    <p className="text-xs text-gray-500 w-full">Horários sugeridos:</p>
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => (
                      <Button
                        key={time}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmationTime(time)}
                        className={`text-xs px-2 py-1 h-auto ${confirmationTime === time ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmAppointment}>
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de criação de ordem de serviço */}
        <CreateServiceOrderDialog
          isOpen={isServiceOrderDialogOpen}
          onClose={() => setIsServiceOrderDialogOpen(false)}
          onConfirm={handleCreateServiceOrder}
          agendamento={confirmedAgendamento}
        />
      </motion.div>
    </>
  );
};

export default ConfirmationPage;
