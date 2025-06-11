import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Service para gerenciar orçamentos no sistema
 */
export const quoteService = {
  /**
   * Busca diagnósticos concluídos que precisam de orçamento
   */
  async getDiagnosisAwaitingQuote(): Promise<any[]> {
    try {
      console.log('🎯 [quoteService] Buscando diagnósticos aguardando orçamento');

      // Buscar ordens com status 'diagnosis_completed' que ainda não têm orçamento
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          equipment_model,
          service_attendance_type,
          status,
          created_at,
          description
        `)
        .eq('status', 'diagnosis_completed');

      if (error) {
        console.error('❌ Erro ao buscar diagnósticos:', error);
        throw error;
      }

      // Para cada ordem, buscar o diagnóstico correspondente
      const ordersWithDiagnosis = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: diagnosis, error: diagnosisError } = await supabase
            .from('service_events')
            .select('description, created_at')
            .eq('service_order_id', order.id)
            .eq('type', 'diagnosis')
            .order('created_at', { ascending: false })
            .limit(1);

          if (diagnosisError) {
            console.error(`❌ Erro ao buscar diagnóstico para ordem ${order.id}:`, diagnosisError);
            return { ...order, diagnosis: null };
          }

          const diagnosisData = diagnosis?.[0] ? JSON.parse(diagnosis[0].description) : null;
          
          return {
            ...order,
            diagnosis: diagnosisData,
            diagnosisDate: diagnosis?.[0]?.created_at
          };
        })
      );

      console.log(`✅ [quoteService] ${ordersWithDiagnosis.length} diagnósticos encontrados`);
      return ordersWithDiagnosis.filter(order => order.diagnosis); // Só retornar ordens com diagnóstico

    } catch (error) {
      console.error('❌ Erro ao buscar diagnósticos aguardando orçamento:', error);
      return [];
    }
  },

  /**
   * Cria um orçamento baseado no diagnóstico
   */
  async createQuote(
    serviceOrderId: string,
    adminUserId: string,
    quoteData: {
      laborCost: number;
      partsCost: number;
      totalCost: number;
      estimatedDays: number;
      notes?: string;
      validUntil: string;
    }
  ): Promise<boolean> {
    try {
      console.log('🎯 [quoteService] Criando orçamento:', {
        serviceOrderId,
        adminUserId,
        quoteData
      });

      // 1. Criar evento de orçamento
      const quoteDescription = JSON.stringify({
        labor_cost: quoteData.laborCost,
        parts_cost: quoteData.partsCost,
        total_cost: quoteData.totalCost,
        estimated_days: quoteData.estimatedDays,
        notes: quoteData.notes || '',
        valid_until: quoteData.validUntil,
        created_by: adminUserId
      });

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'quote_created',
          p_created_by: adminUserId,
          p_description: quoteDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de orçamento:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem para 'quote_sent'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'quote_sent' })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [quoteService] Orçamento criado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao criar orçamento:', error);
      toast.error('Erro ao criar orçamento.');
      return false;
    }
  },

  /**
   * Busca orçamentos pendentes de aprovação
   */
  async getPendingQuotes(): Promise<any[]> {
    try {
      console.log('🎯 [quoteService] Buscando orçamentos pendentes');

      // Buscar ordens com status 'quote_sent'
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          equipment_model,
          service_attendance_type,
          status,
          created_at,
          description
        `)
        .eq('status', 'quote_sent');

      if (error) {
        console.error('❌ Erro ao buscar orçamentos pendentes:', error);
        throw error;
      }

      // Para cada ordem, buscar o orçamento correspondente
      const ordersWithQuotes = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: quote, error: quoteError } = await supabase
            .from('service_events')
            .select('description, created_at')
            .eq('service_order_id', order.id)
            .eq('type', 'quote_created')
            .order('created_at', { ascending: false })
            .limit(1);

          if (quoteError) {
            console.error(`❌ Erro ao buscar orçamento para ordem ${order.id}:`, quoteError);
            return { ...order, quote: null };
          }

          const quoteData = quote?.[0] ? JSON.parse(quote[0].description) : null;
          
          return {
            ...order,
            quote: quoteData,
            quoteDate: quote?.[0]?.created_at
          };
        })
      );

      console.log(`✅ [quoteService] ${ordersWithQuotes.length} orçamentos pendentes encontrados`);
      return ordersWithQuotes.filter(order => order.quote);

    } catch (error) {
      console.error('❌ Erro ao buscar orçamentos pendentes:', error);
      return [];
    }
  },

  /**
   * Aprova orçamento manualmente (admin confirma aprovação via WhatsApp/telefone)
   */
  async approveQuoteManually(
    serviceOrderId: string,
    adminUserId: string,
    notes: string
  ): Promise<boolean> {
    try {
      console.log('🎯 [quoteService] Aprovando orçamento manualmente:', {
        serviceOrderId,
        adminUserId,
        notes
      });

      // 1. Criar evento de aprovação manual
      const approvalDescription = `Orçamento aprovado manualmente pelo admin. ${notes}`;

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'quote_approved',
          p_created_by: adminUserId,
          p_description: approvalDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de aprovação:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem para 'quote_approved'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'quote_approved' })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [quoteService] Orçamento aprovado manualmente com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao aprovar orçamento manualmente:', error);
      toast.error('Erro ao aprovar orçamento.');
      return false;
    }
  },

  /**
   * Rejeita orçamento manualmente
   */
  async rejectQuoteManually(
    serviceOrderId: string,
    adminUserId: string,
    reason: string
  ): Promise<boolean> {
    try {
      console.log('🎯 [quoteService] Rejeitando orçamento manualmente:', {
        serviceOrderId,
        adminUserId,
        reason
      });

      // 1. Criar evento de rejeição
      const rejectionDescription = `Orçamento rejeitado. Motivo: ${reason}`;

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: serviceOrderId,
          p_type: 'quote_rejected',
          p_created_by: adminUserId,
          p_description: rejectionDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de rejeição:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem para 'quote_rejected'
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: 'quote_rejected' })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ [quoteService] Orçamento rejeitado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao rejeitar orçamento:', error);
      toast.error('Erro ao rejeitar orçamento.');
      return false;
    }
  }
};
