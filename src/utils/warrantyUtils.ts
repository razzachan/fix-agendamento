/**
 * Utilitários para gerenciamento de garantia
 */
import { ServiceOrder } from '@/types';
import { differenceInDays, parseISO, isAfter, isBefore, isEqual } from 'date-fns';

/**
 * Verifica se uma ordem de serviço está em garantia
 * @param serviceOrder Ordem de serviço a ser verificada
 * @returns Objeto com status da garantia e dias restantes
 */
export const checkWarrantyStatus = (serviceOrder: ServiceOrder): { inWarranty: boolean, daysRemaining: number | null } => {
  // Verificar se a ordem tem garantia configurada
  if (!serviceOrder.warrantyPeriod || !serviceOrder.warrantyStartDate || !serviceOrder.warrantyEndDate) {
    return { inWarranty: false, daysRemaining: null };
  }

  try {
    const today = new Date();
    const endDate = parseISO(serviceOrder.warrantyEndDate);
    
    // Verificar se a data atual está dentro do período de garantia
    const inWarranty = isAfter(endDate, today) || isEqual(endDate, today);
    
    // Calcular dias restantes
    const daysRemaining = inWarranty ? differenceInDays(endDate, today) : 0;
    
    return { inWarranty, daysRemaining };
  } catch (error) {
    console.error('Erro ao verificar status de garantia:', error);
    return { inWarranty: false, daysRemaining: null };
  }
};

/**
 * Calcula a data de término da garantia
 * @param startDate Data de início da garantia
 * @param periodInMonths Período de garantia em meses
 * @returns Data de término da garantia
 */
export const calculateWarrantyEndDate = (startDate: Date, periodInMonths: number): Date => {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + periodInMonths);
  return endDate;
};

/**
 * Verifica se uma ordem de serviço é uma ordem em garantia
 * @param serviceOrder Ordem de serviço a ser verificada
 * @returns Verdadeiro se for uma ordem em garantia
 */
export const isWarrantyOrder = (serviceOrder: ServiceOrder): boolean => {
  return Boolean(serviceOrder.relatedWarrantyOrderId);
};

/**
 * Verifica se uma ordem de serviço tem garantia configurada
 * @param serviceOrder Ordem de serviço a ser verificada
 * @returns Verdadeiro se a ordem tiver garantia configurada
 */
export const hasWarrantyConfig = (serviceOrder: ServiceOrder): boolean => {
  return Boolean(
    serviceOrder.warrantyPeriod && 
    serviceOrder.warrantyStartDate && 
    serviceOrder.warrantyEndDate
  );
};

/**
 * Verifica se uma ordem de serviço está próxima do fim da garantia
 * @param serviceOrder Ordem de serviço a ser verificada
 * @param thresholdDays Número de dias para considerar como próximo do fim
 * @returns Verdadeiro se a garantia estiver próxima do fim
 */
export const isWarrantyNearingEnd = (serviceOrder: ServiceOrder, thresholdDays: number = 15): boolean => {
  const status = checkWarrantyStatus(serviceOrder);
  
  if (!status.inWarranty || status.daysRemaining === null) {
    return false;
  }
  
  return status.daysRemaining <= thresholdDays;
};

/**
 * Formata o período de garantia para exibição
 * @param months Número de meses
 * @returns String formatada
 */
export const formatWarrantyPeriod = (months: number | null | undefined): string => {
  if (!months) return 'Sem garantia';
  
  if (months === 1) {
    return '1 mês';
  }
  
  return `${months} meses`;
};
