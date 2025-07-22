import { supabase } from '@/integrations/supabase/client';
import { OrderValueChange, CreateOrderValueChangeParams } from './types';
import { toast } from 'sonner';

export const orderValueHistoryService = {
  /**
   * Criar um registro de mudança de valor
   */
  async createValueChange(params: CreateOrderValueChangeParams): Promise<OrderValueChange | null> {
    try {
      const { data, error } = await supabase
        .from('order_value_history')
        .insert({
          service_order_id: params.serviceOrderId,
          previous_value: params.previousValue,
          new_value: params.newValue,
          change_reason: params.changeReason,
          changed_by: params.changedBy,
          changed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar histórico de valor:', error);
        throw error;
      }

      return {
        id: data.id,
        serviceOrderId: data.service_order_id,
        previousValue: data.previous_value,
        newValue: data.new_value,
        changeReason: data.change_reason,
        changedBy: data.changed_by,
        changedAt: data.changed_at,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Erro ao criar histórico de valor:', error);
      toast.error('Erro ao salvar histórico de mudança de valor');
      return null;
    }
  },

  /**
   * Buscar histórico de mudanças de valor de uma OS
   */
  async getValueHistory(serviceOrderId: string): Promise<OrderValueChange[]> {
    try {
      const { data, error } = await supabase
        .from('order_value_history')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de valor:', error);
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        serviceOrderId: item.service_order_id,
        previousValue: item.previous_value,
        newValue: item.new_value,
        changeReason: item.change_reason,
        changedBy: item.changed_by,
        changedAt: item.changed_at,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico de valor:', error);
      return [];
    }
  },

  /**
   * Atualizar valor da OS e criar histórico
   */
  async updateOrderValue(
    serviceOrderId: string,
    newValue: number,
    changeReason: string,
    changedBy: string,
    currentValue?: number | null
  ): Promise<boolean> {
    try {
      // Buscar valor atual se não fornecido
      let previousValue = currentValue;
      if (previousValue === undefined) {
        const { data: orderData } = await supabase
          .from('service_orders')
          .select('final_cost')
          .eq('id', serviceOrderId)
          .single();
        
        previousValue = orderData?.final_cost || null;
      }

      // Atualizar valor na OS
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ final_cost: newValue })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('Erro ao atualizar valor da OS:', updateError);
        throw updateError;
      }

      // Criar registro no histórico
      const historyRecord = await this.createValueChange({
        serviceOrderId,
        previousValue,
        newValue,
        changeReason,
        changedBy
      });

      if (!historyRecord) {
        throw new Error('Falha ao criar registro de histórico');
      }

      toast.success('Valor da OS atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar valor da OS:', error);
      toast.error('Erro ao atualizar valor da OS');
      return false;
    }
  }
};
