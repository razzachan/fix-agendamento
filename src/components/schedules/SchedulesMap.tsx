import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AgendamentoAI } from '@/services/agendamentos';
import { geocodingService, GeoCoordinates } from '@/services/maps/geocodingService';
import { toast } from 'sonner';

// Corrigir o problema dos ícones do Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Definir ícones personalizados
const defaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Criar ícone para marcadores urgentes (vermelho)
const urgentIcon = new Icon({
  iconUrl: '/markers/urgent-marker.svg',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Criar ícones para diferentes status
const confirmedIcon = new Icon({
  iconUrl: markerIcon, // Usar o ícone padrão por enquanto
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const routedIcon = new Icon({
  iconUrl: markerIcon, // Usar o ícone padrão por enquanto
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Componente para centralizar o mapa em uma localização específica
function SetViewOnLoad({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface SchedulesMapProps {
  agendamentos: AgendamentoAI[];
  onMarkerClick?: (agendamento: AgendamentoAI) => void;
}

const SchedulesMap: React.FC<SchedulesMapProps> = ({ agendamentos, onMarkerClick }) => {
  // Coordenadas padrão para São Paulo
  const defaultCenter: [number, number] = [-23.5505, -46.6333];

  // Estado para armazenar as coordenadas de cada agendamento
  const [coordinates, setCoordinates] = useState<Record<string, GeoCoordinates>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Buscar coordenadas para todos os agendamentos quando o componente for montado
  useEffect(() => {
    const fetchCoordinates = async () => {
      setIsLoading(true);
      const coordsMap: Record<string, GeoCoordinates> = {};

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
              return;
            }

            // Caso contrário, buscar coordenadas usando o serviço de geocodificação
            if (agendamento.endereco) {
              const coords = await geocodingService.getCoordinates(agendamento.endereco);
              if (coords) {
                coordsMap[agendamento.id] = coords;
              } else {
                // Fallback para coordenadas aleatórias se a geocodificação falhar
                coordsMap[agendamento.id] = {
                  lat: defaultCenter[0] + (Math.random() - 0.5) * 0.1,
                  lng: defaultCenter[1] + (Math.random() - 0.5) * 0.1
                };
              }
            } else {
              // Fallback para coordenadas aleatórias se não houver endereço
              coordsMap[agendamento.id] = {
                lat: defaultCenter[0] + (Math.random() - 0.5) * 0.1,
                lng: defaultCenter[1] + (Math.random() - 0.5) * 0.1
              };
            }
          } catch (error) {
            console.error(`Erro ao buscar coordenadas para ${agendamento.id}:`, error);
            // Fallback para coordenadas aleatórias em caso de erro
            coordsMap[agendamento.id] = {
              lat: defaultCenter[0] + (Math.random() - 0.5) * 0.1,
              lng: defaultCenter[1] + (Math.random() - 0.5) * 0.1
            };
          }
        });

        await Promise.all(promises);

        // Pequeno delay para evitar sobrecarga na API de geocodificação
        if (i + batchSize < agendamentos.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setCoordinates(coordsMap);
      setIsLoading(false);
    };

    if (agendamentos.length > 0) {
      fetchCoordinates();
    } else {
      setIsLoading(false);
    }
  }, [agendamentos]);

  // Função para obter coordenadas de um agendamento
  const getCoordinates = (agendamento: AgendamentoAI): GeoCoordinates => {
    // Se temos coordenadas em cache, usá-las
    if (coordinates[agendamento.id]) {
      return coordinates[agendamento.id];
    }

    // Fallback para coordenadas padrão
    return {
      lat: defaultCenter[0],
      lng: defaultCenter[1]
    };
  };

  // Função para determinar o ícone com base na urgência e status
  const getMarkerIcon = (agendamento: AgendamentoAI) => {
    // Prioridade para urgência
    if (agendamento.urgente) {
      return urgentIcon;
    }

    // Depois, verificar o status
    switch (agendamento.status) {
      case 'confirmado':
        return confirmedIcon;
      case 'roteirizado':
        return routedIcon;
      default:
        return defaultIcon;
    }
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

  // Função para abrir o Google Maps com direções
  const openGoogleMapsDirections = (endereco: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-[600px] w-full rounded-md overflow-hidden border border-gray-200 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-blue-600 font-medium">Carregando coordenadas...</p>
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetViewOnLoad center={defaultCenter} />

        {agendamentos.map((agendamento) => {
          const coords = getCoordinates(agendamento);
          return (
            <Marker
              key={agendamento.id}
              position={[coords.lat, coords.lng]}
              icon={getMarkerIcon(agendamento)}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) {
                    onMarkerClick(agendamento);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold">{agendamento.nome}</h3>
                  <p className="text-sm">{agendamento.endereco}</p>
                  <p className="text-sm">
                    <strong>Equipamento:</strong> {agendamento.equipamento}
                  </p>
                  <p className="text-sm">
                    <strong>Problema:</strong> {agendamento.problema}
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong> {formatStatus(agendamento.status)}
                    {agendamento.urgente && (
                      <span className="ml-2 text-red-500 font-bold">Urgente</span>
                    )}
                  </p>
                  <div className="flex space-x-2 mt-2">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex-1"
                      onClick={() => openGoogleMapsDirections(agendamento.endereco)}
                    >
                      Obter Direções
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default SchedulesMap;
