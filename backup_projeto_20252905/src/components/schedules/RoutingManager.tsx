import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendamentoAI } from '@/services/agendamentos';
import { mapboxService, RouteResponse, RouteWaypoint, SavedRoute } from '@/services/maps/mapboxService';
import { technicianService, Technician } from '@/services/technicians';
import MapboxRoutingMap from './MapboxRoutingMap';
import RouteDetails from './RouteDetails';
import TechnicianCalendarView from './TechnicianCalendarView';
import RoutingGroupSelector, { LogisticsGroup } from './RoutingGroupSelector';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, ListFilter, Map, Route, Save, Clock } from 'lucide-react';
import { useUser } from '@/hooks/auth/useUser';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useAppData } from '@/hooks/useAppData';

interface RoutingManagerProps {
  agendamentos: AgendamentoAI[];
  onRouteCreated?: (routeId: string) => void;
}

const RoutingManager: React.FC<RoutingManagerProps> = ({
  agendamentos,
  onRouteCreated
}) => {
  // Obter informações do usuário atual e ordens de serviço
  const { user } = useUser();
  const { serviceOrders } = useAppData();

  // Estado para armazenar a data para visualização de rotas já roteirizadas
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Estado para armazenar a data de execução da rota (quando será realizada)
  const [routeExecutionDate, setRouteExecutionDate] = useState<Date>(addDays(new Date(), 1));

  // Estado para armazenar o grupo logístico selecionado
  const [selectedGroup, setSelectedGroup] = useState<LogisticsGroup>(null);

  // Estado para armazenar a rota calculada
  const [currentRoute, setCurrentRoute] = useState<RouteResponse | null>(null);

  // Estado para armazenar os waypoints da rota
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);

  // Estado para armazenar as rotas salvas
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  // Estado para armazenar os técnicos disponíveis
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Estado para armazenar as rotas atribuídas aos técnicos
  const [assignedRoutes, setAssignedRoutes] = useState<{
    technicianId: string;
    route: RouteResponse;
    waypoints: RouteWaypoint[];
    scheduledDate: Date;
    logisticsGroup: LogisticsGroup;
  }[]>([]);

  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState<string>('map');

  // Estado para armazenar os agendamentos filtrados por data
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);

  // Carregar técnicos ativos
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const activeTechnicians = await technicianService.getActiveTechnicians();
        setTechnicians(activeTechnicians);
        console.log(`Carregados ${activeTechnicians.length} técnicos ativos`);
      } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
        setTechnicians([]);
      }
    };

    loadTechnicians();
  }, []);

  // Filtrar agendamentos pendentes e por grupo logístico
  useEffect(() => {
    // Filtrar agendamentos pendentes (não roteirizados)
    let filtered = agendamentos.filter(agendamento => {
      // Incluir agendamentos pendentes ou pré-agendamentos
      return !agendamento.data_agendada || agendamento.status === 'pendente';
    });

    console.log(`Encontrados ${filtered.length} agendamentos pendentes`);

    // Filtrar por grupo logístico se selecionado
    if (selectedGroup) {
      // Filtrar por grupo logístico com base na propriedade logistica
      filtered = filtered.filter(agendamento => {
        // Se o agendamento já tem um grupo logístico definido, usar esse
        if (agendamento.logistica) {
          return agendamento.logistica === selectedGroup;
        }

        // Caso contrário, tentar determinar o grupo com base no endereço
        // Implementação simplificada - você precisará adaptar isso à sua estrutura de dados

        // Exemplo: Grupo A - CEPs que começam com 0 ou 1 (Florianópolis)
        if (selectedGroup === 'A' && agendamento.endereco &&
            (agendamento.endereco.toLowerCase().includes('florianópolis') ||
             agendamento.endereco.toLowerCase().includes('florianopolis'))) {
          return true;
        }

        // Exemplo: Grupo B - Grande Florianópolis
        if (selectedGroup === 'B' && agendamento.endereco &&
            (agendamento.endereco.toLowerCase().includes('são josé') ||
             agendamento.endereco.toLowerCase().includes('sao jose') ||
             agendamento.endereco.toLowerCase().includes('palhoça') ||
             agendamento.endereco.toLowerCase().includes('palhoca') ||
             agendamento.endereco.toLowerCase().includes('biguaçu') ||
             agendamento.endereco.toLowerCase().includes('biguacu'))) {
          return true;
        }

        // Exemplo: Grupo C - Litoral Norte
        if (selectedGroup === 'C' && agendamento.endereco &&
            (agendamento.endereco.toLowerCase().includes('tijucas') ||
             agendamento.endereco.toLowerCase().includes('balneário camboriú') ||
             agendamento.endereco.toLowerCase().includes('balneario camboriu') ||
             agendamento.endereco.toLowerCase().includes('itajaí') ||
             agendamento.endereco.toLowerCase().includes('itajai') ||
             agendamento.endereco.toLowerCase().includes('navegantes') ||
             agendamento.endereco.toLowerCase().includes('piçarras') ||
             agendamento.endereco.toLowerCase().includes('picarras'))) {
          return true;
        }

        // Se não conseguir determinar o grupo, não incluir
        return false;
      });
    }

    setFilteredAgendamentos(filtered);
  }, [selectedGroup, agendamentos]);

  // Carregar rotas salvas quando o grupo mudar
  useEffect(() => {
    const loadSavedRoutes = async () => {
      const filters: any = {};

      // Adicionar filtro de técnico se o usuário for um técnico
      if (user?.role === 'technician' && user.id) {
        filters.technicianId = user.id;
      }

      // Adicionar filtro de grupo logístico se selecionado
      if (selectedGroup) {
        filters.logisticsGroup = selectedGroup;
      }

      const routes = await mapboxService.getSavedRoutes(filters);
      setSavedRoutes(routes);
    };

    loadSavedRoutes();
  }, [selectedGroup, user]);

  // Função para lidar com a criação de uma rota
  const handleRouteCreated = (route: RouteResponse, waypoints: RouteWaypoint[]) => {
    setCurrentRoute(route);
    setRouteWaypoints(waypoints);
    setActiveTab('details');
  };

  // Função para salvar a rota atual
  const handleSaveRoute = async () => {
    if (!currentRoute) {
      toast.error('Não há rota para salvar');
      return;
    }

    try {
      // Usar a data de execução selecionada para a rota
      const routeName = `Rota ${format(routeExecutionDate, 'dd/MM/yyyy')}${selectedGroup ? ` - Grupo ${selectedGroup}` : ''}`;

      const routeData: SavedRoute = {
        name: routeName,
        waypoints: routeWaypoints,
        route_data: currentRoute,
        scheduled_date: format(routeExecutionDate, 'yyyy-MM-dd'),
        logistics_group: selectedGroup,
        technician_id: user?.role === 'technician' ? user.id : undefined
      };

      const routeId = await mapboxService.saveRoute(routeData);

      if (routeId) {
        toast.success('Rota salva com sucesso!');

        // Atualizar a lista de rotas salvas
        const updatedRoutes = await mapboxService.getSavedRoutes({
          logisticsGroup: selectedGroup
        });
        setSavedRoutes(updatedRoutes);

        // Notificar o componente pai
        if (onRouteCreated) {
          onRouteCreated(routeId);
        }
      } else {
        toast.error('Erro ao salvar a rota');
      }
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      toast.error('Erro ao salvar a rota');
    }
  };

  // Função para compartilhar a rota
  const handleShareRoute = () => {
    // Implementação futura - por exemplo, enviar a rota por e-mail ou WhatsApp
    toast.info('Funcionalidade de compartilhamento será implementada em breve');
  };

  // Função para atribuir uma rota a um técnico
  const handleAssignToTechnician = (technicianId: string, routeData: {
    route: RouteResponse;
    waypoints: RouteWaypoint[];
    scheduledDate?: Date;
    logisticsGroup: LogisticsGroup;
  }) => {
    // Usar a data de execução selecionada se não for fornecida
    const scheduledDate = routeData.scheduledDate || routeExecutionDate;

    // Verificar se já existe uma rota atribuída a este técnico para esta data
    const existingAssignment = assignedRoutes.find(
      ar => ar.technicianId === technicianId &&
      format(ar.scheduledDate, 'yyyy-MM-dd') === format(scheduledDate, 'yyyy-MM-dd')
    );

    if (existingAssignment) {
      // Atualizar a rota existente
      setAssignedRoutes(prev => prev.map(ar =>
        ar.technicianId === technicianId &&
        format(ar.scheduledDate, 'yyyy-MM-dd') === format(scheduledDate, 'yyyy-MM-dd')
          ? { ...routeData, scheduledDate, technicianId }
          : ar
      ));

      toast.success(`Rota atualizada para ${technicians.find(t => t.id === technicianId)?.name}`);
    } else {
      // Adicionar nova atribuição
      setAssignedRoutes(prev => [...prev, { ...routeData, scheduledDate, technicianId }]);

      toast.success(`Rota atribuída a ${technicians.find(t => t.id === technicianId)?.name}`);
    }

    // Mudar para a aba de calendário para visualizar a atribuição
    setActiveTab('calendar');

    // Definir a data selecionada para a data da rota para visualização no calendário
    setSelectedDate(scheduledDate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            Gerenciador de Roteirização
          </CardTitle>
          <CardDescription>
            Crie e gerencie rotas otimizadas para os técnicos com base nos pré-agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seletor de Grupo Logístico e Data */}
            <div className="md:col-span-1 space-y-4">
              <RoutingGroupSelector
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
              />

              <div className="bg-blue-50 p-4 rounded-md">
                <Label htmlFor="route-date" className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Data de Execução da Rota
                </Label>
                <div className="mt-2">
                  <DatePicker
                    id="route-date"
                    date={routeExecutionDate}
                    onSelect={setRouteExecutionDate}
                    className="w-full"
                    disabled={false}
                    fromDate={addDays(new Date(), 1)}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Esta é a data em que a rota será executada pelo técnico.
                </p>
              </div>
            </div>

            {/* Estatísticas e Filtros */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    Agendamentos Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-lg font-semibold">{filteredAgendamentos.length}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Urgentes</div>
                      <div className="text-lg font-semibold">
                        {filteredAgendamentos.filter(a => a.urgente).length}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="text-sm text-gray-500">Rotas Salvas</div>
                      <div className="text-lg font-semibold">{savedRoutes.length}</div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    Mostrando agendamentos pendentes
                    {selectedGroup && ` - Grupo ${selectedGroup}`}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para Mapa, Calendário e Detalhes */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-[600px]">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2" disabled={!currentRoute}>
            <Calendar className="h-4 w-4" />
            Detalhes da Rota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          {filteredAgendamentos.length > 0 ? (
            <MapboxRoutingMap
              agendamentos={filteredAgendamentos}
              onRouteCreated={handleRouteCreated}
            />
          ) : (
            <Card className="w-full p-8 text-center">
              <div className="text-gray-500">
                Nenhum agendamento disponível para a data selecionada.
                {selectedGroup && ' Tente selecionar outro grupo logístico ou '}
                selecione outra data.
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          {selectedDate ? (
            <TechnicianCalendarView
              agendamentos={filteredAgendamentos}
              selectedDate={selectedDate}
              technicians={technicians}
              assignedRoutes={assignedRoutes}
              serviceOrders={serviceOrders}
              onTimeSlotSelected={(slot, agendamento) => {
                toast.info(`Slot selecionado: ${format(slot.start, 'HH:mm')} - ${format(slot.end, 'HH:mm')} para ${agendamento.nome}`);
              }}
            />
          ) : (
            <Card className="w-full p-8 text-center">
              <div className="text-gray-500">
                Selecione uma data para visualizar o calendário.
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          {currentRoute ? (
            <RouteDetails
              route={currentRoute}
              waypoints={routeWaypoints}
              agendamentos={filteredAgendamentos}
              scheduledDate={routeExecutionDate} // Usar a data de execução selecionada
              logisticsGroup={selectedGroup}
              onSaveRoute={handleSaveRoute}
              onShareRoute={handleShareRoute}
              technicians={technicians}
              onAssignToTechnician={handleAssignToTechnician}
            />
          ) : (
            <Card className="w-full p-8 text-center">
              <div className="text-gray-500">
                Nenhuma rota calculada. Crie uma rota no mapa primeiro.
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoutingManager;
