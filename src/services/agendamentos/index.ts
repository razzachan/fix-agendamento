
import { supabase } from "@/integrations/supabase/client";

export type AgendamentoAI = {
  id: string;
  nome: string;
  endereco: string;
  equipamento: string;
  problema: string;
  urgente: boolean;
  status: string;
  tecnico: string | null;
  created_at: string;
  data_agendada: string | null;
  telefone: string | null;
  cpf: string | null;
  email: string | null;
  origem: string | null;
  logistics_group: string | null;
  tipo_servico?: 'atendimento' | 'coleta' | null;
}

export const agendamentosService = {
  async getAll() {
    const { data, error } = await supabase
      .from('agendamentos_ai')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agendamentos:', error);
      throw error;
    }

    console.log('Agendamentos carregados do Supabase:', data);

    // Verificar se algum agendamento tem o campo telefone
    const temTelefone = data?.some(item => item.telefone);
    console.log('Algum agendamento tem telefone?', temTelefone);

    if (data && data.length > 0) {
      console.log('Exemplo do primeiro agendamento:', {
        id: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        created_at: data[0].created_at
      });
    }

    return data as AgendamentoAI[];
  },

  async update(id: string, updates: Partial<AgendamentoAI>) {
    const { data, error } = await supabase
      .from('agendamentos_ai')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agendamento:', error);
      throw error;
    }

    return data as AgendamentoAI;
  },

  async updateLogisticsGroup(id: string, logisticsGroup: string | null) {
    return this.update(id, { logistics_group: logisticsGroup });
  },

  async updateTipoServico(id: string, tipoServico: 'atendimento' | 'coleta' | null) {
    return this.update(id, { tipo_servico: tipoServico });
  },

  async getByLogisticsGroup(logisticsGroup: string | null) {
    let query = supabase
      .from('agendamentos_ai')
      .select('*');

    if (logisticsGroup) {
      query = query.eq('logistics_group', logisticsGroup);
    } else {
      query = query.is('logistics_group', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agendamentos by logistics group:', error);
      throw error;
    }

    return data as AgendamentoAI[];
  }
};
