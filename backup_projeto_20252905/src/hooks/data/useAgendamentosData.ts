
import { useState, useEffect } from 'react';
import { agendamentosService, AgendamentoAI } from '@/services/agendamentos';
import { toast } from 'sonner';

export function useAgendamentosData() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoAI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgendamentos = async () => {
    try {
      setIsLoading(true);
      // Usar getActiveAgendamentos para excluir agendamentos já convertidos em OS
      const data = await agendamentosService.getActiveAgendamentos();
      setAgendamentos(data);
      console.log(`📋 Carregados ${data.length} agendamentos ativos (não processados)`);
      return true;
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Não foi possível carregar os agendamentos.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const updateAgendamento = async (id: string, updates: Partial<AgendamentoAI>) => {
    try {
      console.log(`Atualizando agendamento ${id} no banco de dados:`, updates);

      // Atualizar no banco de dados
      await agendamentosService.update(id, updates);

      console.log(`Agendamento ${id} atualizado com sucesso no banco de dados`);

      // Atualizar a lista local imediatamente para feedback visual rápido
      setAgendamentos(prevAgendamentos =>
        prevAgendamentos.map(agendamento =>
          agendamento.id.toString() === id.toString()
            ? { ...agendamento, ...updates }
            : agendamento
        )
      );

      // Mostrar mensagem de sucesso
      toast.success('Agendamento atualizado com sucesso!');

      // Buscar dados atualizados do servidor
      await fetchAgendamentos();

      // Forçar uma atualização adicional após um pequeno delay
      setTimeout(() => {
        console.log('Executando atualização adicional após delay...');
        fetchAgendamentos();
      }, 500);

      return true;
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento.');
      return false;
    }
  };

  return {
    agendamentos,
    isLoading,
    updateAgendamento,
    refreshAgendamentos: fetchAgendamentos
  };
}
