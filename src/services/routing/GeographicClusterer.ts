import { ServicePoint, LogisticGroup, DISTANCE_CONFIG } from './types';

/**
 * Gerencia o agrupamento geográfico de pontos de serviço
 */
export class GeographicClusterer {
  // Coordenadas do centro de referência (sede da empresa)
  private readonly REFERENCE_CENTER: [number, number] = [-48.5554, -27.5969]; // Florianópolis
  
  // Raios de distância para cada grupo logístico (em km)
  private readonly GROUP_A_RADIUS = 10; // Até 10km do centro
  private readonly GROUP_B_RADIUS = 25; // Entre 10km e 25km do centro
  // Grupo C: Acima de 25km do centro
  
  /**
   * Agrupa pontos de serviço por proximidade geográfica
   * @param servicePoints Array de pontos de serviço
   * @param maxClusterRadius Raio máximo do cluster em km (opcional)
   * @returns Array de clusters, cada um contendo pontos de serviço
   */
  clusterServicePoints(
    servicePoints: ServicePoint[], 
    maxClusterRadius: number = DISTANCE_CONFIG.MAX_CLUSTER_RADIUS
  ): ServicePoint[][] {
    if (servicePoints.length === 0) return [];
    
    // Para uma implementação simples, vamos agrupar por grupo logístico
    const groupA: ServicePoint[] = [];
    const groupB: ServicePoint[] = [];
    const groupC: ServicePoint[] = [];
    
    // Classificar pontos nos grupos
    for (const point of servicePoints) {
      const group = this.identifyLogisticGroup(point.coordinates);
      
      switch (group) {
        case 'A':
          groupA.push(point);
          break;
        case 'B':
          groupB.push(point);
          break;
        case 'C':
          groupC.push(point);
          break;
      }
    }
    
    // Retornar clusters não vazios
    const clusters: ServicePoint[][] = [];
    if (groupA.length > 0) clusters.push(groupA);
    if (groupB.length > 0) clusters.push(groupB);
    if (groupC.length > 0) clusters.push(groupC);
    
    return clusters;
  }
  
  /**
   * Identifica a qual grupo logístico pertence um ponto com base nas coordenadas
   * @param coordinates Coordenadas [longitude, latitude]
   * @returns Grupo logístico (A, B ou C)
   */
  identifyLogisticGroup(coordinates: [number, number]): LogisticGroup {
    const distance = this.calculateDistance(this.REFERENCE_CENTER, coordinates);
    
    if (distance <= this.GROUP_A_RADIUS) {
      return 'A';
    } else if (distance <= this.GROUP_B_RADIUS) {
      return 'B';
    } else {
      return 'C';
    }
  }
  
  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * @param point1 Coordenadas do ponto 1 [longitude, latitude]
   * @param point2 Coordenadas do ponto 2 [longitude, latitude]
   * @returns Distância em quilômetros
   */
  calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distância em km
    
    return distance;
  }
  
  /**
   * Converte graus para radianos
   * @param deg Ângulo em graus
   * @returns Ângulo em radianos
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}
