import { supabase } from '@/integrations/supabase/client';
import { AgendamentoAI } from '@/services/agendamentos';
import { mapboxService } from '@/services/maps/mapboxService';
import { format } from 'date-fns';

export interface OptimizedRoute {
  id: string;
  sequence: AgendamentoAI[];
  totalDistance: number;
  totalTime: number;
  logisticsGroup: 'A' | 'B' | 'C';
  suggestedTechnicianId?: string;
  estimatedStartTime: string;
  estimatedEndTime: string;
  waypoints: Array<{
    id: string;
    name: string;
    address: string;
    coordinates: [number, number];
    estimatedArrival: string;
    serviceTime: number;
    isUrgent: boolean;
  }>;
}

export interface RoutingResult {
  routes: OptimizedRoute[];
  totalAgendamentos: number;
  totalDistance: number;
  totalTime: number;
  groupsProcessed: string[];
}

class UnifiedRoutingService {
  private readonly FLORIANOPOLIS_CENTER: [number, number] = [-48.5554, -27.5969];
  
  /**
   * Processa roteirização inteligente para uma lista de agendamentos
   */
  async processIntelligentRouting(
    agendamentos: AgendamentoAI[],
    selectedDate: string,
    logisticsGroup?: 'A' | 'B' | 'C' | 'all'
  ): Promise<RoutingResult> {
    try {
      console.log(`🚀 Iniciando roteirização inteligente para ${agendamentos.length} agendamentos`);
      
      // 1. Filtrar agendamentos pendentes
      const pendingAgendamentos = this.filterPendingAgendamentos(agendamentos, selectedDate, logisticsGroup);
      
      if (pendingAgendamentos.length === 0) {
        return {
          routes: [],
          totalAgendamentos: 0,
          totalDistance: 0,
          totalTime: 0,
          groupsProcessed: []
        };
      }

      // 2. Geocodificar endereços se necessário
      const geocodedAgendamentos = await this.geocodeAgendamentos(pendingAgendamentos);
      
      // 3. Agrupar por grupos logísticos
      const groupedAgendamentos = this.groupByLogistics(geocodedAgendamentos);
      
      // 4. Otimizar rotas para cada grupo
      const optimizedRoutes: OptimizedRoute[] = [];
      
      for (const [group, agendamentosGroup] of Object.entries(groupedAgendamentos)) {
        if (agendamentosGroup.length === 0) continue;
        
        console.log(`📍 Processando grupo ${group} com ${agendamentosGroup.length} agendamentos`);
        
        const route = await this.optimizeGroupRoute(
          group as 'A' | 'B' | 'C',
          agendamentosGroup,
          selectedDate
        );
        
        if (route) {
          optimizedRoutes.push(route);
        }
      }
      
      // 5. Calcular métricas totais
      const totalDistance = optimizedRoutes.reduce((sum, route) => sum + route.totalDistance, 0);
      const totalTime = optimizedRoutes.reduce((sum, route) => sum + route.totalTime, 0);
      
      console.log(`✅ Roteirização concluída: ${optimizedRoutes.length} rotas criadas`);
      
      return {
        routes: optimizedRoutes,
        totalAgendamentos: pendingAgendamentos.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTime,
        groupsProcessed: Object.keys(groupedAgendamentos).filter(group => groupedAgendamentos[group].length > 0)
      };
      
    } catch (error) {
      console.error('❌ Erro na roteirização inteligente:', error);
      throw error;
    }
  }

  /**
   * Filtra agendamentos pendentes para processamento
   */
  private filterPendingAgendamentos(
    agendamentos: AgendamentoAI[],
    selectedDate: string,
    logisticsGroup?: 'A' | 'B' | 'C' | 'all'
  ): AgendamentoAI[] {
    return agendamentos.filter(ag => {
      // Filtro por data
      const isDateMatch = !selectedDate || ag.data_preferida === selectedDate;
      
      // Filtro por status (pendentes)
      const isPending = ag.status === 'pendente' || !ag.data_agendada;
      
      // Filtro por grupo logístico
      const isGroupMatch = !logisticsGroup || 
                          logisticsGroup === 'all' || 
                          ag.grupo_logistico === logisticsGroup;
      
      return isDateMatch && isPending && isGroupMatch;
    });
  }

  /**
   * Geocodifica endereços dos agendamentos
   */
  private async geocodeAgendamentos(agendamentos: AgendamentoAI[]): Promise<AgendamentoAI[]> {
    const results = [];
    
    for (const agendamento of agendamentos) {
      try {
        if (!agendamento.coordenadas && agendamento.endereco) {
          console.log(`🗺️ Geocodificando: ${agendamento.endereco}`);
          
          const coords = await mapboxService.geocode(agendamento.endereco);
          if (coords) {
            agendamento.coordenadas = [coords.lng, coords.lat];
            
            // Salvar coordenadas no banco para cache
            await this.saveCoordenadas(agendamento.id, coords.lng, coords.lat);
          }
        }
        results.push(agendamento);
      } catch (error) {
        console.error(`❌ Erro ao geocodificar ${agendamento.endereco}:`, error);
        results.push(agendamento); // Incluir mesmo sem coordenadas
      }
    }
    
    return results;
  }

  /**
   * Salva coordenadas no banco de dados
   */
  private async saveCoordenadas(agendamentoId: number, lng: number, lat: number): Promise<void> {
    try {
      await supabase
        .from('agendamentos_ai')
        .update({ coordenadas: [lng, lat] })
        .eq('id', agendamentoId);
    } catch (error) {
      console.error('Erro ao salvar coordenadas:', error);
    }
  }

  /**
   * Agrupa agendamentos por grupos logísticos
   */
  private groupByLogistics(agendamentos: AgendamentoAI[]): Record<'A' | 'B' | 'C', AgendamentoAI[]> {
    const groups: Record<'A' | 'B' | 'C', AgendamentoAI[]> = {
      'A': [],
      'B': [],
      'C': []
    };

    agendamentos.forEach(ag => {
      const group = this.determineLogisticsGroup(ag);
      groups[group].push(ag);
    });

    return groups;
  }

  /**
   * Determina o grupo logístico baseado na localização
   */
  private determineLogisticsGroup(agendamento: AgendamentoAI): 'A' | 'B' | 'C' {
    // Se já tem grupo definido, usar
    if (agendamento.grupo_logistico) {
      return agendamento.grupo_logistico as 'A' | 'B' | 'C';
    }

    // Calcular baseado em coordenadas
    if (agendamento.coordenadas) {
      const [lng, lat] = agendamento.coordenadas;
      const distance = this.calculateDistance(this.FLORIANOPOLIS_CENTER, [lng, lat]);
      
      if (distance <= 10) return 'A';  // Até 10km
      if (distance <= 25) return 'B';  // 10-25km
      return 'C';                      // +25km
    }

    // Fallback baseado em CEP
    if (agendamento.endereco) {
      const cep = this.extractCEP(agendamento.endereco);
      if (cep) {
        return this.determineGroupByCEP(cep);
      }
    }

    return 'B'; // Padrão
  }

  /**
   * Extrai CEP do endereço
   */
  private extractCEP(endereco: string): string | null {
    const cepMatch = endereco.match(/\d{5}-?\d{3}/);
    return cepMatch ? cepMatch[0].replace('-', '') : null;
  }

  /**
   * Determina grupo logístico baseado no CEP
   */
  private determineGroupByCEP(cep: string): 'A' | 'B' | 'C' {
    const cepPrefix = cep.substring(0, 5);
    
    // CEPs de Florianópolis (Grupo A)
    const grupoA = ['88000', '88010', '88015', '88020', '88025', '88030', '88035', '88040', '88045', '88050'];
    
    // CEPs da Grande Florianópolis (Grupo B)
    const grupoB = ['88100', '88110', '88115', '88130', '88135', '88140', '88160', '88070', '88075', '88080'];
    
    if (grupoA.includes(cepPrefix)) return 'A';
    if (grupoB.includes(cepPrefix)) return 'B';
    return 'C';
  }

  /**
   * Otimiza rota para um grupo específico
   */
  private async optimizeGroupRoute(
    group: 'A' | 'B' | 'C',
    agendamentos: AgendamentoAI[],
    selectedDate: string
  ): Promise<OptimizedRoute | null> {
    try {
      // 1. Ordenar por prioridade (urgentes primeiro)
      const sortedAgendamentos = [...agendamentos].sort((a, b) => {
        if (a.urgente && !b.urgente) return -1;
        if (!a.urgente && b.urgente) return 1;
        return 0;
      });

      // 2. Aplicar algoritmo de otimização (TSP simplificado)
      const optimizedSequence = this.optimizeSequence(sortedAgendamentos);
      
      // 3. Calcular métricas da rota
      const { totalDistance, totalTime } = this.calculateRouteMetrics(optimizedSequence);
      
      // 4. Calcular horários estimados
      const { startTime, endTime } = this.calculateTimeEstimates(totalTime);
      
      // 5. Criar waypoints detalhados
      const waypoints = this.createWaypoints(optimizedSequence, startTime);

      return {
        id: `route-${group}-${Date.now()}`,
        sequence: optimizedSequence,
        totalDistance,
        totalTime,
        logisticsGroup: group,
        estimatedStartTime: startTime,
        estimatedEndTime: endTime,
        waypoints
      };
      
    } catch (error) {
      console.error(`❌ Erro ao otimizar rota do grupo ${group}:`, error);
      return null;
    }
  }

  /**
   * Algoritmo de otimização de sequência (TSP simplificado)
   */
  private optimizeSequence(agendamentos: AgendamentoAI[]): AgendamentoAI[] {
    if (agendamentos.length <= 2) return agendamentos;

    // Algoritmo do vizinho mais próximo
    const unvisited = [...agendamentos];
    const route = [];
    
    // Começar com o mais urgente ou primeiro
    let current = unvisited.find(ag => ag.urgente) || unvisited[0];
    route.push(current);
    unvisited.splice(unvisited.indexOf(current), 1);

    // Encontrar o próximo mais próximo
    while (unvisited.length > 0) {
      let nearest = unvisited[0];
      let minDistance = Infinity;

      for (const candidate of unvisited) {
        if (current.coordenadas && candidate.coordenadas) {
          const distance = this.calculateDistance(current.coordenadas, candidate.coordenadas);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = candidate;
          }
        }
      }

      route.push(nearest);
      unvisited.splice(unvisited.indexOf(nearest), 1);
      current = nearest;
    }

    return route;
  }

  /**
   * Calcula métricas da rota
   */
  private calculateRouteMetrics(sequence: AgendamentoAI[]) {
    let totalDistance = 0;
    let totalTime = 0;

    // Tempo de serviço por agendamento
    totalTime = sequence.length * 45; // 45 min por atendimento

    // Calcular distância total
    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const next = sequence[i + 1];
      
      if (current.coordenadas && next.coordenadas) {
        const distance = this.calculateDistance(current.coordenadas, next.coordenadas);
        totalDistance += distance;
        totalTime += Math.ceil(distance / 30 * 60); // 30 km/h
      }
    }

    return { 
      totalDistance: Math.round(totalDistance * 100) / 100, 
      totalTime: Math.round(totalTime) 
    };
  }

  /**
   * Calcula estimativas de horário
   */
  private calculateTimeEstimates(totalTimeMinutes: number) {
    const startHour = 8; // 8:00
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    
    const endTotalMinutes = startHour * 60 + totalTimeMinutes;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    return { startTime, endTime };
  }

  /**
   * Cria waypoints detalhados
   */
  private createWaypoints(sequence: AgendamentoAI[], startTime: string) {
    const waypoints = [];
    let currentTime = this.parseTime(startTime);

    for (let i = 0; i < sequence.length; i++) {
      const agendamento = sequence[i];
      
      waypoints.push({
        id: agendamento.id.toString(),
        name: agendamento.nome,
        address: agendamento.endereco,
        coordinates: agendamento.coordenadas || [0, 0] as [number, number],
        estimatedArrival: this.formatTime(currentTime),
        serviceTime: 45, // 45 minutos por atendimento
        isUrgent: agendamento.urgente || false
      });

      // Adicionar tempo de serviço + deslocamento
      currentTime += 45; // Tempo de serviço
      
      if (i < sequence.length - 1) {
        const current = sequence[i];
        const next = sequence[i + 1];
        
        if (current.coordenadas && next.coordenadas) {
          const distance = this.calculateDistance(current.coordenadas, next.coordenadas);
          const travelTime = Math.ceil(distance / 30 * 60); // 30 km/h
          currentTime += travelTime;
        }
      }
    }

    return waypoints;
  }

  /**
   * Calcula distância usando fórmula de Haversine
   */
  private calculateDistance(point1: number[], point2: number[]): number {
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
   * Converte string de tempo para minutos
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Formata minutos para string de tempo
   */
  private formatTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Salva rota otimizada no banco de dados
   */
  async saveOptimizedRoute(route: OptimizedRoute, technicianId?: string): Promise<boolean> {
    try {
      const routeData = {
        name: `Rota Grupo ${route.logisticsGroup} - ${format(new Date(), 'dd/MM/yyyy')}`,
        waypoints: route.waypoints,
        route_data: {
          sequence: route.sequence.map(ag => ag.id),
          totalDistance: route.totalDistance,
          totalTime: route.totalTime,
          logisticsGroup: route.logisticsGroup
        },
        technician_id: technicianId,
        scheduled_date: new Date().toISOString().split('T')[0],
        logistics_group: route.logisticsGroup
      };

      const { error } = await supabase
        .from('routes')
        .insert(routeData);

      if (error) throw error;

      console.log('✅ Rota salva no banco de dados');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar rota:', error);
      return false;
    }
  }
}

export const unifiedRoutingService = new UnifiedRoutingService();
