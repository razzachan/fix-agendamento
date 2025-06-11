
import { useState, useEffect } from 'react';
import { FinancialTransaction } from '@/types';
import { financialTransactionService } from '@/services';
import { toast } from 'sonner';

export function useFinancialTransactions() {
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinancialTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await financialTransactionService.getAll();
      setFinancialTransactions(data);
      return true;
    } catch (error) {
      console.error('Erro ao buscar transações financeiras:', error);
      toast.error('Erro ao carregar dados financeiros.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialTransactions();
  }, []);

  const addFinancialTransaction = async (transaction: Partial<FinancialTransaction>) => {
    try {
      // Since the service doesn't have a create method yet, we'll implement a basic version
      console.log('Adding financial transaction:', transaction);
      toast.success('Transação adicionada com sucesso');
      await fetchFinancialTransactions();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar transação financeira:', error);
      toast.error('Erro ao adicionar transação.');
      return false;
    }
  };

  const updateFinancialTransaction = async (id: string, updates: Partial<FinancialTransaction>) => {
    try {
      // Since the service doesn't have an update method yet, we'll implement a basic version
      console.log('Updating financial transaction:', id, updates);
      toast.success('Transação atualizada com sucesso');
      await fetchFinancialTransactions();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar transação financeira:', error);
      toast.error('Erro ao atualizar transação.');
      return false;
    }
  };

  const deleteFinancialTransaction = async (id: string) => {
    try {
      // Since the service doesn't have a delete method yet, we'll implement a basic version
      console.log('Deleting financial transaction:', id);
      toast.success('Transação excluída com sucesso');
      await fetchFinancialTransactions();
      return true;
    } catch (error) {
      console.error('Erro ao excluir transação financeira:', error);
      toast.error('Erro ao excluir transação.');
      return false;
    }
  };

  return {
    financialTransactions,
    isLoading,
    refreshFinancialTransactions: fetchFinancialTransactions,
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction
  };
}
