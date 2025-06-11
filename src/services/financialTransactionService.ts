
import { supabase } from '@/integrations/supabase/client';
import { FinancialTransaction } from '@/types';
import { toast } from 'sonner';

export const financialTransactionService = {
  async getAll(): Promise<FinancialTransaction[]> {
    try {
      const { data, error } = await supabase.from('financial_transactions').select('*');

      if (error) {
        throw error;
      }

      return data.map(tx => ({
        id: tx.id,
        serviceOrderId: tx.service_order_id,
        type: tx.type as any,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date,
        paidStatus: tx.paid_status as any,
      }));
    } catch (error) {
      console.error('Erro ao buscar transações financeiras:', error);
      toast.error('Erro ao carregar transações financeiras.');
      return [];
    }
  },

  async getByServiceOrderId(serviceOrderId: string): Promise<FinancialTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('service_order_id', serviceOrderId);

      if (error) {
        throw error;
      }

      return data.map(tx => ({
        id: tx.id,
        serviceOrderId: tx.service_order_id,
        type: tx.type as any,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date,
        paidStatus: tx.paid_status as any,
      }));
    } catch (error) {
      console.error(`Erro ao buscar transações financeiras para a ordem de serviço ${serviceOrderId}:`, error);
      return [];
    }
  },
};
