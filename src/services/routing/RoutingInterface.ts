import { ServicePoint, TimeSlot } from './types';
import mapboxgl from '@/config/mapbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Gerencia a interface do mapa de roteirização
 */
export class RoutingInterface {
  private map: mapboxgl.Map | null = null;
  private markers: mapboxgl.Marker[] = [];
  private routeSource: mapboxgl.GeoJSONSource | null = null;

  /**
   * Inicializa o mapa
   * @param container Elemento HTML que conterá o mapa
   * @returns Instância do mapa
   */
  initializeMap(container: HTMLElement): mapboxgl.Map {
    if (this.map) {
      return this.map;
    }

    console.log('Inicializando mapa com token:', mapboxgl.accessToken);

    try {
      // Usar a mesma configuração que funciona na página de confirmação de agendamentos
      const newMap = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-48.5554, -27.5969], // Florianópolis
        zoom: 10
      });

      // Adicionar controles de navegação
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Aguardar o carregamento do mapa
      newMap.on('load', () => {
        console.log('Mapa carregado com sucesso');
      });

      // Lidar com erros de carregamento do mapa
      newMap.on('error', (e) => {
        console.error('Erro no mapa:', e);
      });

      this.map = newMap;
      return this.map;
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
      return null;
    }
  }

  /**
   * Renderiza o mapa de roteirização
   * @param date Data de referência
   * @param confirmedServices Serviços confirmados
   * @param preAppointments Pré-agendamentos
   * @param suggestedRoute Rota sugerida
   */
  renderRoutingMap(
    date: Date,
    confirmedServices: ServicePoint[],
    preAppointments: ServicePoint[],
    suggestedRoute: ServicePoint[]
  ): void {
    if (!this.map) {
      console.error('Mapa não inicializado');
      return;
    }

    // Limpar marcadores existentes
    this.clearMarkers();

    // Adicionar marcadores para serviços confirmados
    confirmedServices.forEach((service, index) => {
      this.addMarker(service, index + 1, 'confirmado');
    });

    // Adicionar marcadores para pré-agendamentos
    preAppointments.forEach((service, index) => {
      this.addMarker(service, confirmedServices.length + index + 1, 'pre-agendamento');
    });

    // Desenhar rota sugerida
    this.drawRoute(suggestedRoute);

    // Ajustar o zoom para mostrar todos os pontos
    this.fitMapToPoints([...confirmedServices, ...preAppointments]);
  }

  /**
   * Adiciona um marcador ao mapa
   * @param service Ponto de serviço
   * @param index Índice do ponto na rota
   * @param type Tipo de marcador ('confirmado' ou 'pre-agendamento')
   */
  private addMarker(service: ServicePoint, index: number, type: 'confirmado' | 'pre-agendamento'): void {
    if (!this.map) return;

    // Criar elemento personalizado para o marcador
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = this.getMarkerColor(service, type);
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
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${service.clientName}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px;">${service.address}</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px; color: ${this.getMarkerColor(service, type)};">
            ${service.urgency ? 'URGENTE - ' : ''}
            ${type === 'confirmado' ? 'CONFIRMADO' : 'PRÉ-AGENDAMENTO'}
            ${service.scheduledTime ? ` - ${format(service.scheduledTime, 'dd/MM/yyyy HH:mm')}` : ''}
          </p>
        </div>
      `);

    // Adicionar marcador ao mapa
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(service.coordinates)
      .setPopup(popup)
      .addTo(this.map);

    // Armazenar marcador para limpeza posterior
    this.markers.push(marker);
  }

  /**
   * Desenha a rota sugerida no mapa
   * @param route Rota sugerida
   */
  private drawRoute(route: ServicePoint[]): void {
    if (!this.map || route.length < 2) return;

    // Extrair coordenadas da rota
    const coordinates = route.map(point => point.coordinates);

    // Remover camada e fonte existentes
    if (this.map.getLayer('route')) {
      this.map.removeLayer('route');
    }

    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }

    // Adicionar nova fonte e camada
    this.map.addSource('route', {
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

    this.map.addLayer({
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

    // Armazenar referência à fonte para atualizações futuras
    this.routeSource = this.map.getSource('route') as mapboxgl.GeoJSONSource;
  }

  /**
   * Ajusta o zoom do mapa para mostrar todos os pontos
   * @param points Pontos a serem exibidos
   */
  private fitMapToPoints(points: ServicePoint[]): void {
    if (!this.map || points.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    // Adicionar todos os pontos ao bounds
    points.forEach(point => {
      bounds.extend(point.coordinates as [number, number]);
    });

    // Ajustar o zoom
    this.map.fitBounds(bounds, {
      padding: 100,
      maxZoom: 12
    });
  }

  /**
   * Limpa todos os marcadores do mapa
   */
  private clearMarkers(): void {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  /**
   * Obtém a cor do marcador com base no tipo e status do serviço
   * @param service Ponto de serviço
   * @param type Tipo de marcador
   * @returns Código de cor CSS
   */
  private getMarkerColor(service: ServicePoint, type: 'confirmado' | 'pre-agendamento'): string {
    if (service.urgency) {
      return '#ef4444'; // Vermelho para urgentes
    }

    if (type === 'confirmado') {
      return '#22c55e'; // Verde para confirmados
    }

    return '#eab308'; // Amarelo para pré-agendamentos
  }

  /**
   * Permite ao usuário selecionar uma janela de tempo para um pré-agendamento
   * @param preAppointmentId ID do pré-agendamento
   * @param availableSlots Slots disponíveis
   * @returns Promise com o slot selecionado ou null se cancelado
   */
  async handleTimeSlotSelection(
    preAppointmentId: string,
    availableSlots: TimeSlot[]
  ): Promise<TimeSlot | null> {
    // Esta função seria implementada com a interface do usuário real
    // Por enquanto, vamos simular uma seleção

    if (availableSlots.length === 0) {
      console.warn('Nenhum slot disponível para seleção');
      return null;
    }

    // Simular seleção do primeiro slot disponível
    return availableSlots[0];
  }
}
