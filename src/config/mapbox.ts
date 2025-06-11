import mapboxgl from 'mapbox-gl';

// Token de acesso do Mapbox fornecido pelo usuário
// Em produção, use um token privado armazenado em variáveis de ambiente
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZml4Zm9nb2VzIiwiYSI6ImNtNnNzbGU0MjBibWsyaXE0azQ4NDZobHMifQ.ENlHAo8yuieEG-RAOiUhtA';

// Verificar se o token está definido
if (!MAPBOX_ACCESS_TOKEN) {
  console.error('Token de acesso do Mapbox não definido!');
}

// Configurar o token de acesso globalmente
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Verificar se o Mapbox está disponível
try {
  console.log('Mapbox GL JS versão:', mapboxgl.version);
  console.log('Token de acesso do Mapbox configurado:', mapboxgl.accessToken);
} catch (error) {
  console.error('Erro ao inicializar Mapbox GL JS:', error);
}

export { MAPBOX_ACCESS_TOKEN };
export default mapboxgl;
