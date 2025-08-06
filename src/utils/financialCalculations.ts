import { ServiceOrder } from '@/types';

/**
 * Utilitário para cálculos financeiros padronizados
 * Centraliza a lógica de cálculo de valores para evitar inconsistências
 */

export interface FinancialSummary {
  /** Valor do sinal pago antecipadamente */
  advancePayment: number;
  /** Valor estimado pelo diagnóstico técnico */
  diagnosticEstimate: number;
  /** Valor total final para faturamento */
  totalAmount: number;
  /** Valor pendente de pagamento */
  pendingAmount: number;
  /** Status do pagamento */
  paymentStatus: 'pending' | 'advance_paid' | 'partial' | 'completed' | 'overdue';
  /** Descrição do status financeiro */
  statusDescription: string;
  /** Indica se o pagamento está em atraso */
  isOverdue: boolean;
  /** Dias em atraso (se aplicável) */
  daysOverdue: number;
}

/**
 * Calcula o resumo financeiro completo de uma OS
 */
export const calculateFinancialSummary = (order: ServiceOrder): FinancialSummary => {
  const advancePayment = order.initialCost || 0;
  const totalAmount = order.finalCost || 0;
  const diagnosticEstimate = order.diagnosis?.estimatedCost || 0;

  // Calcular valor pendente
  const pendingAmount = Math.max(0, totalAmount - advancePayment);

  // Usar status do banco se disponível, senão calcular
  let paymentStatus: FinancialSummary['paymentStatus'] = order.paymentStatus || 'pending';
  let statusDescription = '';
  let isOverdue = false;
  let daysOverdue = 0;

  // Se não há status no banco, calcular baseado nos valores
  if (!order.paymentStatus) {
    if (totalAmount === 0) {
      paymentStatus = 'pending';
      statusDescription = 'Valor não definido';
    } else if (advancePayment === 0) {
      paymentStatus = 'pending';
      statusDescription = 'Pagamento não iniciado';
    } else if (advancePayment > 0 && advancePayment < totalAmount) {
      paymentStatus = 'partial';
      statusDescription = `Sinal pago: R$ ${advancePayment.toFixed(2)}`;
    } else if (advancePayment >= totalAmount) {
      paymentStatus = 'completed';
      statusDescription = 'Pagamento completo';
    }
  } else {
    // Usar status do banco e gerar descrição apropriada
    switch (paymentStatus) {
      case 'pending':
        statusDescription = totalAmount > 0 ? 'Pagamento pendente' : 'Valor não definido';
        break;
      case 'advance_paid':
        statusDescription = `Sinal pago: R$ ${advancePayment.toFixed(2)}`;
        break;
      case 'partial':
        statusDescription = `Parcialmente pago: R$ ${advancePayment.toFixed(2)}`;
        break;
      case 'completed':
        statusDescription = 'Pagamento completo';
        break;
      case 'overdue':
        statusDescription = 'Pagamento em atraso';
        isOverdue = true;
        // Calcular dias em atraso se possível
        if (order.completedDate) {
          const completedDate = new Date(order.completedDate);
          const now = new Date();
          daysOverdue = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        break;
    }
  }

  // Verificar se está em atraso baseado na data de conclusão
  if (order.status === 'completed' && order.completedDate && paymentStatus !== 'completed') {
    const completedDate = new Date(order.completedDate);
    const now = new Date();
    const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCompletion > 7) { // Considera em atraso após 7 dias
      paymentStatus = 'overdue';
      statusDescription = `Em atraso há ${daysSinceCompletion} dias`;
      isOverdue = true;
      daysOverdue = daysSinceCompletion;
    }
  }

  return {
    advancePayment,
    diagnosticEstimate,
    totalAmount,
    pendingAmount,
    paymentStatus,
    statusDescription,
    isOverdue,
    daysOverdue
  };
};

/**
 * Calcula o valor para exibição baseado no tipo de atendimento
 */
export const getDisplayValue = (order: ServiceOrder): {
  value: number;
  label: string;
  isEstimate: boolean;
} => {
  const financial = calculateFinancialSummary(order);
  
  // Se tem valor final definido, usar ele
  if (financial.totalAmount > 0) {
    return {
      value: financial.totalAmount,
      label: 'Valor Final',
      isEstimate: false
    };
  }
  
  // Se tem estimativa de diagnóstico, usar ela
  if (financial.diagnosticEstimate > 0) {
    return {
      value: financial.diagnosticEstimate,
      label: 'Estimativa',
      isEstimate: true
    };
  }
  
  // Se tem sinal pago, mostrar ele
  if (financial.advancePayment > 0) {
    return {
      value: financial.advancePayment,
      label: 'Sinal Pago',
      isEstimate: false
    };
  }
  
  return {
    value: 0,
    label: 'A definir',
    isEstimate: true
  };
};

/**
 * Valida se os valores financeiros estão consistentes
 */
export const validateFinancialConsistency = (order: ServiceOrder): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const financial = calculateFinancialSummary(order);
  
  // Validações de erro (problemas críticos)
  if (financial.advancePayment > financial.totalAmount && financial.totalAmount > 0) {
    errors.push('Sinal pago é maior que o valor total');
  }
  
  if (financial.advancePayment < 0) {
    errors.push('Sinal pago não pode ser negativo');
  }
  
  if (financial.totalAmount < 0) {
    errors.push('Valor total não pode ser negativo');
  }
  
  // Validações de aviso (inconsistências menores)
  if (order.serviceAttendanceType === 'coleta_diagnostico' && financial.advancePayment === 0) {
    warnings.push('Coleta diagnóstico deveria ter sinal pago');
  }
  
  if (financial.diagnosticEstimate > 0 && financial.totalAmount === 0) {
    warnings.push('Há estimativa de diagnóstico mas valor final não foi definido');
  }
  
  if (financial.diagnosticEstimate > 0 && financial.totalAmount > 0 && 
      Math.abs(financial.diagnosticEstimate - financial.totalAmount) > financial.totalAmount * 0.5) {
    warnings.push('Grande diferença entre estimativa e valor final');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
};

/**
 * Formata valor monetário para exibição
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Calcula métricas financeiras para relatórios
 */
export const calculateReportMetrics = (orders: ServiceOrder[]): {
  totalRevenue: number;
  totalAdvancePayments: number;
  totalPendingPayments: number;
  averageOrderValue: number;
  completedPayments: number;
  partialPayments: number;
} => {
  let totalRevenue = 0;
  let totalAdvancePayments = 0;
  let totalPendingPayments = 0;
  let completedPayments = 0;
  let partialPayments = 0;
  
  orders.forEach(order => {
    const financial = calculateFinancialSummary(order);
    
    totalRevenue += financial.totalAmount;
    totalAdvancePayments += financial.advancePayment;
    totalPendingPayments += financial.pendingAmount;
    
    if (financial.paymentStatus === 'completed') {
      completedPayments++;
    } else if (financial.paymentStatus === 'partial' || financial.paymentStatus === 'advance_paid') {
      partialPayments++;
    }
  });
  
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  
  return {
    totalRevenue,
    totalAdvancePayments,
    totalPendingPayments,
    averageOrderValue,
    completedPayments,
    partialPayments
  };
};
