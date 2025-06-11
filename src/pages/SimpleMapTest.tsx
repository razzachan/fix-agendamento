import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Definir token do Mapbox diretamente
mapboxgl.accessToken = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

/**
 * Página de teste extremamente simples para o Mapbox
 */
const SimpleMapTest: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Inicializar mapa quando o componente for montado
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    console.log('Inicializando mapa simples com token:', mapboxgl.accessToken);
    
    try {
      // Inicializar o mapa diretamente
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-48.5554, -27.5969], // Florianópolis
        zoom: 10
      });
      
      // Adicionar um marcador no centro
      new mapboxgl.Marker()
        .setLngLat([-48.5554, -27.5969])
        .addTo(map);
      
      // Aguardar o carregamento do mapa
      map.on('load', () => {
        console.log('Mapa simples carregado com sucesso');
      });
      
      // Lidar com erros
      map.on('error', (e) => {
        console.error('Erro no mapa simples:', e);
      });
      
      // Limpar quando o componente for desmontado
      return () => {
        map.remove();
      };
    } catch (error) {
      console.error('Erro ao inicializar o mapa simples:', error);
    }
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Teste Simples do Mapbox</h1>
      
      <div 
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ccc'
        }}
      />
    </div>
  );
};

export default SimpleMapTest;
