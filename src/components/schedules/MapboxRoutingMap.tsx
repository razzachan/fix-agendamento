import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AgendamentoAI } from '@/services/agendamentos';
import { mapboxService, RouteWaypoint, RouteResponse } from '@/services/maps/mapboxService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, Route, Save } from 'lucide-react';

// Token do Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

interface MapboxRoutingMapProps {
  agendamentos: AgendamentoAI[];
  onMarkerClick?: (agendamento: AgendamentoAI) => void;
  onRouteCreated?: (route: RouteResponse, waypoints: RouteWaypoint[]) => void;
}

const MapboxRoutingMap: React.FC<MapboxRoutingMapProps> = ({
  agendamentos,
  onMarkerClick,
  onRouteCreated
}) => {
  // Referência para o elemento do mapa
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Estado para armazenar as coordenadas de cada agendamento
  const [coordinates, setCoordinates] = useState<Record<string, { lat: number, lng: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgendamentos, setSelectedAgendamentos] = useState<string[]>([]);
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RouteResponse | null>(null);

  // Coordenadas padrão para Florianópolis (R. João Carlos de Souza, 292 - Santa Monica)
  const defaultCenter: [number, number] = [-48.5019, -27.5969]; // [longitude, latitude] para Mapbox

  // Buscar coordenadas para todos os agendamentos quando o componente for montado
  useEffect(() => {
    const fetchCoordinates = async () => {
      setIsLoading(true);
      const coordsMap: Record<string, { lat: number, lng: number }> = {};

      console.log(`Buscando coordenadas para ${agendamentos.length} agendamentos`);

      // Processar agendamentos em paralelo com limite de 5 requisições simultâneas
      const batchSize = 5;
      for (let i = 0; i < agendamentos.length; i += batchSize) {
        const batch = agendamentos.slice(i, i + batchSize);
        const promises = batch.map(async (agendamento) => {
          try {
            // Verificar se o agendamento já tem coordenadas
            if (agendamento.latitude && agendamento.longitude) {
              coordsMap[agendamento.id] = {
                lat: agendamento.latitude,
                lng: agendamento.longitude
              };
              console.log(`Agendamento ${agendamento.id} já tem coordenadas: ${agendamento.latitude}, ${agendamento.longitude}`);
              return;
            }

            // Caso contrário, buscar coordenadas usando o serviço Mapbox
            if (agendamento.endereco) {
              console.log(`Buscando coordenadas para agendamento ${agendamento.id} com endereço: ${agendamento.endereco}`);
              const coords = await mapboxService.geocode(agendamento.endereco);
              if (coords) {
                coordsMap[agendamento.id] = coords;
                console.log(`Coordenadas encontradas para ${agendamento.id}: ${coords.lat}, ${coords.lng}`);
              } else {
                // Fallback para coordenadas aleatórias se a geocodificação falhar
                const randomCoords = {
                  lat: defaultCenter[1] + (Math.random() - 0.5) * 0.1,
                  lng: defaultCenter[0] + (Math.random() - 0.5) * 0.1
                };
                coordsMap[agendamento.id] = randomCoords;
                console.log(`Usando coordenadas aleatórias para ${agendamento.id}: ${randomCoords.lat}, ${randomCoords.lng}`);
              }
            } else {
              // Fallback para coordenadas aleatórias se não houver endereço
              const randomCoords = {
                lat: defaultCenter[1] + (Math.random() - 0.5) * 0.1,
                lng: defaultCenter[0] + (Math.random() - 0.5) * 0.1
              };
              coordsMap[agendamento.id] = randomCoords;
              console.log(`Agendamento ${agendamento.id} sem endereço, usando coordenadas aleatórias: ${randomCoords.lat}, ${randomCoords.lng}`);
            }
          } catch (error) {
            console.error(`Erro ao buscar coordenadas para ${agendamento.id}:`, error);
            // Fallback para coordenadas aleatórias em caso de erro
            const randomCoords = {
              lat: defaultCenter[1] + (Math.random() - 0.5) * 0.1,
              lng: defaultCenter[0] + (Math.random() - 0.5) * 0.1
            };
            coordsMap[agendamento.id] = randomCoords;
            console.log(`Erro ao buscar coordenadas para ${agendamento.id}, usando aleatórias: ${randomCoords.lat}, ${randomCoords.lng}`);
          }
        });

        await Promise.all(promises);

        // Pequeno delay para evitar sobrecarga na API
        if (i + batchSize < agendamentos.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Total de coordenadas obtidas: ${Object.keys(coordsMap).length} de ${agendamentos.length} agendamentos`);
      setCoordinates(coordsMap);
      setIsLoading(false);
    };

    if (agendamentos.length > 0) {
      fetchCoordinates();
    } else {
      setIsLoading(false);
    }
  }, [agendamentos]);

  // Inicializar o mapa quando o componente for montado
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: defaultCenter,
      zoom: 11
    });

    // Adicionar controles de navegação
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Limpar o mapa quando o componente for desmontado
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Adicionar marcadores ao mapa quando as coordenadas estiverem disponíveis
  useEffect(() => {
    if (!map.current || isLoading || Object.keys(coordinates).length === 0) return;

    // Limpar marcadores existentes
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // Limpar rotas existentes
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Adicionar novos marcadores
    const bounds = new mapboxgl.LngLatBounds();
    let markersAdded = 0;
    let semCoordenadas = 0;
    let semEndereco = 0;
    let comEndereco = 0;

    console.log(`Adicionando marcadores para ${agendamentos.length} agendamentos`);

    // Verificar quantos agendamentos têm endereço
    agendamentos.forEach(a => {
      if (a.endereco && a.endereco.trim().length > 0) {
        comEndereco++;
      } else {
        semEndereco++;
      }
    });

    console.log(`Agendamentos com endereço: ${comEndereco}, sem endereço: ${semEndereco}`);

    agendamentos.forEach(agendamento => {
      const coords = coordinates[agendamento.id];
      if (!coords) {
        console.log(`Sem coordenadas para agendamento ${agendamento.id}, endereço: "${agendamento.endereco}"`);
        semCoordenadas++;
        return;
      }

      // Criar elemento para o marcador
      const el = document.createElement('div');
      el.className = 'marker';

      // Estilizar o marcador com base na urgência, data agendada e status
      // Categorias de marcadores

      // 1. Urgentes (prioridade máxima)
      if (agendamento.urgente) {
        // Marcador vermelho para agendamentos urgentes
        el.style.backgroundColor = "#EF4444"; // Vermelho
        el.style.border = "2px solid #B91C1C";
        el.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-weight: bold; color: white;">!</div>';
        el.title = "Agendamento Urgente";
      }
      // 2. Agendados (com data definida e confirmados)
      else if (agendamento.data_agendada && agendamento.status === 'confirmado') {
        // Marcador verde para agendamentos confirmados com data e horário definidos
        el.style.backgroundColor = "#10B981"; // Verde
        el.style.border = "2px solid #047857";
        el.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-weight: bold; color: white;">C</div>';
        el.title = "Agendamento Confirmado: " + new Date(agendamento.data_agendada).toLocaleDateString();
      }
      // 3. Roteirizados (incluídos em uma rota)
      else if (agendamento.status === 'roteirizado') {
        // Marcador amarelo para agendamentos roteirizados (aguardando confirmação do cliente)
        el.style.backgroundColor = "#F59E0B"; // Amarelo
        el.style.border = "2px solid #D97706";
        el.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-weight: bold; color: white;">R</div>';
        el.title = "Agendamento Roteirizado (aguardando confirmação do cliente)";
      }
      // 5. Pendentes (todos os outros)
      else {
        // Marcador cinza para outros agendamentos
        el.style.backgroundColor = "#9CA3AF"; // Cinza
        el.style.border = "2px solid #6B7280";
        el.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-weight: bold; color: white;">P</div>';
        el.title = "Agendamento Pendente";
      }

      // Adicionar classe se o agendamento estiver selecionado
      if (selectedAgendamentos.includes(agendamento.id)) {
        el.classList.add('selected');
      }

      // Criar e adicionar o marcador ao mapa
      try {
        const marker = new mapboxgl.Marker(el)
          .setLngLat([coords.lng, coords.lat])
          .addTo(map.current!);

        // Adicionar popup com informações
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${agendamento.nome}</h3>
            <p class="text-sm">${agendamento.endereco || 'Endereço não disponível'}</p>
            <p class="text-sm"><strong>Equipamento:</strong> ${agendamento.equipamento || 'Não especificado'}</p>
            <p class="text-sm"><strong>Problema:</strong> ${agendamento.problema || 'Não especificado'}</p>
            <p class="text-sm">
              <strong>Status:</strong> ${formatStatus(agendamento.status)}
              ${agendamento.urgente ? '<span class="ml-2 text-red-500 font-bold">Urgente</span>' : ''}
            </p>
            ${agendamento.logistics_group ? `<p class="text-sm"><strong>Grupo Logístico:</strong> ${agendamento.logistics_group}</p>` : ''}
          </div>
        `);

        marker.setPopup(popup);

        // Adicionar evento de clique
        marker.getElement().addEventListener('click', () => {
          if (isRoutingMode) {
            // No modo de roteirização, selecionar/deselecionar o agendamento
            toggleAgendamentoSelection(agendamento.id);
          } else if (onMarkerClick) {
            // No modo normal, chamar o callback de clique
            onMarkerClick(agendamento);
          }
        });

        // Estender os limites do mapa para incluir este marcador
        bounds.extend([coords.lng, coords.lat]);
        markersAdded++;
      } catch (error) {
        console.error(`Erro ao adicionar marcador para agendamento ${agendamento.id}:`, error);
      }
    });

    console.log(`Total de marcadores adicionados: ${markersAdded} de ${agendamentos.length} agendamentos`);
    console.log(`Agendamentos sem coordenadas: ${semCoordenadas}`);

    // Listar os primeiros 5 agendamentos para depuração
    console.log("Amostra de agendamentos:");
    agendamentos.slice(0, 5).forEach((a, index) => {
      console.log(`Agendamento ${index + 1}:`, {
        id: a.id,
        nome: a.nome,
        endereco: a.endereco,
        data_agendada: a.data_agendada,
        created_at: a.created_at,
        logistics_group: a.logistics_group,
        urgente: a.urgente,
        temCoordenadas: !!coordinates[a.id]
      });
    });

    // Ajustar o mapa para mostrar todos os marcadores
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    } else {
      console.warn('Nenhum marcador válido para ajustar os limites do mapa');
      // Centralizar no ponto padrão se não houver marcadores
      map.current.setCenter(defaultCenter);
      map.current.setZoom(10);
    }
  }, [coordinates, isLoading, selectedAgendamentos, isRoutingMode, agendamentos, onMarkerClick]);

  // Renderizar a rota quando disponível
  useEffect(() => {
    if (!map.current || !currentRoute) return;

    // Remover rota anterior se existir
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Adicionar a nova rota ao mapa
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: currentRoute.routes[0].geometry
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 5,
        'line-opacity': 0.75
      }
    });
  }, [currentRoute]);

  // Função para alternar a seleção de um agendamento
  const toggleAgendamentoSelection = (id: string) => {
    setSelectedAgendamentos(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Função para formatar o status
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pendente': 'Pendente',
      'confirmado': 'Confirmado',
      'reagendado': 'Reagendado',
      'cancelado': 'Cancelado',
      'roteirizado': 'Roteirizado',
      'os_criada': 'OS Criada'
    };
    return statusMap[status] || status;
  };

  // Função para calcular a rota otimizada
  const calculateRoute = async () => {
    if (selectedAgendamentos.length < 2) {
      toast.error('Selecione pelo menos 2 pontos para calcular uma rota');
      return;
    }

    setIsCalculatingRoute(true);

    try {
      // Preparar os waypoints para a API
      const waypoints: RouteWaypoint[] = selectedAgendamentos.map(id => {
        const agendamento = agendamentos.find(a => a.id === id)!;
        const coords = coordinates[id];
        return {
          name: agendamento.nome,
          coordinates: coords
        };
      });

      // Obter a rota otimizada
      const routeData = await mapboxService.getOptimizedRoute(waypoints);

      if (routeData && routeData.routes.length > 0) {
        setCurrentRoute(routeData);

        // Notificar o componente pai sobre a rota criada
        if (onRouteCreated) {
          onRouteCreated(routeData, waypoints);
        }

        toast.success('Rota calculada com sucesso!');
      } else {
        toast.error('Não foi possível calcular a rota');
      }
    } catch (error) {
      console.error('Erro ao calcular rota:', error);
      toast.error('Erro ao calcular a rota');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Função para salvar a rota atual
  const saveRoute = async () => {
    if (!currentRoute) {
      toast.error('Nenhuma rota para salvar');
      return;
    }

    try {
      // Preparar os waypoints para salvar
      const waypoints: RouteWaypoint[] = selectedAgendamentos.map(id => {
        const agendamento = agendamentos.find(a => a.id === id)!;
        const coords = coordinates[id];
        return {
          name: agendamento.nome,
          coordinates: coords
        };
      });

      // Salvar a rota no banco de dados
      const routeId = await mapboxService.saveRoute({
        name: `Rota ${new Date().toLocaleDateString()}`,
        waypoints,
        route_data: currentRoute
      });

      if (routeId) {
        toast.success('Rota salva com sucesso!');
      } else {
        toast.error('Erro ao salvar a rota');
      }
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      toast.error('Erro ao salvar a rota');
    }
  };

  return (
    <div className="relative h-[600px] w-full rounded-md overflow-hidden border border-gray-200">
      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="mt-2 text-blue-600 font-medium">Carregando coordenadas...</p>
          </div>
        </div>
      )}

      {/* Controles de roteirização */}
      <div className="absolute top-4 left-4 z-10 bg-white p-3 rounded-md shadow-md">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium mb-1">Modo de Roteirização</div>

          <Button
            variant={isRoutingMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRoutingMode(!isRoutingMode)}
            className="flex items-center gap-2"
          >
            <MapPin size={16} />
            {isRoutingMode ? "Modo Seleção Ativo" : "Ativar Seleção de Pontos"}
          </Button>

          {isRoutingMode && (
            <>
              <div className="text-xs text-gray-600 mt-1">
                Clique nos marcadores no mapa para selecionar os pontos que farão parte da rota.
              </div>

              <div className="flex items-center mt-2 bg-blue-50 p-2 rounded-md">
                <div className="text-sm font-medium text-blue-700">
                  {selectedAgendamentos.length} pontos selecionados
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={calculateRoute}
                disabled={selectedAgendamentos.length < 2 || isCalculatingRoute}
                className="flex items-center gap-2 mt-2"
              >
                {isCalculatingRoute ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Route size={16} />
                )}
                Calcular Rota Otimizada
              </Button>

              {currentRoute && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveRoute}
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  Salvar Rota
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legenda do mapa */}
      <div className="absolute bottom-8 left-4 z-10 bg-white p-3 rounded-md shadow-md max-w-xs">
        <h4 className="text-sm font-bold mb-2">Legenda</h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-red-500 mr-2 border border-red-700 flex items-center justify-center text-white font-bold">!</div>
            <span>Urgente (prioridade máxima)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-green-500 mr-2 border border-green-700 flex items-center justify-center text-white font-bold">C</div>
            <span>Confirmado (com cliente)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-yellow-500 mr-2 border border-yellow-700 flex items-center justify-center text-white font-bold">R</div>
            <span>Roteirizado (aguardando confirmação)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-gray-400 mr-2 border border-gray-600 flex items-center justify-center text-white font-bold">P</div>
            <span>Pendente</span>
          </div>
        </div>
      </div>

      {/* Contêiner do mapa */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Estilos CSS para os marcadores */}
      <style jsx global>{`
        .marker {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .marker:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        }

        .marker.selected {
          border: 3px solid #3b82f6 !important;
          box-shadow: 0 0 0 2px white, 0 3px 6px rgba(0, 0, 0, 0.4);
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default MapboxRoutingMap;
