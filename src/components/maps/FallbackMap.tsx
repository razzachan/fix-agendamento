import React from 'react';

interface FallbackMapProps {
  center: [number, number];
  zoom: number;
  width?: string;
  height?: string;
}

/**
 * Componente de mapa de fallback usando OpenStreetMap
 * Usado quando o Mapbox não está disponível
 */
const FallbackMap: React.FC<FallbackMapProps> = ({
  center,
  zoom,
  width = '100%',
  height = '600px'
}) => {
  const [longitude, latitude] = center;
  
  // Construir URL do OpenStreetMap
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.1}%2C${latitude - 0.1}%2C${longitude + 0.1}%2C${latitude + 0.1}&amp;layer=mapnik&amp;marker=${latitude}%2C${longitude}`;
  
  return (
    <div style={{ width, height, position: 'relative', borderRadius: '0.375rem', overflow: 'hidden' }}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={osmUrl}
        style={{ border: '1px solid #e2e8f0' }}
        title="OpenStreetMap"
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.8)',
          padding: '5px',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/
${latitude}/${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver no OpenStreetMap
        </a>
      </div>
    </div>
  );
};

export default FallbackMap;
