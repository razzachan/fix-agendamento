import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Definir token do Mapbox diretamente
mapboxgl.accessToken = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

/**
 * Página de teste simples para o Mapbox
 */
const MapTestPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Inicializar mapa quando o componente for montado
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    console.log('Inicializando mapa de teste com token:', mapboxgl.accessToken);
    
    try {
      // Inicializar o mapa diretamente
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-48.5554, -27.5969], // Florianópolis
        zoom: 10
      });
      
      // Adicionar controles de navegação
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Adicionar um marcador no centro
      new mapboxgl.Marker()
        .setLngLat([-48.5554, -27.5969])
        .addTo(map);
      
      // Aguardar o carregamento do mapa
      map.on('load', () => {
        console.log('Mapa de teste carregado com sucesso');
      });
      
      // Lidar com erros
      map.on('error', (e) => {
        console.error('Erro no mapa de teste:', e);
      });
      
      // Limpar quando o componente for desmontado
      return () => {
        map.remove();
      };
    } catch (error) {
      console.error('Erro ao inicializar o mapa de teste:', error);
    }
  }, []);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teste do Mapbox</h1>
          <p className="text-muted-foreground">
            Página simples para testar a integração com o Mapbox
          </p>
        </div>
      </div>
      
      <div className="border rounded-md p-4">
        <h2 className="text-xl font-semibold mb-4">Mapa</h2>
        <div 
          ref={mapContainerRef}
          className="w-full h-[600px] rounded-md border"
          style={{ position: 'relative' }}
        />
      </div>
    </div>
  );
};

export default MapTestPage;
