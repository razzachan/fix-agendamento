import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAdsTrackingService } from './googleAdsTrackingService';

// Tipos
export interface AgendamentoAI {
  id: number;
  nome: string;
  telefone: string;
  endereco: string;
  coordenadas?: [number, number];
  data_agendada?: string;
  status: 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado' | 'convertido';
  urgente: boolean;
  tipo_servico: 'in-home' | 'coleta';
  logistica?: 'A' | 'B' | 'C';
  created_at?: string;
  updated_at?: string;
  ordem_servico_id?: string; // ID da ordem de serviço associada
  email?: string;
  cpf?: string;
  problema?: string;
  equipamento?: string;
  equipamentos?: any[]; // Array de equipamentos para múltiplos equipamentos
  // Novos campos para controle de ciclo de vida
  processado?: boolean;
  data_conversao?: string;
  motivo_processamento?: 'convertido_os' | 'cancelado_cliente' | 'duplicado' | 'erro';
  tecnico_atribuido?: string;
}

// Dados mock para testes
const mockAgendamentos: AgendamentoAI[] = [
  {
    id: 1,
    nome: 'João Silva',
    telefone: '(48) 99999-1111',
    endereco: 'Rua das Flores, 123 - Centro, Florianópolis',
    coordenadas: [-48.5494, -27.5969],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 2,
    nome: 'Maria Oliveira',
    telefone: '(48) 99999-2222',
    endereco: 'Av. Beira Mar Norte, 1500 - Centro, Florianópolis',
    coordenadas: [-48.5454, -27.5869],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: true,
    tipo_servico: 'in-home'
  },
  {
    id: 3,
    nome: 'Pedro Santos',
    telefone: '(48) 99999-3333',
    endereco: 'Rua Lauro Linhares, 500 - Trindade, Florianópolis',
    coordenadas: [-48.5254, -27.5869],
    created_at: new Date().toISOString(),
    status: 'roteirizado',
    urgente: false,
    tipo_servico: 'coleta'
  },
  {
    id: 4,
    nome: 'Ana Costa',
    telefone: '(48) 99999-4444',
    endereco: 'Rua Deputado Antônio Edu Vieira, 1000 - Pantanal, Florianópolis',
    coordenadas: [-48.5154, -27.6069],
    created_at: new Date().toISOString(),
    data_agendada: addDays(new Date(), 1).toISOString(),
    status: 'confirmado',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 5,
    nome: 'Carlos Ferreira',
    telefone: '(48) 99999-5555',
    endereco: 'Rua João Pio Duarte Silva, 200 - Córrego Grande, Florianópolis',
    coordenadas: [-48.5054, -27.5969],
    created_at: new Date().toISOString(),
    data_agendada: addDays(new Date(), 2).toISOString(),
    status: 'confirmado',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 6,
    nome: 'Fernanda Lima',
    telefone: '(48) 99999-6666',
    endereco: 'Rua Delfino Conti, 100 - Trindade, Florianópolis',
    coordenadas: [-48.5154, -27.5769],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: true,
    tipo_servico: 'coleta'
  },
  {
    id: 7,
    nome: 'Roberto Alves',
    telefone: '(48) 99999-7777',
    endereco: 'Av. Madre Benvenuta, 300 - Santa Mônica, Florianópolis',
    coordenadas: [-48.5054, -27.5869],
    created_at: new Date().toISOString(),
    status: 'roteirizado',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 8,
    nome: 'Juliana Martins',
    telefone: '(48) 99999-8888',
    endereco: 'Rua Itapiranga, 50 - Itacorubi, Florianópolis',
    coordenadas: [-48.4954, -27.5769],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 9,
    nome: 'Marcelo Souza',
    telefone: '(48) 99999-9999',
    endereco: 'Rua Capitão Romualdo de Barros, 400 - Carvoeira, Florianópolis',
    coordenadas: [-48.5254, -27.6069],
    created_at: new Date().toISOString(),
    status: 'roteirizado',
    urgente: true,
    tipo_servico: 'coleta'
  },
  {
    id: 10,
    nome: 'Camila Pereira',
    telefone: '(48) 99999-0000',
    endereco: 'Rua João Carlos de Souza, 292 - Santa Monica, Florianópolis',
    coordenadas: [-48.5054, -27.5969],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: false,
    tipo_servico: 'in-home'
  },
  // Agendamentos em Balneário Camboriú
  {
    id: 11,
    nome: 'Lucas Mendes',
    telefone: '(47) 99999-1111',
    endereco: 'Av. Atlântica, 1000 - Centro, Balneário Camboriú',
    coordenadas: [-48.6354, -27.0029],
    created_at: new Date().toISOString(),
    status: 'pendente',
    urgente: false,
    tipo_servico: 'in-home'
  },
  {
    id: 12,
    nome: 'Mariana Costa',
    telefone: '(47) 99999-2222',
    endereco: 'Av. Brasil, 500 - Centro, Balneário Camboriú',
    coordenadas: [-48.6454, -27.0129],
    created_at: new Date().toISOString(),
    status: 'roteirizado',
    urgente: true,
    tipo_servico: 'coleta'
  }
];

// Serviço de agendamentos
class AgendamentosService {
  private agendamentos: AgendamentoAI[] = [...mockAgendamentos];

  // Obter todos os agendamentos
  async getAll(): Promise<AgendamentoAI[]> {
    try {
      // Buscar dados reais do Supabase
      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('*');

      if (error) {
        console.error('Erro ao buscar agendamentos do Supabase:', error);
        // Retornar array vazio em caso de erro
        return [];
      }

      if (data && data.length > 0) {
        console.log(`Encontrados ${data.length} agendamentos no Supabase`);

        // Mapear os dados do Supabase para o formato AgendamentoAI
        return data.map(item => ({
          id: item.id,
          nome: item.nome || '',
          telefone: item.telefone || '',
          endereco: item.endereco || '',
          coordenadas: item.coordenadas as [number, number] || undefined,
          data_agendada: item.data_agendada || undefined,
          status: item.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado',
          urgente: item.urgente || false,
          tipo_servico: item.tipo_servico as 'in-home' | 'coleta',
          logistica: item.logistica as 'A' | 'B' | 'C' | undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          ordem_servico_id: item.ordem_servico_id,
          equipamentos: item.equipamentos || [], // Incluir array de equipamentos
          problema: item.problema,
          email: item.email,
          cpf: item.cpf
        }));
      } else {
        console.log('Nenhum agendamento encontrado no Supabase');
        return [];
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      // Retornar array vazio em caso de erro
      return [];
    }
  }

  // Obter agendamento por ID
  async getById(id: string | number): Promise<AgendamentoAI | undefined> {
    try {
      console.log(`🔍 [getById] Buscando agendamento com ID:`, id, 'tipo:', typeof id);

      // Validar se o ID é válido
      if (id === null || id === undefined || id === '') {
        console.error(`❌ [getById] ID inválido:`, id);
        return undefined;
      }

      // Usar o ID diretamente (pode ser UUID string ou número)
      const searchId = id;

      console.log(`🔍 [getById] ID para busca:`, searchId);

      // Buscar do Supabase
      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('*')
        .eq('id', searchId)
        .single();

      if (error) {
        console.error(`Erro ao buscar agendamento ${searchId} do Supabase:`, error);
        // Fallback para dados mock em caso de erro
        // Para dados mock, tentar converter para número se possível
        const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
        return this.agendamentos.find(a => a.id === fallbackId);
      }

      if (data) {
        // Mapear os dados do Supabase para o formato AgendamentoAI
        return {
          id: data.id,
          nome: data.nome || '',
          telefone: data.telefone || '',
          endereco: data.endereco || '',
          coordenadas: data.coordenadas as [number, number] || undefined,
          data_agendada: data.data_agendada || undefined,
          status: data.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado' | 'convertido',
          urgente: data.urgente || false,
          tipo_servico: data.tipo_servico as 'in-home' | 'coleta',
          logistica: data.logistica as 'A' | 'B' | 'C' | undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
          ordem_servico_id: data.ordem_servico_id,
          processado: data.processado || false,
          data_conversao: data.data_conversao,
          motivo_processamento: data.motivo_processamento,
          tecnico_atribuido: data.tecnico_atribuido,
          equipamentos: data.equipamentos || [], // Incluir array de equipamentos
          problema: data.problema,
          email: data.email,
          cpf: data.cpf
        };
      } else {
        // Fallback para dados mock se não encontrar no Supabase
        // Para dados mock, tentar converter para número se possível
        const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
        return this.agendamentos.find(a => a.id === fallbackId);
      }
    } catch (error) {
      console.error(`Erro ao buscar agendamento ${id}:`, error);
      // Fallback para dados mock em caso de erro
      const fallbackId = typeof id === 'string' && !isNaN(parseInt(id)) ? parseInt(id) : id;
      return this.agendamentos.find(a => a.id === fallbackId);
    }
  }

  // Criar novo agendamento
  async create(agendamento: Omit<AgendamentoAI, 'id'>): Promise<AgendamentoAI> {
    try {
      // Capturar parâmetros de tracking do Google Ads
      const trackingParams = GoogleAdsTrackingService.captureTrackingParams();

      // Preparar dados para inserção no Supabase
      const now = new Date().toISOString();
      const agendamentoData = {
        nome: agendamento.nome,
        telefone: agendamento.telefone,
        endereco: agendamento.endereco,
        coordenadas: agendamento.coordenadas,
        data_agendada: agendamento.data_agendada,
        status: agendamento.status,
        urgente: agendamento.urgente,
        tipo_servico: agendamento.tipo_servico,
        logistica: agendamento.logistica,
        created_at: now,
        updated_at: now,
        // Campos de tracking do Google Ads
        gclid: trackingParams.gclid,
        utm_source: trackingParams.utmSource,
        utm_medium: trackingParams.utmMedium,
        utm_campaign: trackingParams.utmCampaign,
        utm_term: trackingParams.utmTerm,
        utm_content: trackingParams.utmContent
      };

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('agendamentos_ai')
        .insert(agendamentoData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar agendamento no Supabase:', error);
        // Fallback para dados mock em caso de erro
        const newId = Math.max(...this.agendamentos.map(a => a.id)) + 1;
        const newAgendamento: AgendamentoAI = {
          ...agendamento,
          id: newId,
          created_at: now,
          updated_at: now
        };

        this.agendamentos.push(newAgendamento);
        return newAgendamento;
      }

      // Mapear os dados do Supabase para o formato AgendamentoAI
      const newAgendamento: AgendamentoAI = {
        id: data.id,
        nome: data.nome || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        coordenadas: data.coordenadas as [number, number] || undefined,
        data_agendada: data.data_agendada || undefined,
        status: data.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado',
        urgente: data.urgente || false,
        tipo_servico: data.tipo_servico as 'in-home' | 'coleta',
        logistica: data.logistica as 'A' | 'B' | 'C' | undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
        ordem_servico_id: data.ordem_servico_id
      };

      // Registrar conversão de lead no Google Ads (se tiver GCLID)
      if (trackingParams.gclid) {
        try {
          await GoogleAdsTrackingService.recordLeadConversion(data.id.toString());
          console.log('✅ Conversão de lead registrada para agendamento:', data.id);
        } catch (conversionError) {
          console.error('Erro ao registrar conversão de lead:', conversionError);
          // Não falha a criação do agendamento por causa do tracking
        }
      }

      return newAgendamento;
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      // Fallback para dados mock em caso de erro
      const newId = Math.max(...this.agendamentos.map(a => a.id)) + 1;
      const newAgendamento: AgendamentoAI = {
        ...agendamento,
        id: newId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.agendamentos.push(newAgendamento);
      return newAgendamento;
    }
  }

  // Atualizar agendamento
  async update(id: string | number, agendamento: Partial<AgendamentoAI>): Promise<AgendamentoAI | undefined> {
    try {
      // Usar o ID diretamente (pode ser UUID string ou número)
      const searchId = id;

      console.log(`Atualizando agendamento ${searchId} no Supabase:`, agendamento);

      // Verificar se o status está sendo atualizado para confirmado
      const isConfirmingAppointment = agendamento.status === 'confirmado';
      if (isConfirmingAppointment) {
        console.log(`Confirmando agendamento ${searchId} e atualizando status para 'confirmado'`);
      }

      // Verificar se está sendo associado a uma ordem de serviço
      const isAssigningServiceOrder = agendamento.ordem_servico_id !== undefined;
      if (isAssigningServiceOrder) {
        console.log(`Associando agendamento ${searchId} à ordem de serviço ${agendamento.ordem_servico_id}`);
      }

      // Preparar dados para atualização no Supabase
      // Remover referência a updated_at pois a coluna não existe no banco de dados
      const updateData = {
        ...agendamento
      };

      // Garantir que o status seja 'confirmado' se houver uma ordem de serviço
      if (isAssigningServiceOrder && !isConfirmingAppointment) {
        console.log(`Forçando status para 'confirmado' devido à associação com ordem de serviço`);
        updateData.status = 'confirmado';
      }

      // Atualizar no Supabase com 3 tentativas
      let attempt = 1;
      let data;
      let error;

      while (attempt <= 3) {
        console.log(`Tentativa ${attempt} de atualizar agendamento ${searchId} no Supabase`);

        const result = await supabase
          .from('agendamentos_ai')
          .update(updateData)
          .eq('id', searchId)
          .select()
          .single();

        data = result.data;
        error = result.error;

        if (!error) break;

        console.error(`Erro na tentativa ${attempt} ao atualizar agendamento ${searchId}:`, error);
        attempt++;

        if (attempt <= 3) {
          // Esperar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (error) {
        console.error(`Todas as tentativas falharam ao atualizar agendamento ${searchId} no Supabase:`, error);
        // Fallback para dados mock em caso de erro
        const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
        const index = this.agendamentos.findIndex(a => a.id === fallbackId);

        if (index === -1) return undefined;

        this.agendamentos[index] = {
          ...this.agendamentos[index],
          ...updateData
        };

        return this.agendamentos[index];
      }

      if (data) {
        // Mapear os dados do Supabase para o formato AgendamentoAI
        return {
          id: data.id,
          nome: data.nome || '',
          telefone: data.telefone || '',
          endereco: data.endereco || '',
          coordenadas: data.coordenadas as [number, number] || undefined,
          data_agendada: data.data_agendada || undefined,
          status: data.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado',
          urgente: data.urgente || false,
          tipo_servico: data.tipo_servico as 'in-home' | 'coleta',
          logistica: data.logistica as 'A' | 'B' | 'C' | undefined,
          created_at: data.created_at,
          ordem_servico_id: data.ordem_servico_id
        };
      } else {
        // Fallback para dados mock se não encontrar no Supabase
        const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
        const index = this.agendamentos.findIndex(a => a.id === fallbackId);

        if (index === -1) return undefined;

        this.agendamentos[index] = {
          ...this.agendamentos[index],
          ...agendamento
        };

        return this.agendamentos[index];
      }
    } catch (error) {
      console.error(`Erro ao atualizar agendamento ${id}:`, error);
      // Fallback para dados mock em caso de erro
      const fallbackId = typeof id === 'string' && !isNaN(parseInt(id)) ? parseInt(id) : id;
      const index = this.agendamentos.findIndex(a => a.id === fallbackId);

      if (index === -1) return undefined;

      this.agendamentos[index] = {
        ...this.agendamentos[index],
        ...agendamento
      };

      return this.agendamentos[index];
    }
  }

  // Marcar agendamento como convertido em OS
  async markAsConverted(
    agendamentoId: string | number,
    ordemServicoId: string,
    tecnicoId?: string
  ): Promise<AgendamentoAI | undefined> {
    try {
      const now = new Date().toISOString();

      console.log(`🔄 Marcando agendamento ${agendamentoId} como convertido para OS ${ordemServicoId}`);

      const updateData = {
        status: 'convertido',
        ordem_servico_id: ordemServicoId,
        processado: true,
        data_conversao: now,
        motivo_processamento: 'convertido_os',
        tecnico_atribuido: tecnicoId,
        updated_at: now
      };

      const updatedAgendamento = await this.update(agendamentoId, updateData);

      if (updatedAgendamento) {
        console.log(`✅ Agendamento ${agendamentoId} marcado como convertido com sucesso`);
      }

      return updatedAgendamento;
    } catch (error) {
      console.error('❌ Erro ao marcar agendamento como convertido:', error);
      throw error;
    }
  }

  // Obter agendamentos ativos (não processados)
  async getActiveAgendamentos(): Promise<AgendamentoAI[]> {
    try {
      console.log('🔍 Buscando agendamentos ativos (não processados) no Supabase...');

      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('*')
        .neq('status', 'convertido')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar agendamentos ativos no Supabase:', error);
        // Fallback para dados mock filtrados
        return this.agendamentos.filter(a =>
          a.status !== 'convertido'
        );
      }

      if (data && data.length > 0) {
        console.log(`✅ Encontrados ${data.length} agendamentos ativos no Supabase`);

        return data.map(item => ({
          id: item.id,
          nome: item.nome || '',
          telefone: item.telefone || '',
          endereco: item.endereco || '',
          coordenadas: item.coordenadas as [number, number] || undefined,
          data_agendada: item.data_agendada || undefined,
          status: item.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado' | 'convertido',
          urgente: item.urgente || false,
          tipo_servico: item.tipo_servico as 'in-home' | 'coleta',
          logistica: item.logistics_group as 'A' | 'B' | 'C' | undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          ordem_servico_id: item.ordem_servico_id,
          processado: item.status === 'convertido', // Derivar do status
          data_conversao: item.data_conversao,
          motivo_processamento: item.motivo_processamento,
          tecnico_atribuido: item.tecnico,
          equipamentos: item.equipamentos || [], // Incluir array de equipamentos
          problema: item.problema,
          email: item.email,
          cpf: item.cpf
        }));
      }

      console.log('ℹ️ Nenhum agendamento ativo encontrado no Supabase');
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar agendamentos ativos:', error);
      // Fallback para dados mock filtrados
      return this.agendamentos.filter(a =>
        a.status !== 'convertido'
      );
    }
  }

  // Excluir agendamento
  async delete(id: string | number): Promise<boolean> {
    try {
      // Usar o ID diretamente (pode ser UUID string ou número)
      const searchId = id;

      // Excluir do Supabase
      const { error } = await supabase
        .from('agendamentos_ai')
        .delete()
        .eq('id', searchId);

      if (error) {
        console.error(`Erro ao excluir agendamento ${searchId} do Supabase:`, error);
        // Fallback para dados mock em caso de erro
        const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
        const index = this.agendamentos.findIndex(a => a.id === fallbackId);

        if (index === -1) return false;

        this.agendamentos.splice(index, 1);
        return true;
      }

      // Também remover dos dados mock para manter consistência
      const fallbackId = typeof searchId === 'string' && !isNaN(parseInt(searchId)) ? parseInt(searchId) : searchId;
      const index = this.agendamentos.findIndex(a => a.id === fallbackId);
      if (index !== -1) {
        this.agendamentos.splice(index, 1);
      }

      return true;
    } catch (error) {
      console.error(`Erro ao excluir agendamento ${id}:`, error);
      // Fallback para dados mock em caso de erro
      const fallbackId = typeof id === 'string' && !isNaN(parseInt(id)) ? parseInt(id) : id;
      const index = this.agendamentos.findIndex(a => a.id === fallbackId);

      if (index === -1) return false;

      this.agendamentos.splice(index, 1);
      return true;
    }
  }

  // Filtrar agendamentos por status
  async getByStatus(status: AgendamentoAI['status']): Promise<AgendamentoAI[]> {
    try {
      // Buscar do Supabase
      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('*')
        .eq('status', status);

      if (error) {
        console.error(`Erro ao buscar agendamentos com status ${status} do Supabase:`, error);
        // Fallback para dados mock em caso de erro
        return this.agendamentos.filter(a => a.status === status);
      }

      if (data && data.length > 0) {
        console.log(`Encontrados ${data.length} agendamentos com status ${status} no Supabase`);

        // Mapear os dados do Supabase para o formato AgendamentoAI
        return data.map(item => ({
          id: item.id,
          nome: item.nome || '',
          telefone: item.telefone || '',
          endereco: item.endereco || '',
          coordenadas: item.coordenadas as [number, number] || undefined,
          data_agendada: item.data_agendada || undefined,
          status: item.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado',
          urgente: item.urgente || false,
          tipo_servico: item.tipo_servico as 'in-home' | 'coleta',
          logistica: item.logistica as 'A' | 'B' | 'C' | undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          ordem_servico_id: item.ordem_servico_id
        }));
      } else {
        console.log(`Nenhum agendamento com status ${status} encontrado no Supabase, usando dados mock`);
        return this.agendamentos.filter(a => a.status === status);
      }
    } catch (error) {
      console.error(`Erro ao buscar agendamentos com status ${status}:`, error);
      // Fallback para dados mock em caso de erro
      return this.agendamentos.filter(a => a.status === status);
    }
  }

  // Filtrar agendamentos por data
  async getByDate(date: Date): Promise<AgendamentoAI[]> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log(`Buscando agendamentos para a data ${formattedDate}`);

      // Buscar do Supabase
      // Nota: Isso assume que data_agendada está armazenada como string ISO no Supabase
      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('*')
        .gte('data_agendada', `${formattedDate}T00:00:00.000Z`)
        .lt('data_agendada', `${formattedDate}T23:59:59.999Z`);

      if (error) {
        console.error(`Erro ao buscar agendamentos para a data ${formattedDate} do Supabase:`, error);
        // Fallback para dados mock em caso de erro
        return this.agendamentos.filter(a => {
          if (!a.data_agendada) return false;
          const agendamentoDate = format(new Date(a.data_agendada), 'yyyy-MM-dd');
          return agendamentoDate === formattedDate;
        });
      }

      if (data && data.length > 0) {
        console.log(`Encontrados ${data.length} agendamentos para a data ${formattedDate} no Supabase`);

        // Mapear os dados do Supabase para o formato AgendamentoAI
        return data.map(item => ({
          id: item.id,
          nome: item.nome || '',
          telefone: item.telefone || '',
          endereco: item.endereco || '',
          coordenadas: item.coordenadas as [number, number] || undefined,
          data_agendada: item.data_agendada || undefined,
          status: item.status as 'pendente' | 'roteirizado' | 'confirmado' | 'cancelado',
          urgente: item.urgente || false,
          tipo_servico: item.tipo_servico as 'in-home' | 'coleta',
          logistica: item.logistica as 'A' | 'B' | 'C' | undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          ordem_servico_id: item.ordem_servico_id
        }));
      } else {
        console.log(`Nenhum agendamento para a data ${formattedDate} encontrado no Supabase, usando dados mock`);
        return this.agendamentos.filter(a => {
          if (!a.data_agendada) return false;
          const agendamentoDate = format(new Date(a.data_agendada), 'yyyy-MM-dd');
          return agendamentoDate === formattedDate;
        });
      }
    } catch (error) {
      console.error(`Erro ao buscar agendamentos para a data ${format(date, 'yyyy-MM-dd')}:`, error);
      // Fallback para dados mock em caso de erro
      const formattedDate = format(date, 'yyyy-MM-dd');
      return this.agendamentos.filter(a => {
        if (!a.data_agendada) return false;
        const agendamentoDate = format(new Date(a.data_agendada), 'yyyy-MM-dd');
        return agendamentoDate === formattedDate;
      });
    }
  }
}

// Exportar instância do serviço
export const agendamentosService = new AgendamentosService();
