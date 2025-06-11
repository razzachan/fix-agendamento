import React, { useEffect, useRef, useState } from 'react';
import { routingService } from '@/services/routing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Definir token do Mapbox diretamente
mapboxgl.accessToken = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

// Adicionar estilos específicos para o container do mapa
const mapStyles = `
.mapboxgl-map {
  width: 100%;
  height: 100%;
}
.mapboxgl-canvas {
  width: 100% !important;
  height: 100% !important;
}
`;

/**
 * Página de teste para o sistema de roteirização
 */
const RoutingTestPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [mapboxAvailable, setMapboxAvailable] = useState<boolean>(true);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);

  // Referência para o mapa
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  // Marcadores no mapa
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  // Inicializar mapa quando o componente for montado
  useEffect(() => {
    if (!mapContainerRef.current) {
      console.error('Referência do container do mapa não encontrada');
      return;
    }

    console.log('Token do Mapbox:', mapboxgl.accessToken);
    console.log('Inicializando mapa...');

    try {
      // Inicializar o mapa
      const newMap = new mapboxgl.Map({
        container: mapContainerRef.current,
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

      // Lidar com erros
      newMap.on('error', (e) => {
        console.error('Erro no mapa:', e);
      });

      // Limpar quando o componente for desmontado
      return () => {
        // Limpar marcadores
        markers.forEach(marker => marker.remove());

        // Remover mapa
        newMap.remove();
      };
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
    }
  }, [markers]);

  // Função para adicionar marcador no mapa
  const addMarker = (point: any, index: number, isUrgent: boolean = false) => {
    if (!map) return;

    // Criar elemento personalizado para o marcador
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = isUrgent ? '#ef4444' : '#eab308'; // Vermelho para urgentes, amarelo para normais
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
    el.style.cursor = 'pointer';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '14px';

    // Adicionar número ao marcador
    el.textContent = `${index}`;

    // Criar popup com informações
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div style="padding: 12px; max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${point.clientName || 'Cliente'}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px;">${point.address || 'Endereço não disponível'}</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px; color: ${isUrgent ? '#ef4444' : '#eab308'};">
            ${isUrgent ? 'URGENTE' : 'NORMAL'}
          </p>
        </div>
      `);

    // Adicionar marcador ao mapa
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(point.coordinates)
      .setPopup(popup)
      .addTo(map);

    // Armazenar marcador para limpeza posterior
    setMarkers(prev => [...prev, marker]);
  };

  // Função para limpar marcadores
  const clearMarkers = () => {
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  };

  // Função para desenhar rota no mapa
  const drawRoute = (route: any[]) => {
    if (!map || route.length < 2) return;

    // Extrair coordenadas da rota
    const coordinates = route.map(point => point.coordinates);

    // Remover camada e fonte existentes
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
          coordinates
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
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  };

  // Processar roteirização
  const handleProcessRouting = async () => {
    if (!date) {
      toast.error('Selecione uma data para processar a roteirização');
      return;
    }

    console.log(`Iniciando processamento de roteirização para ${format(date, 'dd/MM/yyyy')}`);
    setIsLoading(true);

    try {
      toast.info('Processando roteirização...');

      // Processar roteirização
      const result = await routingService.processRouting(date);

      // Verificar se o mapa está inicializado
      if (!map) {
        console.log('Aguardando inicialização do mapa...');
        // Esperar até que o mapa seja inicializado
        const waitForMap = () => {
          return new Promise<void>((resolve) => {
            const checkMap = () => {
              if (map) {
                resolve();
              } else {
                setTimeout(checkMap, 500);
              }
            };
            checkMap();
          });
        };

        await waitForMap();
      }

      // Limpar marcadores existentes
      clearMarkers();

      // Adicionar marcadores para os pontos da rota
      if (result && result.suggestedRoute && map) {
        console.log(`Adicionando ${result.suggestedRoute.length} marcadores ao mapa`);

        result.suggestedRoute.forEach((point, index) => {
          addMarker(point, index + 1, point.urgency);
        });

        // Desenhar rota no mapa
        drawRoute(result.suggestedRoute);

        // Ajustar o zoom do mapa para mostrar todos os pontos
        if (result.suggestedRoute.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          result.suggestedRoute.forEach(point => {
            bounds.extend(point.coordinates as [number, number]);
          });
          map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 12
          });
        }

        toast.success(`Roteirização processada com sucesso! ${result.suggestedRoute.length} pontos, ${result.totalDistance.toFixed(2)}km, ${result.totalTime} minutos`);
      } else {
        toast.warning('Nenhuma rota sugerida encontrada');
      }
    } catch (error) {
      console.error('Erro ao processar roteirização:', error);
      toast.error('Erro ao processar roteirização. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar estilos ao head
  useEffect(() => {
    // Adicionar estilos do mapa ao head
    const styleElement = document.createElement('style');
    styleElement.textContent = mapStyles;
    document.head.appendChild(styleElement);

    // Limpar quando o componente for desmontado
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roteirização Inteligente</h1>
          <p className="text-muted-foreground">
            Teste do sistema de roteirização inteligente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Painel de controle */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Controles</CardTitle>
            <CardDescription>Configure a roteirização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seletor de data */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Botão de processamento */}
            <Button
              className="w-full"
              onClick={handleProcessRouting}
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : 'Processar Roteirização'}
            </Button>
          </CardContent>
        </Card>

        {/* Mapa e informações */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="map">Mapa</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Mapa de Roteirização</CardTitle>
                  <CardDescription>
                    Visualização da rota otimizada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Usar exatamente a mesma configuração da página de teste simples */}
                  <div
                    ref={mapContainerRef}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: '1px solid #ccc'
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Rota</CardTitle>
                  <CardDescription>
                    Detalhes sobre a roteirização
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecione uma data e clique em "Processar Roteirização" para ver as informações.
                    </p>

                    {/* Aqui seriam exibidas informações detalhadas sobre a rota */}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Legenda</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-green-500 mr-2" />
                          <span className="text-sm">Agendamentos Confirmados</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2" />
                          <span className="text-sm">Pré-Agendamentos</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-red-500 mr-2" />
                          <span className="text-sm">Urgentes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RoutingTestPage;
