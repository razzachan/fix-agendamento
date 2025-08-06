/**
 * Hook para gerenciar numeração sequencial de ordens e agendamentos
 */

import { useState, useEffect } from 'react';
import {
  generateNextOrderNumber,
  generateNextScheduleNumber,
  generateNextNumber,
  ensureOrderNumber,
  migrateExistingOrders,
  isValidOrderNumber,
  isValidNumber,
  getDisplayNumber,
  detectItemType,
  NumberType
} from '@/utils/orderNumberUtils';

export function useOrderNumber() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gera o próximo número sequencial para um tipo específico
   */
  const getNextNumber = async (type: NumberType): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const number = await generateNextNumber(type);
      return number;
    } catch (err: any) {
      const errorMessage = err.message || `Erro ao gerar número de ${type}`;
      setError(errorMessage);
      console.error(`❌ Erro no hook useOrderNumber (${type}):`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gera o próximo número de ordem de serviço
   */
  const getNextOrderNumber = async (): Promise<string | null> => {
    return getNextNumber('service_order');
  };

  /**
   * Gera o próximo número de pré-agendamento
   */
  const getNextScheduleNumber = async (): Promise<string | null> => {
    return getNextNumber('pre_schedule');
  };

  /**
   * Garante que uma ordem específica tenha um número
   */
  const ensureOrderHasNumber = async (serviceOrderId: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const orderNumber = await ensureOrderNumber(serviceOrderId);
      return orderNumber;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao garantir número da ordem';
      setError(errorMessage);
      console.error('❌ Erro ao garantir número da ordem:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Executa migração de ordens existentes
   */
  const runMigration = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await migrateExistingOrders();
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro durante migração';
      setError(errorMessage);
      console.error('❌ Erro durante migração:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Valida formato de número
   */
  const validateNumber = (number: string, type?: NumberType): boolean => {
    return isValidNumber(number, type);
  };

  /**
   * Valida formato de número de ordem (compatibilidade)
   */
  const validateOrderNumber = (orderNumber: string): boolean => {
    return isValidOrderNumber(orderNumber);
  };

  return {
    isLoading,
    error,
    getNextNumber,
    getNextOrderNumber,
    getNextScheduleNumber,
    ensureOrderHasNumber,
    runMigration,
    validateNumber,
    validateOrderNumber
  };
}

/**
 * Hook universal para exibir número formatado
 * Detecta automaticamente se é ordem de serviço ou pré-agendamento
 */
export function useDisplayNumber(item: any, index?: number) {
  const [displayNumber, setDisplayNumber] = useState<string>('');
  const { ensureOrderHasNumber } = useOrderNumber();

  useEffect(() => {
    const getDisplayNumberAsync = async () => {
      // 1. Usar função universal de detecção
      const detectedNumber = getDisplayNumber(item, index);

      // 2. Se não conseguiu detectar e é uma ordem de serviço, tentar garantir numeração
      if (detectedNumber.includes('---') && item.id && detectItemType(item) === 'service_order') {
        try {
          const orderNumber = await ensureOrderHasNumber(item.id);
          if (orderNumber) {
            setDisplayNumber(orderNumber);
            return;
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível obter order_number para:', item.id);
        }
      }

      setDisplayNumber(detectedNumber);
    };

    getDisplayNumberAsync();
  }, [
    item.id,
    item.orderNumber,
    item.order_number,
    item.scheduleNumber,
    item.schedule_number,
    index
    // Removido ensureOrderHasNumber das dependências para evitar loop infinito
  ]);

  return displayNumber;
}

/**
 * Hook para exibir número de ordem (compatibilidade)
 * @deprecated Use useDisplayNumber instead
 */
export function useDisplayOrderNumber(order: any, index?: number) {
  return useDisplayNumber(order, index);
}
