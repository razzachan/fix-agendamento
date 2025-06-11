import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AgendamentoAI } from '@/services/agendamentos';
import { agendamentosService } from '@/services/agendamentos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, CheckCircle, Clock, Filter, Map, MapPin, Phone, Route, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mapboxService, Waypoint } from '@/services/maps/mapboxService';

// Importações do Mapbox
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Definir token do Mapbox (usando o mesmo do serviço)
mapboxgl.accessToken = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

const AppointmentConfirmationPage: React.FC = () => {
  // Referência para o elemento do mapa
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Estados para agendamentos
  const [agendamentos, setAgendamentos] = useState<AgendamentoAI[]>([]);
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoAI | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmationTime, setConfirmationTime] = useState('');
  const [confirmationDate, setConfirmationDate] = useState<Date | undefined>(undefined);

  // Estados para o mapa e rota
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [activeTab, setActiveTab] = useState<string>('map');

  // Carregar agendamentos e rotas salvas
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Carregar agendamentos
        const agendamentosData = await agendamentosService.getAll();
        setAgendamentos(agendamentosData);

        // Carregar rotas salvas
        const routesData = await mapboxService.getSavedRoutes({});
        setSavedRoutes(routesData);

        console.log(`Carregados ${agendamentosData.length} agendamentos e ${routesData.length} rotas salvas`);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar agendamentos por rota selecionada
  useEffect(() => {
    if (!selectedRoute) {
      // Se nenhuma rota estiver selecionada, mostrar agendamentos roteirizados
      const roteirizados = agendamentos.filter(a => a.status === 'roteirizado');
      setFilteredAgendamentos(roteirizados);

      // Converter agendamentos roteirizados em waypoints para o mapa
      const defaultWaypoints = roteirizados.map((agendamento, index) => ({
        id: agendamento.id.toString(),
        name: agendamento.nome,
        address: agendamento.endereco || '',
        coordinates: agendamento.coordenadas || [-48.5554, -27.5969], // Coordenadas padrão se não houver
        status: agendamento.status || 'pendente',
        isUrgent: agendamento.urgente || false,
        scheduledTime: agendamento.data_agendada ? new Date(agendamento.data_agendada) : undefined
      }));

      setWaypoints(defaultWaypoints);
      return;
    }

    // Encontrar a rota selecionada
    const selectedRouteData = savedRoutes.find(route => route.id === selectedRoute);

    if (!selectedRouteData) {
      setFilteredAgendamentos([]);
      setWaypoints([]);
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

    // Converter waypoints da rota para o formato esperado
    const routeWaypoints: Waypoint[] = selectedRouteData.waypoints.map((waypoint: any) => {
      // Encontrar o agendamento correspondente para obter informações adicionais
      const agendamento = agendamentos.find(a => a.id.toString() === waypoint.id);

      return {
        id: waypoint.id,
        name: waypoint.name,
        address: waypoint.address,
        coordinates: waypoint.coordinates,
        status: agendamento?.status || 'pendente',
        isUrgent: agendamento?.urgente || false,
        scheduledTime: agendamento?.data_agendada ? new Date(agendamento.data_agendada) : undefined
      };
    });

    setWaypoints(routeWaypoints);

    // Se a rota tiver dados de rota, definir as coordenadas da rota
    if (selectedRouteData.route_data && selectedRouteData.route_data.routes) {
      const routeCoords = selectedRouteData.route_data.routes[0].geometry.coordinates;
      setRouteCoordinates(routeCoords);
    }

  }, [agendamentos, selectedRoute, savedRoutes]);

  // Inicializar o mapa e exibir a rota
  useEffect(() => {
    // Não remover o mapa aqui para evitar erros

    // Se o mapa já existe e o container também, não precisamos reinicializar
    if (map && mapContainerRef.current) {
      return;
    }

    if (!mapContainerRef.current) {
      console.error('Referência do container do mapa não encontrada');
      return;
    }

    // Inicializar o mapa mesmo sem waypoints
    const initializeMap = async () => {
      try {
        console.log('Inicializando mapa...');

        // Verificar se o token do Mapbox está definido
        if (!mapboxgl.accessToken) {
          console.error('Token do Mapbox não definido');
          toast.error('Erro ao carregar o mapa: token não definido');
          return;
        }

        // Inicializar o mapa diretamente com Mapbox GL
        const newMap = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [-48.5554, -27.5969], // Florianópolis
          zoom: 10
        });

        // Adicionar controles de navegação
        newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Aguardar o carregamento do mapa
        newMap.on('load', () => {
          console.log('Mapa carregado com sucesso');
          setMap(newMap);
        });

        // Lidar com erros de carregamento do mapa
        newMap.on('error', (e) => {
          console.error('Erro no mapa:', e);
          toast.error('Erro ao carregar o mapa');
        });

      } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
        toast.error('Erro ao carregar o mapa');
      }
    };

    // Adicionar um pequeno atraso para garantir que o DOM esteja pronto
    setTimeout(() => {
      initializeMap();
    }, 500);

    // Limpar o mapa quando o componente for desmontado
    return () => {
      try {
        // Verificar se o mapa existe e se tem o método remove
        if (map && typeof map.remove === 'function') {
          map.remove();
        }
      } catch (error) {
        console.error('Erro ao remover o mapa:', error);
      }
    };
    // Remover waypoints das dependências para evitar recriações desnecessárias do mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar marcadores e rota quando os waypoints mudarem
  useEffect(() => {
    if (!map || waypoints.length === 0) return;

    console.log('Atualizando marcadores e rota com', waypoints.length, 'waypoints');

    // Limpar marcadores existentes
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    // Array para armazenar os marcadores criados
    const createdMarkers: mapboxgl.Marker[] = [];

    // Adicionar novos marcadores
    waypoints.forEach((waypoint, index) => {
      console.log(`Criando marcador ${index + 1} para ${waypoint.name} em ${waypoint.coordinates}`);

      // Criar um elemento personalizado para o marcador
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = waypoint.isUrgent ? '#ef4444' :
                                waypoint.status === 'confirmado' ? '#22c55e' :
                                waypoint.status === 'roteirizado' ? '#eab308' : '#6b7280';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '14px';
      el.style.zIndex = '10';

      // Adicionar um número ao marcador
      el.textContent = `${index + 1}`;

      // Criar popup com informações
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; max-width: 300px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${waypoint.name}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px;">${waypoint.address}</p>
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: ${
              waypoint.isUrgent ? '#ef4444' :
              waypoint.status === 'confirmado' ? '#22c55e' :
              waypoint.status === 'roteirizado' ? '#eab308' : '#6b7280'
            };">
              ${waypoint.isUrgent ? 'URGENTE - ' : ''}
              ${waypoint.status.toUpperCase()}
            </p>
          </div>
        `);

      // Adicionar marcador ao mapa
      try {
        // Garantir que as coordenadas estão no formato correto [longitude, latitude]
        const coordinates = waypoint.coordinates;

        // Verificar se as coordenadas são válidas
        if (!coordinates || coordinates.length !== 2 ||
            typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' ||
            isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          console.error(`Coordenadas inválidas para o marcador ${index + 1}:`, coordinates);
          return; // Sair da função atual em vez de continue
        }

        // Verificar se as coordenadas estão dentro de limites razoáveis
        if (coordinates[0] < -180 || coordinates[0] > 180 ||
            coordinates[1] < -90 || coordinates[1] > 90) {
          console.error(`Coordenadas fora dos limites para o marcador ${index + 1}:`, coordinates);
          return; // Sair da função atual em vez de continue
        }

        console.log(`Criando marcador em [${coordinates[0]}, ${coordinates[1]}]`);

        // Criar o marcador com as coordenadas verificadas
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: false // Garantir que o marcador não seja arrastável
        })
          .setLngLat([coordinates[0], coordinates[1]])
          .setPopup(popup)
          .addTo(map);

        createdMarkers.push(marker);
        console.log(`Marcador ${index + 1} adicionado com sucesso em [${coordinates[0]}, ${coordinates[1]}]`);
      } catch (error) {
        console.error(`Erro ao adicionar marcador ${index + 1}:`, error);
      }
    });

    // Ajustar o mapa para mostrar todos os marcadores
    if (waypoints.length > 0) {
      // Criar um bounds para ajustar o mapa
      const bounds = new mapboxgl.LngLatBounds();

      // Adicionar todos os waypoints ao bounds
      waypoints.forEach(waypoint => {
        if (waypoint.coordinates && waypoint.coordinates.length === 2) {
          bounds.extend(waypoint.coordinates as [number, number]);
        }
      });

      // Verificar se o bounds é válido (tem pelo menos um ponto)
      if (!bounds.isEmpty()) {
        // Ajustar o mapa para mostrar todos os marcadores
        map.fitBounds(bounds, {
          padding: 100,
          maxZoom: 12
        });
        console.log('Mapa ajustado para mostrar todos os marcadores');
      } else {
        console.warn('Não foi possível ajustar o mapa - bounds vazio');
      }
    }

    // Calcular e exibir a rota se houver mais de um waypoint
    if (waypoints.length > 1) {
      const waypointCoordinates = waypoints.map(wp => wp.coordinates);

      // Obter a rota usando a API do Mapbox Directions
      const fetchRoute = async () => {
        try {
          console.log('Obtendo rota para coordenadas:', waypointCoordinates);

          const coordinates = waypointCoordinates
            .map(coord => coord.join(','))
            .join(';');

          console.log('String de coordenadas para API:', coordinates);

          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`
          );

          const data = await response.json();
          console.log('Resposta da API de direções:', data);

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const routeCoords = route.geometry.coordinates;

            console.log('Coordenadas da rota obtidas:', routeCoords.length);

            // Remover a camada e fonte existentes se existirem
            if (map.getLayer('route')) {
              map.removeLayer('route');
            }

            if (map.getSource('route')) {
              map.removeSource('route');
            }

            // Adicionar nova fonte e camada
            map.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoords
                }
              }
            });

            map.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.8
              }
            });

            console.log('Rota adicionada ao mapa');
          } else {
            console.warn('Nenhuma rota encontrada na resposta da API');
          }
        } catch (error) {
          console.error('Erro ao obter rota:', error);
        }
      };

      fetchRoute();
    }
  }, [map, waypoints]);

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
    if (selectedRoute && waypoints.length > 0) {
      const waypointIndex = waypoints.findIndex(wp => wp.id === agendamento.id.toString());
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
    } else {
      setConfirmationTime('');
    }

    setIsConfirmDialogOpen(true);
  };

  // Confirmar agendamento
  const handleConfirmAppointment = async () => {
    console.log('Tentando confirmar agendamento:', selectedAgendamento);
    console.log('Data selecionada:', confirmationDate);
    console.log('Horário selecionado:', confirmationTime);

    if (!selectedAgendamento || !confirmationDate || !confirmationTime) {
      console.error('Dados incompletos para confirmação');
      toast.error('Selecione data e horário para confirmar o agendamento');
      return;
    }

    try {
      setIsLoading(true);

      // Formatar data e hora para o formato ISO
      const dateTimeString = `${format(confirmationDate, 'yyyy-MM-dd')}T${confirmationTime}:00`;
      const confirmedDateTime = new Date(dateTimeString);

      // Atualizar o agendamento com o status "confirmado" e a data/hora confirmada
      const updatedAgendamento = {
        ...selectedAgendamento,
        status: 'confirmado',
        data_agendada: confirmedDateTime.toISOString()
      };

      await agendamentosService.update(selectedAgendamento.id, updatedAgendamento);

      // Atualizar a lista de agendamentos
      const updatedAgendamentos = agendamentos.map(a =>
        a.id === selectedAgendamento.id ? updatedAgendamento : a
      );

      setAgendamentos(updatedAgendamentos);
      setIsConfirmDialogOpen(false);
      toast.success('Agendamento confirmado com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast.error('Erro ao confirmar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Confirmação de Agendamentos</h1>
          <p className="text-muted-foreground">
            Confirme os agendamentos roteirizados com os clientes.
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => {
              console.log('Botão de teste clicado');
              if (filteredAgendamentos.length > 0) {
                const testAgendamento = filteredAgendamentos[0];
                console.log('Abrindo diálogo de teste com:', testAgendamento);
                handleOpenConfirmDialog(testAgendamento);
              } else {
                console.log('Nenhum agendamento disponível para teste');
                toast.error('Nenhum agendamento disponível para teste');
              }
            }}
          >
            Testar Diálogo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            Rotas Salvas
          </CardTitle>
          <CardDescription>
            Selecione uma rota para confirmar os agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="route">Rota</Label>
              <Select
                value={selectedRoute || ''}
                onValueChange={(value) => setSelectedRoute(value || null)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecione uma rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os agendamentos roteirizados</SelectItem>
                  {savedRoutes.map(route => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.waypoints.length} pontos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoute && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const route = savedRoutes.find(r => r.id === selectedRoute);
                      if (route) {
                        const date = new Date(route.scheduled_date);
                        return `Rota criada para ${format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
                      }
                      return '';
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <h3 className="text-sm font-medium text-blue-800">Sobre as Confirmações</h3>
              <p className="text-xs text-blue-700 mt-1">
                Selecione uma rota para visualizar os agendamentos e confirmar horários com os clientes.
                Você pode escolher horários disponíveis com base na logística da rota.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para alternar entre visualização de mapa e lista */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa da Rota
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Lista de Agendamentos
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da aba Mapa */}
        <TabsContent value="map" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                Visualização da Rota
              </CardTitle>
              <CardDescription>
                {waypoints.length} pontos de parada na rota.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mapa */}
                <div className="lg:col-span-2">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[500px] rounded-md border"
                    style={{ position: 'relative' }}
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                        Urgente
                      </span>
                      <span className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
                        Roteirizado
                      </span>
                      <span className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                        Confirmado
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de pontos na rota */}
                <div className="lg:col-span-1">
                  <div className="border rounded-md p-4 h-[500px] overflow-y-auto">
                    <h3 className="text-lg font-medium mb-4">Sequência da Rota</h3>
                    {waypoints.length === 0 ? (
                      <p className="text-gray-500">Nenhum ponto na rota.</p>
                    ) : (
                      <ol className="space-y-3">
                        {waypoints.map((waypoint, index) => (
                          <li key={waypoint.id} className="border-b pb-2 last:border-b-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{waypoint.name}</p>
                                <p className="text-sm text-gray-500">{waypoint.address}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant={
                                      waypoint.status === 'confirmado'
                                        ? 'success'
                                        : waypoint.status === 'roteirizado'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                  >
                                    {waypoint.status}
                                  </Badge>
                                  {waypoint.isUrgent && (
                                    <Badge variant="destructive">Urgente</Badge>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Encontrar o agendamento correspondente
                                      const agendamento = filteredAgendamentos.find(
                                        a => a.id.toString() === waypoint.id
                                      );
                                      if (agendamento) {
                                        console.log('Botão Confirmar clicado para waypoint:', waypoint);
                                        console.log('Agendamento encontrado:', agendamento);
                                        handleOpenConfirmDialog(agendamento);
                                      } else {
                                        console.error('Agendamento não encontrado para o waypoint:', waypoint);
                                        toast.error('Erro ao abrir diálogo de confirmação');
                                      }
                                    }}
                                    disabled={waypoint.status === 'confirmado'}
                                    className="flex items-center gap-1"
                                  >
                                    <Check className="h-4 w-4" />
                                    Confirmar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo da aba Lista */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Agendamentos para Confirmação
              </CardTitle>
              <CardDescription>
                {filteredAgendamentos.length} agendamentos encontrados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Carregando agendamentos...</div>
              ) : filteredAgendamentos.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Nenhum agendamento encontrado para os filtros selecionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Agendada</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgendamentos.map((agendamento) => (
                      <TableRow key={agendamento.id}>
                        <TableCell className="font-medium">{agendamento.nome}</TableCell>
                        <TableCell>{agendamento.endereco}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              agendamento.status === 'confirmado'
                                ? 'success'
                                : agendamento.status === 'roteirizado'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {agendamento.status || 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agendamento.data_agendada
                            ? format(new Date(agendamento.data_agendada), 'dd/MM/yyyy HH:mm')
                            : 'Não agendado'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenConfirmDialog(agendamento)}
                            disabled={agendamento.status === 'confirmado'}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Confirmar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmação */}
      <Dialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange:', open);
          setIsConfirmDialogOpen(open);
        }}
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
                      // Corrigir o problema de fuso horário adicionando o horário (12:00)
                      const dateStr = `${e.target.value}T12:00:00`;
                      const newDate = new Date(dateStr);
                      setConfirmationDate(newDate);
                      console.log('Data de confirmação:', newDate);
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
            <Button onClick={handleConfirmAppointment} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AppointmentConfirmationPage;
