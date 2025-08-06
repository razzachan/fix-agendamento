import { useState, useCallback } from 'react';
import { FinancialSyncService, SyncResult } from '@/services/financialSyncService';
import { toast } from 'sonner';

export const useFinancialSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  /**
   * Executar sincronização completa
   */
  const syncAll = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      const result = await FinancialSyncService.fullSync();
      setLastSyncResult(result);
      setLastSyncTime(new Date());
      
      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        updated: 0,
        errors: [`Erro na sincronização: ${error}`],
        warnings: []
      };
      
      setLastSyncResult(errorResult);
      toast.error('Erro na sincronização financeira');
      
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Sincronizar payment_status de uma ordem específica
   */
  const syncOrder = useCallback(async (serviceOrderId: string): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      const result = await FinancialSyncService.syncPaymentStatus(serviceOrderId);
      
      if (result.success) {
        toast.success('Status de pagamento sincronizado');
      } else {
        toast.error('Erro na sincronização do status');
      }
      
      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        updated: 0,
        errors: [`Erro na sincronização: ${error}`],
        warnings: []
      };
      
      toast.error('Erro na sincronização da ordem');
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Validar consistência dos dados financeiros
   */
  const validateConsistency = useCallback(async () => {
    setIsSyncing(true);
    
    try {
      const validation = await FinancialSyncService.validateConsistency();
      
      if (validation.isConsistent) {
        toast.success('Dados financeiros estão consistentes');
      } else {
        toast.warning(`${validation.issues.length} inconsistências encontradas`);
      }
      
      return validation;
    } catch (error) {
      toast.error('Erro na validação de consistência');
      return {
        isConsistent: false,
        issues: [`Erro na validação: ${error}`]
      };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Criar transação financeira automática
   */
  const createTransaction = useCallback(async (
    serviceOrderId: string,
    type: 'advance_payment' | 'final_payment' | 'diagnosis_fee',
    amount: number,
    description?: string
  ): Promise<boolean> => {
    try {
      const success = await FinancialSyncService.createFinancialTransaction(
        serviceOrderId,
        type,
        amount,
        description
      );
      
      if (success) {
        toast.success('Transação financeira criada');
        // Sincronizar após criar transação
        await syncOrder(serviceOrderId);
      } else {
        toast.error('Erro ao criar transação financeira');
      }
      
      return success;
    } catch (error) {
      toast.error('Erro ao criar transação financeira');
      return false;
    }
  }, [syncOrder]);

  /**
   * Obter resumo da última sincronização
   */
  const getSyncSummary = useCallback(() => {
    if (!lastSyncResult || !lastSyncTime) {
      return null;
    }

    return {
      success: lastSyncResult.success,
      updated: lastSyncResult.updated,
      errors: lastSyncResult.errors.length,
      warnings: lastSyncResult.warnings.length,
      timestamp: lastSyncTime,
      timeAgo: getTimeAgo(lastSyncTime)
    };
  }, [lastSyncResult, lastSyncTime]);

  return {
    // Estados
    isSyncing,
    lastSyncResult,
    lastSyncTime,
    
    // Ações
    syncAll,
    syncOrder,
    validateConsistency,
    createTransaction,
    
    // Utilitários
    getSyncSummary
  };
};

/**
 * Utilitário para calcular tempo decorrido
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d atrás`;
}
