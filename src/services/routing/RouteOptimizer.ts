import {
  ServicePoint,
  RouteSegment,
  TimeSlot,
  RouteOptimizationResult,
  DISTANCE_CONFIG,
  TIME_WINDOWS
} from './types';
import { AvailabilityManager } from './AvailabilityManager';
import { GeographicClusterer } from './GeographicClusterer';
import { addMinutes, differenceInMinutes, isBefore } from 'date-fns';

/**
 * Otimiza rotas considerando agendamentos confirmados e pré-agendamentos
 */
export class RouteOptimizer {
  private availabilityManager: AvailabilityManager;
  private geographicClusterer: GeographicClusterer;

  constructor() {
    this.availabilityManager = new AvailabilityManager();
    this.geographicClusterer = new GeographicClusterer();
  }

  /**
   * Calcula a rota otimizada considerando pontos confirmados e pré-agendamentos
   * @param date Data para calcular a rota
   * @param confirmedServices Serviços já confirmados
   * @param preAppointments Pré-agendamentos a serem roteirizados
   * @returns Resultado da otimização de rota
   */
  async calculateOptimalRoute(
    date: Date,
    confirmedServices: ServicePoint[],
    preAppointments: ServicePoint[]
  ): Promise<RouteOptimizationResult> {
    // 1. Obter slots disponíveis
    const availableTimeSlots = await this.availabilityManager.getAvailableTimeSlots(date);

    // 2. Calcular matriz de distâncias entre todos os pontos
    const allPoints = [...confirmedServices, ...preAppointments];
    const distanceMatrix = this.calculateDistanceMatrix(allPoints);

    // 3. Ordenar pontos confirmados por horário
    const sortedConfirmedServices = [...confirmedServices].sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });

    // 4. Ordenar pré-agendamentos por prioridade
    const sortedPreAppointments = [...preAppointments].sort((a, b) =>
      b.priority - a.priority
    );

    // 5. Inicializar resultado
    const result: RouteOptimizationResult = {
      suggestedRoute: [...sortedConfirmedServices],
      timeSlotSuggestions: new Map(),
      totalDistance: 0,
      totalTime: 0
    };

    // 6. Para cada pré-agendamento, encontrar o melhor ponto de inserção
    for (const preAppointment of sortedPreAppointments) {
      const bestInsertion = this.findBestInsertion(
        preAppointment,
        result.suggestedRoute,
        distanceMatrix,
        availableTimeSlots,
        date
      );

      if (bestInsertion) {
        // Inserir no ponto ótimo
        result.suggestedRoute.splice(bestInsertion.insertionIndex, 0, preAppointment);

        // Atualizar distância e tempo total
        result.totalDistance += bestInsertion.additionalDistance;
        result.totalTime += bestInsertion.additionalTime;

        // Armazenar sugestões de slots
        result.timeSlotSuggestions.set(preAppointment.id, bestInsertion.possibleTimeSlots);
      }
    }

    // 7. Calcular distância e tempo total da rota
    result.totalDistance = this.calculateTotalDistance(result.suggestedRoute, distanceMatrix);
    result.totalTime = this.calculateTotalTime(result.suggestedRoute, distanceMatrix);

    return result;
  }

  /**
   * Encontra o melhor ponto de inserção para um pré-agendamento
   * @param preAppointment Pré-agendamento a ser inserido
   * @param currentRoute Rota atual
   * @param distanceMatrix Matriz de distâncias
   * @param availableTimeSlots Slots de tempo disponíveis
   * @param date Data de referência
   * @returns Melhor ponto de inserção ou null se não for possível inserir
   */
  private findBestInsertion(
    preAppointment: ServicePoint,
    currentRoute: ServicePoint[],
    distanceMatrix: number[][],
    availableTimeSlots: TimeSlot[],
    date: Date
  ): {
    insertionIndex: number,
    additionalDistance: number,
    additionalTime: number,
    possibleTimeSlots: TimeSlot[]
  } | null {
    if (currentRoute.length === 0) {
      // Se a rota estiver vazia, inserir como primeiro ponto
      return {
        insertionIndex: 0,
        additionalDistance: 0,
        additionalTime: preAppointment.serviceTime,
        possibleTimeSlots: availableTimeSlots
      };
    }

    let bestInsertionIndex = -1;
    let minAdditionalDistance = Infinity;
    let additionalTime = 0;
    let possibleTimeSlots: TimeSlot[] = [];

    // Testar inserção em cada posição da rota
    for (let i = 0; i <= currentRoute.length; i++) {
      // Calcular distância adicional se inserir neste ponto
      let addDistance = 0;

      // Índice do novo ponto na matriz de distâncias
      const newPointIndex = currentRoute.length;

      try {
        if (i === 0) {
          // Inserir no início
          // Se houver apenas um ponto na rota atual
          if (currentRoute.length === 1) {
            addDistance = this.geographicClusterer.calculateDistance(
              preAppointment.coordinates,
              currentRoute[0].coordinates
            );
          } else {
            // Se houver mais pontos, calcular a diferença na distância total
            addDistance = 0;
          }
        } else if (i === currentRoute.length) {
          // Inserir no final
          if (currentRoute.length > 0) {
            addDistance = this.geographicClusterer.calculateDistance(
              currentRoute[currentRoute.length - 1].coordinates,
              preAppointment.coordinates
            );
          } else {
            addDistance = 0;
          }
        } else {
          // Inserir no meio
          if (i > 0 && i < currentRoute.length) {
            // Calcular a distância adicional se inserir entre dois pontos existentes
            const distBefore = this.geographicClusterer.calculateDistance(
              currentRoute[i - 1].coordinates,
              preAppointment.coordinates
            );

            const distAfter = this.geographicClusterer.calculateDistance(
              preAppointment.coordinates,
              currentRoute[i].coordinates
            );

            const distOriginal = this.geographicClusterer.calculateDistance(
              currentRoute[i - 1].coordinates,
              currentRoute[i].coordinates
            );

            addDistance = distBefore + distAfter - distOriginal;
          } else {
            addDistance = 0;
          }
        }
      } catch (error) {
        console.error('Erro ao calcular distância adicional:', error);
        addDistance = 0;
      }

      // Verificar se esta inserção é melhor que a anterior
      if (addDistance < minAdditionalDistance) {
        // Verificar se há slots de tempo viáveis para esta inserção
        const viableTimeSlots = this.findViableTimeSlots(
          preAppointment,
          currentRoute,
          i,
          availableTimeSlots,
          date,
          distanceMatrix
        );

        if (viableTimeSlots.length > 0) {
          bestInsertionIndex = i;
          minAdditionalDistance = addDistance;
          additionalTime = preAppointment.serviceTime +
                          this.estimateTravelTime(addDistance);
          possibleTimeSlots = viableTimeSlots;
        }
      }
    }

    if (bestInsertionIndex === -1) {
      return null; // Não foi possível encontrar um ponto de inserção viável
    }

    return {
      insertionIndex: bestInsertionIndex,
      additionalDistance: minAdditionalDistance,
      additionalTime: additionalTime,
      possibleTimeSlots
    };
  }

  /**
   * Encontra slots de tempo viáveis para inserção de um pré-agendamento
   * @param preAppointment Pré-agendamento a ser inserido
   * @param currentRoute Rota atual
   * @param insertionIndex Índice de inserção
   * @param availableTimeSlots Slots de tempo disponíveis
   * @param date Data de referência
   * @param distanceMatrix Matriz de distâncias
   * @returns Array de slots de tempo viáveis
   */
  private findViableTimeSlots(
    preAppointment: ServicePoint,
    currentRoute: ServicePoint[],
    insertionIndex: number,
    availableTimeSlots: TimeSlot[],
    date: Date,
    distanceMatrix: number[][]
  ): TimeSlot[] {
    const viableTimeSlots: TimeSlot[] = [];

    // Verificar cada slot disponível
    for (const slot of availableTimeSlots) {
      // Verificar se o serviço cabe no slot
      if (differenceInMinutes(slot.end, slot.start) < preAppointment.serviceTime) {
        continue;
      }

      // Verificar restrições de tempo com base nos pontos adjacentes
      let isViable = true;

      try {
        // Verificar restrições com o ponto anterior
        if (insertionIndex > 0 && currentRoute.length > 0) {
          const prevPoint = currentRoute[insertionIndex - 1];
          if (prevPoint && prevPoint.scheduledTime) {
            const prevEndTime = addMinutes(prevPoint.scheduledTime, prevPoint.serviceTime);

            // Calcular tempo de viagem diretamente
            const travelTime = this.estimateTravelTime(
              this.geographicClusterer.calculateDistance(
                prevPoint.coordinates,
                preAppointment.coordinates
              )
            );

            const earliestPossibleStart = addMinutes(prevEndTime, travelTime);

            if (isBefore(slot.end, earliestPossibleStart)) {
              isViable = false;
            }
          }
        }

        // Verificar restrições com o próximo ponto
        if (insertionIndex < currentRoute.length && isViable && currentRoute.length > 0) {
          const nextPoint = currentRoute[insertionIndex];
          if (nextPoint && nextPoint.scheduledTime) {
            // Calcular tempo de viagem diretamente
            const travelTime = this.estimateTravelTime(
              this.geographicClusterer.calculateDistance(
                preAppointment.coordinates,
                nextPoint.coordinates
              )
            );

            const latestPossibleEnd = addMinutes(nextPoint.scheduledTime, -travelTime);

            if (isBefore(latestPossibleEnd, addMinutes(slot.start, preAppointment.serviceTime))) {
              isViable = false;
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar viabilidade do slot:', error);
        isViable = false;
      }

      if (isViable) {
        viableTimeSlots.push(slot);
      }
    }

    return viableTimeSlots;
  }

  /**
   * Calcula a matriz de distâncias entre todos os pontos
   * @param points Array de pontos de serviço
   * @returns Matriz de distâncias
   */
  private calculateDistanceMatrix(points: ServicePoint[]): number[][] {
    const n = points.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.geographicClusterer.calculateDistance(
            points[i].coordinates,
            points[j].coordinates
          );
        }
      }
    }

    return matrix;
  }

  /**
   * Calcula a distância total de uma rota
   * @param route Rota a ser calculada
   * @param distanceMatrix Matriz de distâncias
   * @returns Distância total em km
   */
  private calculateTotalDistance(route: ServicePoint[], distanceMatrix: number[][]): number {
    if (route.length <= 1) return 0;

    let totalDistance = 0;

    try {
      // Calcular distância diretamente usando as coordenadas
      for (let i = 0; i < route.length - 1; i++) {
        const fromPoint = route[i];
        const toPoint = route[i + 1];

        if (fromPoint && toPoint) {
          const distance = this.geographicClusterer.calculateDistance(
            fromPoint.coordinates,
            toPoint.coordinates
          );

          totalDistance += distance;
        }
      }
    } catch (error) {
      console.error('Erro ao calcular distância total:', error);
    }

    return totalDistance;
  }

  /**
   * Calcula o tempo total de uma rota
   * @param route Rota a ser calculada
   * @param distanceMatrix Matriz de distâncias
   * @returns Tempo total em minutos
   */
  private calculateTotalTime(route: ServicePoint[], distanceMatrix: number[][]): number {
    if (route.length === 0) return 0;

    let totalTime = 0;

    try {
      // Somar tempo de serviço de cada ponto
      for (const point of route) {
        if (point) {
          totalTime += point.serviceTime;
        }
      }

      // Somar tempo de deslocamento entre pontos
      for (let i = 0; i < route.length - 1; i++) {
        const fromPoint = route[i];
        const toPoint = route[i + 1];

        if (fromPoint && toPoint) {
          const distance = this.geographicClusterer.calculateDistance(
            fromPoint.coordinates,
            toPoint.coordinates
          );

          totalTime += this.estimateTravelTime(distance);
        }
      }
    } catch (error) {
      console.error('Erro ao calcular tempo total:', error);
    }

    return totalTime;
  }

  /**
   * Estima o tempo de deslocamento com base na distância
   * @param distance Distância em km
   * @returns Tempo estimado em minutos
   */
  private estimateTravelTime(distance: number): number {
    // Usando velocidade média de 30 km/h
    const hours = distance / DISTANCE_CONFIG.AVERAGE_SPEED;
    return Math.ceil(hours * 60); // Converter para minutos e arredondar para cima
  }
}
