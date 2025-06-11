import { AvailabilityManager } from './AvailabilityManager';
import { RouteOptimizer } from './RouteOptimizer';
import { GeographicClusterer } from './GeographicClusterer';
import { RoutingInterface } from './RoutingInterface';
import { ServicePoint, TimeSlot } from './types';
import { agendamentosService } from '../agendamentos';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * Orquestrador central do sistema de roteirização
 */
export class RoutingOrchestrator {
  private availabilityManager: AvailabilityManager;
  private routeOptimizer: RouteOptimizer;
  private geographicClusterer: GeographicClusterer;
  private routingInterface: RoutingInterface;

  constructor() {
    this.availabilityManager = new AvailabilityManager();
    this.routeOptimizer = new RouteOptimizer();
    this.geographicClusterer = new GeographicClusterer();
    this.routingInterface = new RoutingInterface();
  }

  /**
   * Inicializa o mapa de roteirização
   * @param container Elemento HTML que conterá o mapa
   * @returns Instância do mapa
   */
  initializeMap(container: HTMLElement): mapboxgl.Map {
    return this.routingInterface.initializeMap(container);
  }

  /**
   * Processa a roteirização para uma data específica
   * @param date Data para roteirização
   * @returns Resultado da roteirização com rota sugerida e outras informações
   */
  async processRouting(date: Date): Promise<Types.RoutingProcessResult | null> {
    try {
      console.log(`Iniciando roteirização para ${format(date, 'dd/MM/yyyy')}`);

      // 1. Buscar agendamentos confirmados
      const confirmedServices = await this.fetchConfirmedServices(date);
      console.log(`${confirmedServices.length} agendamentos confirmados encontrados`);

      // 2. Buscar pré-agendamentos
      const preAppointments = await this.fetchPreAppointments(date);
      console.log(`${preAppointments.length} pré-agendamentos encontrados`);

      // 3. Agrupar por proximidade geográfica
      const clusters = this.geographicClusterer.clusterServicePoints(
        [...confirmedServices, ...preAppointments],
        5 // km de raio máximo
      );
      console.log(`${clusters.length} clusters geográficos identificados`);

      // Variáveis para armazenar o resultado final
      let finalSuggestedRoute: ServicePoint[] = [];
      let finalTotalDistance = 0;
      let finalTotalTime = 0;

      // 4. Para cada cluster, calcular rota otimizada
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        console.log(`Processando cluster ${i + 1} com ${cluster.length} pontos`);

        const clusterConfirmed = cluster.filter(p => p.type === 'confirmado');
        const clusterPreAppointments = cluster.filter(p => p.type === 'pre-agendamento');

        // 5. Calcular rota otimizada para o cluster
        const { suggestedRoute, timeSlotSuggestions, totalDistance, totalTime } =
          await this.routeOptimizer.calculateOptimalRoute(
            date,
            clusterConfirmed,
            clusterPreAppointments
          );

        console.log(`Rota otimizada calculada: ${suggestedRoute.length} pontos, ${totalDistance.toFixed(2)}km, ${totalTime} minutos`);

        // Adicionar ao resultado final
        finalSuggestedRoute = [...finalSuggestedRoute, ...suggestedRoute];
        finalTotalDistance += totalDistance;
        finalTotalTime += totalTime;

        // 6. Renderizar mapa com sugestões
        this.routingInterface.renderRoutingMap(
          date,
          clusterConfirmed,
          clusterPreAppointments,
          suggestedRoute
        );

        // 7. Permitir interação do usuário para ajustes
        for (const [preAppointmentId, slots] of timeSlotSuggestions.entries()) {
          console.log(`Processando seleção de horário para pré-agendamento ${preAppointmentId}`);

          const selectedSlot = await this.routingInterface.handleTimeSlotSelection(
            preAppointmentId,
            slots
          );

          // 8. Confirmar agendamento com slot selecionado
          if (selectedSlot) {
            await this.confirmAppointment(preAppointmentId, selectedSlot);
            console.log(`Agendamento ${preAppointmentId} confirmado para ${format(selectedSlot.start, 'dd/MM/yyyy HH:mm')}`);
          } else {
            console.log(`Seleção de horário cancelada para ${preAppointmentId}`);
          }
        }
      }

      toast.success('Roteirização concluída com sucesso!');

      // Retornar resultado da roteirização
      return {
        suggestedRoute: finalSuggestedRoute,
        totalDistance: finalTotalDistance,
        totalTime: finalTotalTime,
        confirmedServices,
        preAppointments
      };
    } catch (error) {
      console.error('Erro ao processar roteirização:', error);
      toast.error('Erro ao processar roteirização');
      return null;
    }
  }

  /**
   * Busca agendamentos confirmados para uma data específica
   * @param date Data para buscar agendamentos
   * @returns Array de pontos de serviço confirmados
   */
  private async fetchConfirmedServices(date: Date): Promise<ServicePoint[]> {
    try {
      console.log(`Buscando agendamentos confirmados para ${format(date, 'dd/MM/yyyy')}`);

      // Buscar agendamentos do serviço
      const formattedDate = format(date, 'yyyy-MM-dd');
      const agendamentos = await agendamentosService.getAll();

      console.log(`Agendamentos carregados do Supabase:`, agendamentos);

      // Verificar se os dados estão corretos
      if (agendamentos.length > 0) {
        console.log(`Algum agendamento tem telefone?`, agendamentos.some(a => a.telefone));
        console.log(`Exemplo do primeiro agendamento:`, agendamentos[0]);
      }

      // Filtrar por data e status confirmado
      const confirmedAgendamentos = agendamentos.filter(agendamento => {
        if (agendamento.status !== 'confirmado' || !agendamento.data_agendada) return false;

        try {
          const agendamentoDate = format(new Date(agendamento.data_agendada), 'yyyy-MM-dd');
          return agendamentoDate === formattedDate;
        } catch (error) {
          console.error(`Erro ao processar data do agendamento:`, error);
          return false;
        }
      });

      // Usar dados mock para teste se não houver dados reais
      if (confirmedAgendamentos.length === 0) {
        // Criar alguns agendamentos confirmados para teste
        // Usar a data selecionada pelo usuário para os dados mock
        console.log(`Criando dados mock para a data ${format(date, 'dd/MM/yyyy')}`);

        const mockConfirmed = [
          {
            id: 101,
            nome: 'Cliente Confirmado 1',
            telefone: '(48) 99999-1111',
            endereco: 'Rua das Flores, 123 - Centro, Florianópolis',
            coordenadas: [-48.5494, -27.5969] as [number, number],
            data_criacao: new Date(date).toISOString(),
            data_agendada: new Date(date).toISOString(),
            status: 'confirmado' as const,
            urgente: false,
            tipo_servico: 'in-home' as const
          },
          {
            id: 102,
            nome: 'Cliente Confirmado 2',
            telefone: '(48) 99999-2222',
            endereco: 'Av. Beira Mar Norte, 1500 - Centro, Florianópolis',
            coordenadas: [-48.5454, -27.5869] as [number, number],
            data_criacao: new Date(date).toISOString(),
            data_agendada: new Date(date).toISOString(),
            status: 'confirmado' as const,
            urgente: true,
            tipo_servico: 'coleta' as const
          }
        ];

        console.log(`Usando ${mockConfirmed.length} agendamentos confirmados mock para teste`);

        // Converter para ServicePoint
        return mockConfirmed.map(agendamento => ({
          id: agendamento.id.toString(),
          coordinates: agendamento.coordenadas,
          address: agendamento.endereco,
          clientName: agendamento.nome,
          serviceTime: this.estimateServiceTime(agendamento),
          priority: agendamento.urgente ? 2 : 1,
          type: 'confirmado',
          scheduledTime: new Date(agendamento.data_agendada),
          serviceType: this.determineServiceType(agendamento),
          urgency: agendamento.urgente
        }));
      }

      // Converter para ServicePoint
      return confirmedAgendamentos.map(agendamento => ({
        id: agendamento.id.toString(),
        coordinates: agendamento.coordenadas || [-48.5554, -27.5969], // Coordenadas padrão se não disponíveis
        address: agendamento.endereco || '',
        clientName: agendamento.nome || '',
        serviceTime: this.estimateServiceTime(agendamento),
        priority: agendamento.urgente ? 2 : 1,
        type: 'confirmado',
        scheduledTime: agendamento.data_agendada ? new Date(agendamento.data_agendada) : undefined,
        serviceType: this.determineServiceType(agendamento),
        urgency: agendamento.urgente || false
      }));
    } catch (error) {
      console.error('Erro ao buscar agendamentos confirmados:', error);
      return [];
    }
  }

  /**
   * Busca pré-agendamentos para uma data específica
   * @param date Data para buscar pré-agendamentos
   * @returns Array de pontos de serviço pré-agendados
   */
  private async fetchPreAppointments(date: Date): Promise<ServicePoint[]> {
    try {
      console.log(`Buscando pré-agendamentos para ${format(date, 'dd/MM/yyyy')}`);

      // Buscar agendamentos do serviço
      const formattedDate = format(date, 'yyyy-MM-dd');
      const agendamentos = await agendamentosService.getAll();

      console.log(`Agendamentos carregados do Supabase:`, agendamentos);

      // Verificar se os dados estão corretos
      if (agendamentos.length > 0) {
        console.log(`Algum agendamento tem telefone?`, agendamentos.some(a => a.telefone));
        console.log(`Exemplo do primeiro agendamento:`, agendamentos[0]);
      }

      // Filtrar por data e status pendente ou roteirizado
      const preAppointments = agendamentos.filter(agendamento => {
        if (!['pendente', 'roteirizado'].includes(agendamento.status || '')) return false;

        try {
          // Se não tiver data_criacao, usar a data atual
          const agendamentoDate = agendamento.created_at
            ? format(new Date(agendamento.created_at), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd');

          return agendamentoDate === formattedDate;
        } catch (error) {
          console.error(`Erro ao processar data do agendamento:`, error);
          return false;
        }
      });

      // Usar dados mock para teste se não houver dados reais
      if (preAppointments.length === 0) {
        // Criar alguns pré-agendamentos para teste
        const mockPreAppointments = [
          {
            id: 201,
            nome: 'Cliente Pendente 1',
            telefone: '(48) 99999-3333',
            endereco: 'Rua Lauro Linhares, 500 - Trindade, Florianópolis',
            coordenadas: [-48.5254, -27.5869] as [number, number],
            data_criacao: new Date().toISOString(),
            status: 'pendente' as const,
            urgente: false,
            tipo_servico: 'in-home' as const
          },
          {
            id: 202,
            nome: 'Cliente Pendente 2',
            telefone: '(48) 99999-4444',
            endereco: 'Rua Deputado Antônio Edu Vieira, 1000 - Pantanal, Florianópolis',
            coordenadas: [-48.5154, -27.6069] as [number, number],
            data_criacao: new Date().toISOString(),
            status: 'pendente' as const,
            urgente: true,
            tipo_servico: 'coleta' as const
          },
          {
            id: 203,
            nome: 'Cliente Roteirizado 1',
            telefone: '(48) 99999-5555',
            endereco: 'Rua João Pio Duarte Silva, 200 - Córrego Grande, Florianópolis',
            coordenadas: [-48.5054, -27.5969] as [number, number],
            data_criacao: new Date().toISOString(),
            status: 'roteirizado' as const,
            urgente: false,
            tipo_servico: 'in-home' as const
          },
          {
            id: 204,
            nome: 'Cliente Pendente 3',
            telefone: '(48) 99999-6666',
            endereco: 'Rua Delfino Conti, 100 - Trindade, Florianópolis',
            coordenadas: [-48.5154, -27.5769] as [number, number],
            data_criacao: new Date().toISOString(),
            status: 'pendente' as const,
            urgente: true,
            tipo_servico: 'in-home' as const
          },
          {
            id: 205,
            nome: 'Cliente Roteirizado 2',
            telefone: '(48) 99999-7777',
            endereco: 'Av. Madre Benvenuta, 300 - Santa Mônica, Florianópolis',
            coordenadas: [-48.5054, -27.5869] as [number, number],
            data_criacao: new Date().toISOString(),
            status: 'roteirizado' as const,
            urgente: false,
            tipo_servico: 'coleta' as const
          }
        ];

        console.log(`Usando ${mockPreAppointments.length} pré-agendamentos mock para teste`);

        // Converter para ServicePoint
        return mockPreAppointments.map(agendamento => ({
          id: agendamento.id.toString(),
          coordinates: agendamento.coordenadas,
          address: agendamento.endereco,
          clientName: agendamento.nome,
          serviceTime: this.estimateServiceTime(agendamento),
          priority: agendamento.urgente ? 2 : 1,
          type: 'pre-agendamento',
          serviceType: this.determineServiceType(agendamento),
          urgency: agendamento.urgente
        }));
      }

      // Converter para ServicePoint
      return preAppointments.map(agendamento => ({
        id: agendamento.id.toString(),
        coordinates: agendamento.coordenadas || [-48.5554, -27.5969], // Coordenadas padrão se não disponíveis
        address: agendamento.endereco || '',
        clientName: agendamento.nome || '',
        serviceTime: this.estimateServiceTime(agendamento),
        priority: agendamento.urgente ? 2 : 1,
        type: 'pre-agendamento',
        serviceType: this.determineServiceType(agendamento),
        urgency: agendamento.urgente || false
      }));
    } catch (error) {
      console.error('Erro ao buscar pré-agendamentos:', error);
      return [];
    }
  }

  /**
   * Confirma um agendamento com um slot de tempo selecionado
   * @param preAppointmentId ID do pré-agendamento
   * @param timeSlot Slot de tempo selecionado
   */
  private async confirmAppointment(preAppointmentId: string, timeSlot: TimeSlot): Promise<void> {
    try {
      // Buscar agendamento
      const agendamento = await agendamentosService.getById(preAppointmentId);

      if (!agendamento) {
        throw new Error(`Agendamento ${preAppointmentId} não encontrado`);
      }

      // Atualizar status e data agendada
      const updatedAgendamento = {
        ...agendamento,
        status: 'confirmado',
        data_agendada: timeSlot.start.toISOString()
      };

      // Salvar no banco de dados
      await agendamentosService.update(preAppointmentId, updatedAgendamento);

      toast.success(`Agendamento de ${agendamento.nome} confirmado com sucesso!`);
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast.error('Erro ao confirmar agendamento');
      throw error;
    }
  }

  /**
   * Estima o tempo de serviço com base no tipo de agendamento
   * @param agendamento Agendamento para estimar tempo
   * @returns Tempo estimado em minutos
   */
  private estimateServiceTime(agendamento: any): number {
    // Lógica para estimar tempo de serviço
    // Por padrão, serviços em casa levam 50 minutos e coletas 30 minutos
    const serviceType = this.determineServiceType(agendamento);
    return serviceType === 'in-home' ? 50 : 30;
  }

  /**
   * Determina o tipo de serviço (em casa ou coleta)
   * @param agendamento Agendamento para determinar tipo
   * @returns Tipo de serviço
   */
  private determineServiceType(agendamento: any): 'in-home' | 'pickup' {
    // Lógica para determinar tipo de serviço
    // Por padrão, considerar como serviço em casa
    return agendamento.tipo_servico === 'coleta' ? 'pickup' : 'in-home';
  }
}
