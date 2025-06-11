/**
 * Serviço para otimização de rotas diárias no calendário de roteamento
 * Reorganiza pré-agendamentos considerando ordens de serviço fixas como âncoras
 */

import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// Tipos para otimização diária
export interface DailyServicePoint {
  id: string;
  type: 'service_order' | 'pre_schedule';
  clientName: string;
  address: string;
  coordinates?: [number, number]; // [longitude, latitude]
  scheduledTime: string; // HH:MM format
  isFixed: boolean; // true para OS (não podem ser movidas)
  duration: number; // duração em minutos
  originalData: any; // dados originais do agendamento/OS
}

export interface DailyOptimizationResult {
  optimizedSchedule: DailyServicePoint[];
  totalDistance: number;
  totalTime: number;
  distanceReduction: number;
  timeReduction: number;
  changes: {
    moved: DailyServicePoint[];
    kept: DailyServicePoint[];
  };
}

export class DailyRouteOptimizer {
  // Centro de referência (sede da empresa em Florianópolis)
  private readonly REFERENCE_CENTER: [number, number] = [-48.5554, -27.5969];

  /**
   * Otimiza a rota de um dia específico
   */
  async optimizeDailyRoute(
    date: Date,
    technicianId: string,
    serviceOrders: any[],
    preSchedules: any[]
  ): Promise<DailyOptimizationResult> {
    console.log(`🔄 DailyRouteOptimizer: Otimizando rota para ${format(date, 'yyyy-MM-dd')}`);

    // 1. Converter dados para pontos de serviço
    const servicePoints = await this.convertToServicePoints(serviceOrders, preSchedules);
    console.log(`📍 DailyRouteOptimizer: ${servicePoints.length} pontos de serviço identificados`);

    // 2. Separar pontos fixos (OS) e móveis (pré-agendamentos)
    const fixedPoints = servicePoints.filter(p => p.isFixed);
    const movablePoints = servicePoints.filter(p => !p.isFixed);

    console.log(`🔒 Pontos fixos (OS): ${fixedPoints.length}`);
    console.log(`🔄 Pontos móveis (pré-agendamentos): ${movablePoints.length}`);

    // 3. Calcular rota atual
    const currentRoute = [...servicePoints].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const currentDistance = this.calculateTotalDistance(currentRoute);
    const currentTime = this.calculateTotalTime(currentRoute);

    // 4. Otimizar apenas os pontos móveis
    const optimizedRoute = await this.optimizeMovablePoints(fixedPoints, movablePoints);

    // 5. Calcular métricas da rota otimizada
    const optimizedDistance = this.calculateTotalDistance(optimizedRoute);
    const optimizedTime = this.calculateTotalTime(optimizedRoute);

    // 6. Identificar mudanças
    const changes = this.identifyChanges(currentRoute, optimizedRoute);

    return {
      optimizedSchedule: optimizedRoute,
      totalDistance: optimizedDistance,
      totalTime: optimizedTime,
      distanceReduction: currentDistance - optimizedDistance,
      timeReduction: currentTime - optimizedTime,
      changes
    };
  }

  /**
   * Converte ordens de serviço e pré-agendamentos para pontos de serviço
   */
  private async convertToServicePoints(
    serviceOrders: any[],
    preSchedules: any[]
  ): Promise<DailyServicePoint[]> {
    const points: DailyServicePoint[] = [];

    console.log(`🔄 Convertendo ${serviceOrders.length} OS e ${preSchedules.length} pré-agendamentos`);

    // Processar ordens de serviço (pontos fixos)
    for (const order of serviceOrders) {
      const coordinates = await this.getCoordinatesFromAddress(order.client_address || '');

      // Extrair hora da scheduled_date
      const timeMatch = order.scheduled_date?.match(/T(\d{2}):(\d{2})/);
      const scheduledTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '08:00';

      const point: DailyServicePoint = {
        id: order.id,
        type: 'service_order',
        clientName: order.client_name,
        address: order.client_address || '',
        coordinates,
        scheduledTime,
        isFixed: true, // OS não podem ser movidas
        duration: 45, // duração padrão
        originalData: order
      };

      points.push(point);
      console.log(`🔒 OS: ${point.clientName} às ${point.scheduledTime} (fixo)`);
    }

    // Processar pré-agendamentos (pontos móveis)
    for (const schedule of preSchedules) {
      const coordinates = await this.getCoordinatesFromAddress(schedule.endereco || '');

      const point: DailyServicePoint = {
        id: schedule.id.toString(),
        type: 'pre_schedule',
        clientName: schedule.nome,
        address: schedule.endereco || '',
        coordinates,
        scheduledTime: schedule.scheduledTime || '08:00',
        isFixed: false, // Pré-agendamentos podem ser movidos
        duration: 45, // duração padrão
        originalData: schedule
      };

      points.push(point);
      console.log(`🔄 Pré-agendamento: ${point.clientName} às ${point.scheduledTime} (móvel)`);
    }

    console.log(`✅ Total de ${points.length} pontos convertidos`);
    return points;
  }

  /**
   * Otimiza apenas os pontos móveis considerando os fixos como âncoras
   */
  private async optimizeMovablePoints(
    fixedPoints: DailyServicePoint[],
    movablePoints: DailyServicePoint[]
  ): Promise<DailyServicePoint[]> {
    if (movablePoints.length === 0) {
      return [...fixedPoints].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }

    // Criar lista de horários disponíveis (excluindo os ocupados por OS)
    const occupiedTimes = new Set(fixedPoints.map(p => p.scheduledTime));
    const availableTimes = this.generateAvailableTimeSlots(occupiedTimes);

    console.log(`⏰ Horários disponíveis: ${availableTimes.length}`);
    console.log(`🔒 Horários ocupados por OS: ${Array.from(occupiedTimes).join(', ')}`);

    // Se não há pontos fixos, usar algoritmo simples de nearest neighbor
    if (fixedPoints.length === 0) {
      return this.optimizeWithNearestNeighbor(movablePoints, availableTimes);
    }

    // Otimizar considerando pontos fixos como âncoras
    return this.optimizeWithFixedAnchors(fixedPoints, movablePoints, availableTimes);
  }

  /**
   * Otimização usando algoritmo nearest neighbor simples
   */
  private optimizeWithNearestNeighbor(
    points: DailyServicePoint[],
    availableTimes: string[]
  ): DailyServicePoint[] {
    if (points.length === 0) return [];

    console.log(`🔄 Otimizando ${points.length} pontos com nearest neighbor`);

    // Encontrar ponto de partida (mais próximo do centro ou primeiro geograficamente)
    let startIndex = 0;
    let minDistanceFromCenter = Infinity;

    for (let i = 0; i < points.length; i++) {
      const distance = this.calculateDistance(
        this.REFERENCE_CENTER,
        points[i].coordinates || this.REFERENCE_CENTER
      );
      if (distance < minDistanceFromCenter) {
        minDistanceFromCenter = distance;
        startIndex = i;
      }
    }

    const optimized: DailyServicePoint[] = [];
    const remaining = [...points];
    let currentPoint = remaining.splice(startIndex, 1)[0];

    // Atribuir primeiro horário disponível
    currentPoint.scheduledTime = availableTimes[0];
    optimized.push(currentPoint);
    console.log(`📍 Ponto inicial: ${currentPoint.clientName} às ${currentPoint.scheduledTime}`);

    let timeIndex = 1;

    // Para cada ponto restante, encontrar o mais próximo
    while (remaining.length > 0 && timeIndex < availableTimes.length) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      // Encontrar o ponto mais próximo do atual
      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDistance(
          currentPoint.coordinates || this.REFERENCE_CENTER,
          remaining[i].coordinates || this.REFERENCE_CENTER
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      // Mover o ponto mais próximo para a rota otimizada
      currentPoint = remaining.splice(nearestIndex, 1)[0];
      currentPoint.scheduledTime = availableTimes[timeIndex];
      optimized.push(currentPoint);
      console.log(`📍 Próximo ponto: ${currentPoint.clientName} às ${currentPoint.scheduledTime} (${minDistance.toFixed(1)}km)`);
      timeIndex++;
    }

    return optimized;
  }

  /**
   * Otimização considerando pontos fixos como âncoras
   */
  private optimizeWithFixedAnchors(
    fixedPoints: DailyServicePoint[],
    movablePoints: DailyServicePoint[],
    availableTimes: string[]
  ): DailyServicePoint[] {
    const result: DailyServicePoint[] = [...fixedPoints];
    
    // Para cada horário disponível, encontrar o melhor pré-agendamento
    for (let i = 0; i < availableTimes.length && movablePoints.length > 0; i++) {
      const timeSlot = availableTimes[i];
      
      // Encontrar pontos fixos antes e depois deste horário
      const beforePoint = this.findNearestFixedPoint(timeSlot, fixedPoints, 'before');
      const afterPoint = this.findNearestFixedPoint(timeSlot, fixedPoints, 'after');

      // Encontrar o melhor pré-agendamento para este slot
      const bestPointIndex = this.findBestPointForSlot(
        timeSlot,
        movablePoints,
        beforePoint,
        afterPoint
      );

      if (bestPointIndex !== -1) {
        const selectedPoint = movablePoints.splice(bestPointIndex, 1)[0];
        selectedPoint.scheduledTime = timeSlot;
        result.push(selectedPoint);
      }
    }

    // Ordenar por horário
    return result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }

  /**
   * Encontra o ponto fixo mais próximo de um horário
   */
  private findNearestFixedPoint(
    timeSlot: string,
    fixedPoints: DailyServicePoint[],
    direction: 'before' | 'after'
  ): DailyServicePoint | null {
    const filtered = fixedPoints.filter(p => 
      direction === 'before' 
        ? p.scheduledTime < timeSlot 
        : p.scheduledTime > timeSlot
    );

    if (filtered.length === 0) return null;

    return filtered.reduce((closest, current) => {
      const closestDiff = Math.abs(this.timeToMinutes(closest.scheduledTime) - this.timeToMinutes(timeSlot));
      const currentDiff = Math.abs(this.timeToMinutes(current.scheduledTime) - this.timeToMinutes(timeSlot));
      return currentDiff < closestDiff ? current : closest;
    });
  }

  /**
   * Encontra o melhor pré-agendamento para um slot específico
   */
  private findBestPointForSlot(
    timeSlot: string,
    movablePoints: DailyServicePoint[],
    beforePoint: DailyServicePoint | null,
    afterPoint: DailyServicePoint | null
  ): number {
    if (movablePoints.length === 0) return -1;

    let bestIndex = 0;
    let minTotalDistance = Infinity;

    for (let i = 0; i < movablePoints.length; i++) {
      const point = movablePoints[i];
      let totalDistance = 0;

      // Calcular distância do ponto anterior
      if (beforePoint) {
        totalDistance += this.calculateDistance(
          beforePoint.coordinates || this.REFERENCE_CENTER,
          point.coordinates || this.REFERENCE_CENTER
        );
      }

      // Calcular distância para o próximo ponto
      if (afterPoint) {
        totalDistance += this.calculateDistance(
          point.coordinates || this.REFERENCE_CENTER,
          afterPoint.coordinates || this.REFERENCE_CENTER
        );
      }

      if (totalDistance < minTotalDistance) {
        minTotalDistance = totalDistance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Gera lista de horários disponíveis
   */
  private generateAvailableTimeSlots(occupiedTimes: Set<string>): string[] {
    const slots: string[] = [];
    
    // Gerar slots de 6:00 às 18:00, excluindo 12:00 (almoço)
    for (let hour = 6; hour <= 18; hour++) {
      if (hour === 12) continue; // Pular horário de almoço
      
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      if (!occupiedTimes.has(timeSlot)) {
        slots.push(timeSlot);
      }
    }

    return slots;
  }

  /**
   * Calcula distância entre dois pontos usando fórmula de Haversine
   */
  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calcula distância total de uma rota
   */
  private calculateTotalDistance(route: DailyServicePoint[]): number {
    if (route.length <= 1) return 0;

    let totalDistance = 0;
    const sortedRoute = [...route].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    for (let i = 0; i < sortedRoute.length - 1; i++) {
      const from = sortedRoute[i].coordinates || this.REFERENCE_CENTER;
      const to = sortedRoute[i + 1].coordinates || this.REFERENCE_CENTER;
      totalDistance += this.calculateDistance(from, to);
    }

    return totalDistance;
  }

  /**
   * Calcula tempo total de uma rota
   */
  private calculateTotalTime(route: DailyServicePoint[]): number {
    if (route.length === 0) return 0;

    let totalTime = 0;
    const sortedRoute = [...route].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // Somar tempo de serviço
    totalTime += sortedRoute.reduce((sum, point) => sum + point.duration, 0);

    // Somar tempo de deslocamento (assumindo 30 km/h)
    const totalDistance = this.calculateTotalDistance(route);
    totalTime += (totalDistance / 30) * 60; // Converter para minutos

    return totalTime;
  }

  /**
   * Identifica mudanças entre rota atual e otimizada
   */
  private identifyChanges(
    currentRoute: DailyServicePoint[],
    optimizedRoute: DailyServicePoint[]
  ): { moved: DailyServicePoint[]; kept: DailyServicePoint[] } {
    const moved: DailyServicePoint[] = [];
    const kept: DailyServicePoint[] = [];

    console.log(`🔍 Identificando mudanças:`);
    console.log(`📋 Rota atual: ${currentRoute.map(p => `${p.clientName}@${p.scheduledTime}`).join(', ')}`);
    console.log(`📋 Rota otimizada: ${optimizedRoute.map(p => `${p.clientName}@${p.scheduledTime}`).join(', ')}`);

    for (const optimizedPoint of optimizedRoute) {
      // Apenas considerar pré-agendamentos (pontos móveis) para mudanças
      if (optimizedPoint.type === 'pre_schedule') {
        const currentPoint = currentRoute.find(p => p.id === optimizedPoint.id);

        if (currentPoint && currentPoint.scheduledTime !== optimizedPoint.scheduledTime) {
          console.log(`🔄 Movido: ${optimizedPoint.clientName} de ${currentPoint.scheduledTime} para ${optimizedPoint.scheduledTime}`);
          moved.push(optimizedPoint);
        } else {
          kept.push(optimizedPoint);
        }
      } else {
        // Ordens de serviço sempre ficam no lugar
        kept.push(optimizedPoint);
      }
    }

    console.log(`📊 Resultado: ${moved.length} movidos, ${kept.length} mantidos`);
    return { moved, kept };
  }

  /**
   * Converte horário para minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Obtém coordenadas de um endereço (mock - pode ser integrado com geocoding)
   */
  private async getCoordinatesFromAddress(address: string): Promise<[number, number] | undefined> {
    // Por enquanto, retornar coordenadas aleatórias próximas ao centro de Florianópolis
    // Em produção, isso seria integrado com um serviço de geocoding
    if (!address) return undefined;

    // Gerar coordenadas aleatórias em um raio de ~10km do centro
    const lat = -27.5969 + (Math.random() - 0.5) * 0.2;
    const lng = -48.5554 + (Math.random() - 0.5) * 0.2;
    
    return [lng, lat];
  }
}

// Instância singleton
export const dailyRouteOptimizer = new DailyRouteOptimizer();
