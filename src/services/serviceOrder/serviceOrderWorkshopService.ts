import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service para gerenciar a associação entre ordens de serviço e oficinas
 * Como não temos campo workshop_id na tabela service_orders, vamos usar uma abordagem alternativa
 */
export const serviceOrderWorkshopService = {
  /**
   * Associa uma ordem de serviço a uma oficina
   * Estratégia: Salvar no campo notes ou criar evento de histórico
   */
  async assignWorkshop(serviceOrderId: string, workshopId: string, workshopName: string): Promise<boolean> {
    try {
      console.log('🎯 [serviceOrderWorkshopService] Associando ordem à oficina:', {
        serviceOrderId,
        workshopId,
        workshopName
      });

      // Estratégia 1: Salvar como evento no histórico da ordem
      const eventDescription = `Equipamento enviado para oficina: ${workshopName} (ID: ${workshopId})`;

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'note',
          p_created_by: 'Sistema',
          p_description: eventDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de oficina:', eventError);
        throw eventError;
      }

      // Estratégia 2: Atualizar campo notes com informação da oficina
      // Primeiro, buscar notes existentes
      const { data: currentOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('notes')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar ordem atual:', fetchError);
        // Não falha aqui, pois o evento já foi criado
      } else {
        // Adicionar informação da oficina às notes
        const workshopInfo = `[OFICINA] ${workshopName} (${workshopId})`;
        const currentNotes = currentOrder?.notes || '';
        const updatedNotes = currentNotes 
          ? `${currentNotes}\n${workshopInfo}`
          : workshopInfo;

        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ notes: updatedNotes })
          .eq('id', serviceOrderId);

        if (updateError) {
          console.error('❌ Erro ao atualizar notes:', updateError);
          // Não falha aqui, pois o evento já foi criado
        }
      }

      console.log('✅ [serviceOrderWorkshopService] Oficina associada com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao associar oficina:', error);
      toast.error('Erro ao associar oficina à ordem de serviço.');
      return false;
    }
  },

  /**
   * Busca a oficina associada a uma ordem de serviço
   */
  async getAssignedWorkshop(serviceOrderId: string): Promise<{ workshopId: string; workshopName: string } | null> {
    try {
      console.log('🎯 [serviceOrderWorkshopService] Buscando oficina da ordem:', serviceOrderId);

      // Buscar no campo notes
      const { data: order, error: fetchError } = await supabase
        .from('service_orders')
        .select('notes')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError || !order?.notes) {
        console.log('📝 Nenhuma oficina encontrada nas notes');
        return null;
      }

      // Extrair informação da oficina das notes
      const workshopMatch = order.notes.match(/\[OFICINA\]\s+(.+?)\s+\(([^)]+)\)/);
      
      if (workshopMatch) {
        const workshopName = workshopMatch[1];
        const workshopId = workshopMatch[2];
        
        console.log('✅ Oficina encontrada:', { workshopId, workshopName });
        return { workshopId, workshopName };
      }

      console.log('📝 Formato de oficina não encontrado nas notes');
      return null;

    } catch (error) {
      console.error('❌ Erro ao buscar oficina associada:', error);
      return null;
    }
  },

  /**
   * Remove a associação de oficina de uma ordem de serviço
   */
  async removeWorkshopAssignment(serviceOrderId: string): Promise<boolean> {
    try {
      console.log('🎯 [serviceOrderWorkshopService] Removendo associação de oficina:', serviceOrderId);

      // Buscar notes atuais
      const { data: order, error: fetchError } = await supabase
        .from('service_orders')
        .select('notes')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError || !order?.notes) {
        console.log('📝 Nenhuma note encontrada para remover');
        return true;
      }

      // Remover linha da oficina das notes
      const updatedNotes = order.notes
        .split('\n')
        .filter(line => !line.includes('[OFICINA]'))
        .join('\n')
        .trim();

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ notes: updatedNotes || null })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao remover oficina das notes:', updateError);
        throw updateError;
      }

      // Criar evento de remoção
      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'note',
          p_created_by: 'Sistema',
          p_description: 'Associação com oficina removida'
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de remoção:', eventError);
        // Não falha aqui, pois a remoção das notes já foi feita
      }

      console.log('✅ [serviceOrderWorkshopService] Associação removida com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao remover associação de oficina:', error);
      toast.error('Erro ao remover associação de oficina.');
      return false;
    }
  }
};
