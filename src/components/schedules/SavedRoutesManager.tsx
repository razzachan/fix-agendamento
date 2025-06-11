import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mapboxService, SavedRoute, RouteResponse, RouteWaypoint } from '@/services/maps/mapboxService';
import { AgendamentoAI } from '@/services/agendamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Navigation, Route, Eye, Check, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LogisticsGroup } from './RoutingDateSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SavedRoutesManagerProps {
  selectedDate: Date;
  selectedGroup: LogisticsGroup;
  agendamentos: AgendamentoAI[];
  onRouteSelected: (route: RouteResponse, waypoints: RouteWaypoint[]) => void;
  onAgendamentosUpdated: () => void;
}

const SavedRoutesManager: React.FC<SavedRoutesManagerProps> = ({
  selectedDate,
  selectedGroup,
  agendamentos,
  onRouteSelected,
  onAgendamentosUpdated
}) => {
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [isBatchConfirmDialogOpen, setIsBatchConfirmDialogOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [serviceTimeMinutes, setServiceTimeMinutes] = useState<number>(40);
  const [transitTimeMinutes, setTransitTimeMinutes] = useState<number>(20);

  // Carregar rotas salvas quando a data ou o grupo mudar
  useEffect(() => {
    loadSavedRoutes();
  }, [selectedDate, selectedGroup]);

  // Carregar técnicos disponíveis
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        // Importar dinamicamente para evitar problemas de dependência circular
        const { technicianService } = await import('@/services/technician/technicianService');
        const techniciansList = await technicianService.getAll();
        setTechnicians(techniciansList);
      } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
      }
    };

    loadTechnicians();
  }, []);

  const loadSavedRoutes = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      const filters: any = {
        scheduledDate: formattedDate
      };

      // Adicionar filtro de grupo logístico se selecionado
      if (selectedGroup) {
        filters.logisticsGroup = selectedGroup;
      }

      const routes = await mapboxService.getSavedRoutes(filters);
      setSavedRoutes(routes);
    } catch (error) {
      console.error('Erro ao carregar rotas salvas:', error);
      toast.error('Erro ao carregar rotas salvas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteSelect = (route: SavedRoute) => {
    setSelectedRoute(route);
    if (route.route_data && route.waypoints) {
      onRouteSelected(route.route_data, route.waypoints);
      toast.success('Rota carregada com sucesso!');
    } else {
      toast.error('Dados da rota incompletos');
    }
  };

  const openBatchConfirmDialog = (route: SavedRoute) => {
    setSelectedRoute(route);
    setIsBatchConfirmDialogOpen(true);
  };

  // Função para visualizar e confirmar agendamentos roteirizados
  const handleViewRoutedAppointments = async (route: SavedRoute) => {
    if (!route || !route.waypoints) {
      toast.error('Rota inválida ou sem pontos');
      return;
    }

    try {
      // Obter os nomes dos waypoints da rota
      const waypointNames = route.waypoints.map(wp => wp.name);

      // Importar dinamicamente para evitar problemas de dependência circular
      const { agendamentosService } = await import('@/services/agendamentos');

      // Buscar todos os agendamentos
      const allAgendamentos = await agendamentosService.getAll();

      // Filtrar agendamentos roteirizados associados aos waypoints da rota
      const routedAgendamentos = allAgendamentos.filter(a =>
        waypointNames.includes(a.nome) && a.status === 'roteirizado'
      );

      if (routedAgendamentos.length === 0) {
        toast.info('Não há agendamentos roteirizados para confirmar nesta rota');
        return;
      }

      // Mostrar mensagem com a quantidade de agendamentos roteirizados
      toast.success(`${routedAgendamentos.length} agendamentos roteirizados encontrados. Acesse a aba "Confirmações" para confirmar os agendamentos.`);

      // Aqui você pode implementar a lógica para mostrar um diálogo com os agendamentos roteirizados
      // ou redirecionar para uma página específica de confirmação

    } catch (error) {
      console.error('Erro ao buscar agendamentos roteirizados:', error);
      toast.error('Erro ao buscar agendamentos roteirizados');
    }
  };

  const handleBatchConfirm = async () => {
    if (!selectedRoute || !selectedTechnicianId) {
      toast.error('Selecione um técnico para confirmar os agendamentos');
      return;
    }

    try {
      setIsLoading(true);

      // Encontrar o nome do técnico selecionado
      const technician = technicians.find(t => t.id === selectedTechnicianId);
      const technicianName = technician ? technician.name : 'Técnico designado';

      // Obter os agendamentos associados aos waypoints da rota
      const waypointNames = selectedRoute.waypoints.map(wp => wp.name);
      const routeAgendamentos = agendamentos.filter(a =>
        waypointNames.includes(a.nome) &&
        a.status !== 'confirmado' &&
        a.status !== 'os_criada' &&
        a.status !== 'aguardando_confirmacao'
      );

      if (routeAgendamentos.length === 0) {
        toast.warning('Não há agendamentos para roteirizar nesta rota');
        setIsBatchConfirmDialogOpen(false);
        setIsLoading(false);
        return;
      }

      // Calcular horários estimados para cada ponto da rota
      let currentTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}`);

      // Importar dinamicamente para evitar problemas de dependência circular
      const { agendamentosService } = await import('@/services/agendamentos');

      // Preparar cada agendamento com horário sugerido (status: aguardando_confirmacao)
      const promises = routeAgendamentos.map((agendamento, index) => {
        // Adicionar tempo de serviço após o primeiro ponto
        if (index > 0) {
          // Adicionar tempo de trânsito entre pontos
          currentTime = new Date(currentTime.getTime() + transitTimeMinutes * 60000);
        }

        // Formatar o horário estimado
        const scheduledTime = format(currentTime, "HH:mm");
        const scheduledDate = format(selectedDate, "yyyy-MM-dd");
        const fullScheduledDate = `${scheduledDate}T${scheduledTime}:00`;

        // Atualizar o agendamento para "roteirizado" (usando apenas campos que sabemos que existem)
        // Vamos usar apenas os campos status e tecnico, que sabemos que existem
        return agendamentosService.update(agendamento.id, {
          status: 'roteirizado',
          tecnico: technicianName
        });

        // Adicionar tempo de serviço para o próximo ponto
        currentTime = new Date(currentTime.getTime() + serviceTimeMinutes * 60000);
      });

      await Promise.all(promises);

      toast.success(`${routeAgendamentos.length} agendamentos roteirizados com sucesso! Status atualizado para "roteirizado".`);
      setIsBatchConfirmDialogOpen(false);

      // Notificar o componente pai para atualizar a lista de agendamentos
      if (onAgendamentosUpdated) {
        onAgendamentosUpdated();
      }
    } catch (error) {
      console.error('Erro ao roteirizar agendamentos em lote:', error);
      toast.error('Erro ao roteirizar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Rotas Salvas</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSavedRoutes}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {savedRoutes.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="p-6 text-center text-gray-500">
            Nenhuma rota salva para a data selecionada.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {savedRoutes.map((route) => (
            <AccordionItem key={route.id} value={route.id || 'temp'}>
              <AccordionTrigger className="hover:bg-gray-50 px-4">
                <div className="flex items-center gap-2 text-left">
                  <Route className="h-4 w-4 text-blue-600" />
                  <span>{route.name}</span>
                  {route.logistics_group && (
                    <Badge variant="outline" className="ml-2">
                      Grupo {route.logistics_group}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="text-sm text-gray-500">
                    Criada em: {route.created_at ? new Date(route.created_at).toLocaleString() : 'N/A'}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Pontos na rota:</span> {route.waypoints?.length || 0}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRouteSelect(route)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBatchConfirmDialog(route)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Roteirizar Agendamentos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRoutedAppointments(route)}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Diálogo de roteirização em lote */}
      <Dialog open={isBatchConfirmDialogOpen} onOpenChange={setIsBatchConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Roteirizar Agendamentos</DialogTitle>
            <DialogDescription>
              Defina horários sugeridos para os agendamentos desta rota. Os clientes serão contatados para confirmar a disponibilidade nos horários sugeridos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="technician" className="text-right">
                Técnico
              </Label>
              <Select
                value={selectedTechnicianId}
                onValueChange={setSelectedTechnicianId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Horário inicial
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceTime" className="text-right">
                Tempo de serviço
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="serviceTime"
                  type="number"
                  value={serviceTimeMinutes}
                  onChange={(e) => setServiceTimeMinutes(parseInt(e.target.value))}
                  min={10}
                  max={120}
                />
                <span className="text-sm text-gray-500">minutos</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transitTime" className="text-right">
                Tempo de trânsito
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="transitTime"
                  type="number"
                  value={transitTimeMinutes}
                  onChange={(e) => setTransitTimeMinutes(parseInt(e.target.value))}
                  min={5}
                  max={60}
                />
                <span className="text-sm text-gray-500">minutos</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBatchConfirm} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Roteirizar Agendamentos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedRoutesManager;
