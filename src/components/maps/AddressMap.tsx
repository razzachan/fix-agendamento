import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, ExternalLink } from 'lucide-react';
import { geocodingService, GeoCoordinates } from '@/services/maps/geocodingService';

interface AddressMapProps {
  address: string;
  onClose?: () => void;
  width?: string | number;
  height?: string | number;
}

const AddressMap: React.FC<AddressMapProps> = ({
  address,
  onClose,
  width = '100%',
  height = 400
}) => {
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!address) {
        setError('Endereço não fornecido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Geocodificando endereço:', address);

        // Usar o serviço de geocodificação
        const coords = await geocodingService.getCoordinates(address);

        if (coords) {
          setCoordinates(coords);
        } else {
          // Fallback para coordenadas aproximadas de São Paulo
          console.log('Usando coordenadas padrão para São Paulo');
          setCoordinates({
            lat: -23.550520,
            lng: -46.633308
          });
        }
      } catch (err) {
        console.error('Erro de geocodificação:', err);
        // Fallback para coordenadas aproximadas de São Paulo
        setCoordinates({
          lat: -23.550520,
          lng: -46.633308
        });
      } finally {
        setIsLoading(false);
      }
    };

    geocodeAddress();
  }, [address]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-md" style={{ height }}>
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
        </div>
        <span className="mt-4 text-gray-600 font-medium">Localizando endereço...</span>
        <p className="text-xs text-gray-500 mt-1 max-w-xs text-center">
          Estamos buscando as coordenadas para exibir o mapa
        </p>
      </div>
    );
  }

  if (error && !coordinates) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-md p-6" style={{ height }}>
        <div className="bg-red-50 p-3 rounded-full mb-3">
          <MapPin className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-gray-800 font-medium mb-2">Não foi possível localizar o endereço</h3>
        <p className="text-gray-600 text-sm text-center mb-4 max-w-xs">
          {error || 'Não conseguimos encontrar as coordenadas para este endereço no mapa.'}
        </p>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="mt-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fechar
          </Button>
        )}
      </div>
    );
  }

  // Função para obter URL do OpenStreetMap com marcador personalizado
  const getOpenStreetMapUrl = () => {
    if (!coordinates) return '';
    // Adicionamos um marcador personalizado e um zoom melhor
    return `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng - 0.005}%2C${coordinates.lat - 0.005}%2C${coordinates.lng + 0.005}%2C${coordinates.lat + 0.005}&amp;layer=mapnik&amp;marker=${coordinates.lat}%2C${coordinates.lng}`;
  };

  // Função para obter URL de direções do Google Maps
  const getGoogleMapsDirectionsUrl = () => {
    if (!coordinates) return '';
    // Usar o Google Maps para direções, que é mais popular e familiar para os usuários
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=driving`;
  };

  return (
    <div className="rounded-md overflow-hidden" style={{ height, width }}>
      {coordinates ? (
        <div className="relative w-full h-full">
          {/* Usar iframe do OpenStreetMap com estilo melhorado */}
          <div className="relative w-full h-full">
            <iframe
              title="Mapa do endereço"
              width="100%"
              height="100%"
              style={{
                border: 0,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              loading="lazy"
              allowFullScreen
              src={getOpenStreetMapUrl()}
            ></iframe>

            {/* Marcador personalizado sobreposto com cor azul */}
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                zIndex: 1000
              }}
            >
              <div className="relative">
                {/* Sombra do marcador para melhor visibilidade */}
                <div className="absolute -inset-1 bg-white rounded-full opacity-50 blur-sm"></div>

                {/* Marcador principal com preenchimento sólido */}
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3" fill="white"></circle>
                  </svg>
                </div>

                {/* Efeito de pulso para chamar atenção */}
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-0 w-4 h-4 bg-blue-500 rounded-full animate-ping"
                  style={{ opacity: 0.4 }}
                ></div>
              </div>
            </div>
          </div>

          {/* Informações do endereço com design melhorado */}
          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-95 p-4 shadow-lg border-t border-gray-200">
            <h3 className="font-medium text-sm text-gray-800 mb-1">Localização</h3>
            <p className="text-sm text-gray-700 font-medium">{address}</p>
            {coordinates && (
              <div className="flex items-center mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3" fill="white"></circle>
                </svg>
                <span>
                  Latitude: <span className="font-mono text-blue-700">{coordinates.lat.toFixed(6)}</span>,
                  Longitude: <span className="font-mono text-blue-700">{coordinates.lng.toFixed(6)}</span>
                </span>
              </div>
            )}
            <div className="mt-3 flex justify-between items-center">
              <a
                href={getGoogleMapsDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Obter direções no Google Maps
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>

              <button
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-md">
          <div className="text-center p-6">
            <div className="bg-blue-50 p-3 rounded-full mb-3 mx-auto w-fit">
              <MapPin className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-gray-800 font-medium mb-2">Mapa não disponível</h3>
            <p className="text-gray-600 text-sm max-w-xs">
              Não foi possível carregar o mapa para este endereço. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressMap;
