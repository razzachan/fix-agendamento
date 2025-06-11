import { agendamentosService } from '@/services/agendamentos';
import { ServiceOrder } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para gerenciar o ciclo de vida completo:
 * Agendamento → Roteirização → Confirmação → Ordem de Serviço → Arquivamento
 */
export class OrderLifecycleService {
  
  /**
   * Cria uma ordem de serviço a partir de um agendamento confirmado
   * e marca o agendamento como convertido
   */
  async createServiceOrderFromAgendamento(
    agendamentoId: string | number,
    serviceOrderData: Partial<ServiceOrder>,
    tecnicoId?: string
  ): Promise<{ serviceOrder: ServiceOrder; updatedAgendamento: any }> {
    try {
      console.log(`🚀 Iniciando criação de OS a partir do agendamento ${agendamentoId}`);
      
      // 1. Buscar o agendamento original
      const agendamento = await agendamentosService.getById(agendamentoId);
      if (!agendamento) {
        throw new Error(`Agendamento ${agendamentoId} não encontrado`);
      }

      // 2. Validar se o agendamento pode ser convertido
      if (agendamento.processado) {
        throw new Error(`Agendamento ${agendamentoId} já foi processado`);
      }

      if (agendamento.status === 'convertido') {
        throw new Error(`Agendamento ${agendamentoId} já foi convertido em OS`);
      }

      // 3. Criar a ordem de serviço
      const now = new Date().toISOString();
      const osData = {
        client_name: agendamento.nome,
        client_phone: agendamento.telefone,
        client_address: agendamento.endereco,
        equipment: serviceOrderData.equipment || 'Equipamento não especificado',
        problem_description: serviceOrderData.problem_description || 'Problema não especificado',
        status: 'pending',
        priority: agendamento.urgente ? 'high' : 'medium',
        scheduled_date: agendamento.data_agendada || now,
        technician_id: tecnicoId,
        created_at: now,
        updated_at: now,
        // Campos específicos do agendamento
        origem_agendamento_id: agendamento.id,
        logistics_group: agendamento.logistica,
        service_type: agendamento.tipo_servico,
        ...serviceOrderData
      };

      console.log('📝 Criando ordem de serviço:', osData);

      const { data: serviceOrder, error } = await supabase
        .from('service_orders')
        .insert(osData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar ordem de serviço:', error);
        throw error;
      }

      console.log(`✅ Ordem de serviço criada com sucesso: ${serviceOrder.id}`);

      // 4. Marcar o agendamento como convertido
      const updatedAgendamento = await agendamentosService.markAsConverted(
        agendamentoId,
        serviceOrder.id,
        tecnicoId
      );

      if (!updatedAgendamento) {
        console.warn(`⚠️ Não foi possível marcar agendamento ${agendamentoId} como convertido`);
      }

      console.log(`🎉 Processo completo: Agendamento ${agendamentoId} → OS ${serviceOrder.id}`);

      return {
        serviceOrder: serviceOrder as ServiceOrder,
        updatedAgendamento
      };

    } catch (error) {
      console.error('❌ Erro no processo de criação de OS:', error);
      throw error;
    }
  }

  /**
   * Obter métricas do ciclo de vida dos agendamentos
   */
  async getLifecycleMetrics(): Promise<{
    pendentes: number;
    roteirizados: number;
    confirmados: number;
    convertidos: number;
    cancelados: number;
    taxa_conversao: number;
    tempo_medio_conversao: number;
  }> {
    try {
      console.log('📊 Calculando métricas do ciclo de vida...');

      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('status, created_at, data_conversao');

      if (error) {
        console.error('❌ Erro ao buscar dados para métricas:', error);
        throw error;
      }

      const metrics = {
        pendentes: 0,
        roteirizados: 0,
        confirmados: 0,
        convertidos: 0,
        cancelados: 0,
        taxa_conversao: 0,
        tempo_medio_conversao: 0
      };

      if (!data || data.length === 0) {
        return metrics;
      }

      // Contar por status
      data.forEach(item => {
        switch (item.status) {
          case 'pendente':
            metrics.pendentes++;
            break;
          case 'roteirizado':
            metrics.roteirizados++;
            break;
          case 'confirmado':
            metrics.confirmados++;
            break;
          case 'convertido':
            metrics.convertidos++;
            break;
          case 'cancelado':
            metrics.cancelados++;
            break;
        }
      });

      // Calcular taxa de conversão
      const totalProcessados = metrics.convertidos + metrics.cancelados;
      if (totalProcessados > 0) {
        metrics.taxa_conversao = (metrics.convertidos / totalProcessados) * 100;
      }

      // Calcular tempo médio de conversão
      const convertidos = data.filter(item => 
        item.status === 'convertido' && 
        item.created_at && 
        item.data_conversao
      );

      if (convertidos.length > 0) {
        const tempos = convertidos.map(item => {
          const inicio = new Date(item.created_at).getTime();
          const fim = new Date(item.data_conversao!).getTime();
          return (fim - inicio) / (1000 * 60 * 60); // em horas
        });

        metrics.tempo_medio_conversao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      }

      console.log('📊 Métricas calculadas:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Erro ao calcular métricas:', error);
      throw error;
    }
  }

  /**
   * Limpar agendamentos antigos convertidos (housekeeping)
   */
  async cleanupOldConvertedAgendamentos(daysOld: number = 30): Promise<number> {
    try {
      console.log(`🧹 Limpando agendamentos convertidos há mais de ${daysOld} dias...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('agendamentos_ai')
        .delete()
        .eq('status', 'convertido')
        .lt('data_conversao', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('❌ Erro na limpeza:', error);
        throw error;
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ Limpeza concluída: ${deletedCount} agendamentos removidos`);

      return deletedCount;

    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      throw error;
    }
  }

  /**
   * Reverter conversão (rollback) - em caso de erro na OS
   */
  async revertConversion(agendamentoId: string | number): Promise<boolean> {
    try {
      console.log(`🔄 Revertendo conversão do agendamento ${agendamentoId}...`);

      const updateData = {
        status: 'confirmado',
        processado: false,
        data_conversao: null,
        motivo_processamento: null,
        ordem_servico_id: null,
        updated_at: new Date().toISOString()
      };

      const updatedAgendamento = await agendamentosService.update(agendamentoId, updateData);
      
      if (updatedAgendamento) {
        console.log(`✅ Conversão revertida com sucesso para agendamento ${agendamentoId}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Erro ao reverter conversão:', error);
      throw error;
    }
  }
}

// Instância singleton
export const orderLifecycleService = new OrderLifecycleService();
