import { ServiceOrder } from '@/types';

/**
 * Calcula o valor total de uma ordem de serviço
 * Prioriza finalCost se disponível, senão verifica diagnóstico real,
 * senão soma os valores dos serviceItems, senão tenta extrair da descrição
 */
export const calculateOrderValue = (order: ServiceOrder): number => {

  // Se há um valor final definido, usar ele
  if (order.finalCost && order.finalCost > 0) {
    return order.finalCost;
  }

  // Verificar se há diagnóstico REAL com valor estimado (não fake do sistema)
  if (order.diagnosis && order.diagnosis.estimatedCost && order.diagnosis.estimatedCost > 0) {
    // Verificar se não é um diagnóstico fake do sistema
    if (order.diagnosis.workshopUserId !== '00000000-0000-0000-0000-000000000000') {
      return order.diagnosis.estimatedCost;
    }
  }

  // Senão, calcular a partir dos itens de serviço
  if (order.serviceItems && order.serviceItems.length > 0) {
    const total = order.serviceItems.reduce((total, item) => {
      // serviceValue está armazenado em centavos, então dividir por 100
      const value = parseFloat(item.serviceValue || '0') / 100;
      return total + value;
    }, 0);
    if (total > 0) {
      return total;
    }
  }

  // Tentar extrair valor da descrição (vários formatos possíveis)
  if (order.description) {
    // Formato: "... | Valor estimado: R$ 290,00 ..." (baseado na imagem)
    const valuePatterns = [
      /Valor\s+estimado:\s*R\$\s*([\d]+,\d{2})/i,  // R$ 290,00
      /Valor\s+estimado:\s*R\$\s*([\d]+\.\d{2})/i, // R$ 290.00
      /Valor\s+estimado:\s*R\$\s*([\d]+)/i,        // R$ 290
      /Valor:\s*R\$\s*([\d.,]+)/i,
      /R\$\s*([\d.,]+)/i
    ];

    for (const pattern of valuePatterns) {
      const valueMatch = order.description.match(pattern);
      if (valueMatch) {
        let valueStr = valueMatch[1];

        // Se tem vírgula, assumir formato brasileiro (290,00)
        if (valueStr.includes(',')) {
          valueStr = valueStr.replace(',', '.');
        }

        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
  }

  // Se não há valor definido
  return 0;
};

/**
 * Calcula o valor contextual baseado no tipo de atendimento e status
 */
export const calculateContextualOrderValue = (order: ServiceOrder): {
  displayValue: number;
  description: string;
  isPartial: boolean;
} => {
  const totalValue = calculateOrderValue(order);
  const attendanceType = order.serviceAttendanceType || 'em_domicilio';
  const status = order.status;

  // Se não há valor definido
  if (totalValue === 0) {
    return {
      displayValue: 0,
      description: 'A definir',
      isPartial: false
    };
  }

  switch (attendanceType) {
    case 'coleta_diagnostico':
      // Coleta diagnóstico: Taxa personalizada na coleta + orçamento na entrega
      if (['scheduled', 'on_the_way', 'collected_for_diagnosis', 'at_workshop'].includes(status)) {
        return {
          displayValue: totalValue,
          description: `Taxa de coleta (R$ ${totalValue.toFixed(2)})`,
          isPartial: true
        };
      } else if (['diagnosis_completed', 'ready_for_delivery', 'on_the_way_to_deliver'].includes(status)) {
        // Quando há diagnóstico real, mostrar o valor do orçamento
        if (order.diagnosis && order.diagnosis.estimatedCost && order.diagnosis.estimatedCost > totalValue) {
          const orcamentoValue = order.diagnosis.estimatedCost - totalValue;
          return {
            displayValue: orcamentoValue,
            description: `Valor do orçamento (R$ ${orcamentoValue.toFixed(2)})`,
            isPartial: true
          };
        } else {
          return {
            displayValue: totalValue,
            description: `Taxa de coleta (R$ ${totalValue.toFixed(2)})`,
            isPartial: true
          };
        }
      } else {
        // Status completed - mostrar total se houver diagnóstico
        if (order.diagnosis && order.diagnosis.estimatedCost && order.diagnosis.estimatedCost > totalValue) {
          return {
            displayValue: order.diagnosis.estimatedCost,
            description: `Total: R$ ${totalValue.toFixed(2)} + R$ ${(order.diagnosis.estimatedCost - totalValue).toFixed(2)}`,
            isPartial: false
          };
        } else {
          return {
            displayValue: totalValue,
            description: `Taxa de coleta (R$ ${totalValue.toFixed(2)})`,
            isPartial: false
          };
        }
      }

    case 'coleta_conserto':
      // Coleta conserto: 50% na coleta + 50% na entrega
      if (['scheduled', 'on_the_way', 'collected', 'at_workshop'].includes(status)) {
        return {
          displayValue: totalValue * 0.5,
          description: `50% na coleta (R$ ${(totalValue * 0.5).toFixed(2)})`,
          isPartial: true
        };
      } else if (['ready_for_delivery', 'on_the_way_to_deliver'].includes(status)) {
        return {
          displayValue: totalValue * 0.5,
          description: `50% na entrega (R$ ${(totalValue * 0.5).toFixed(2)})`,
          isPartial: true
        };
      } else {
        return {
          displayValue: totalValue,
          description: `Total: R$ ${totalValue.toFixed(2)}`,
          isPartial: false
        };
      }

    case 'em_domicilio':
    default:
      // Em domicílio: 100% na conclusão
      return {
        displayValue: totalValue,
        description: status === 'completed' ? 'Pago na conclusão' : `Total: R$ ${totalValue.toFixed(2)}`,
        isPartial: false
      };
  }
};

/**
 * Formata o valor da ordem como string monetária (versão simples)
 */
export const formatOrderValue = (order: ServiceOrder): string => {
  const value = calculateOrderValue(order);

  if (value === 0) {
    return 'A definir';
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formata o valor contextual da ordem (versão inteligente)
 */
export const formatContextualOrderValue = (order: ServiceOrder): string => {
  const { displayValue, description, isPartial } = calculateContextualOrderValue(order);

  if (displayValue === 0) {
    return 'A definir';
  }

  const formattedValue = displayValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return isPartial ? `${formattedValue}*` : formattedValue;
};

/**
 * Verifica se a ordem tem valor definido
 */
export const hasOrderValue = (order: ServiceOrder): boolean => {
  return calculateOrderValue(order) > 0;
};

/**
 * Obtém informações detalhadas sobre o valor da ordem
 */
export const getOrderValueInfo = (order: ServiceOrder): {
  hasValue: boolean;
  displayValue: string;
  description: string;
  isPartial: boolean;
  tooltip?: string;
} => {
  const totalValue = calculateOrderValue(order);

  if (totalValue === 0) {
    return {
      hasValue: false,
      displayValue: 'A definir',
      description: 'Valor não definido',
      isPartial: false
    };
  }

  const contextual = calculateContextualOrderValue(order);
  const attendanceType = order.serviceAttendanceType || 'em_domicilio';

  let tooltip = '';

  switch (attendanceType) {
    case 'coleta_diagnostico':
      tooltip = 'Coleta Diagnóstico: Taxa personalizada na coleta + valor do orçamento na entrega';
      break;
    case 'coleta_conserto':
      tooltip = 'Coleta Conserto: 50% na coleta + 50% na entrega';
      break;
    case 'em_domicilio':
      tooltip = 'Em Domicílio: 100% pago na conclusão do serviço';
      break;
  }

  return {
    hasValue: true,
    displayValue: formatContextualOrderValue(order),
    description: contextual.description,
    isPartial: contextual.isPartial,
    tooltip
  };
};


