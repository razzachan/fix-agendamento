/**
 * Utilitários para lidar com problemas de timezone no sistema
 * 
 * O problema: Quando salvamos uma data como "2025-06-24T13:00:00+00:00" (UTC),
 * o JavaScript automaticamente converte para o timezone local ao criar new Date(),
 * fazendo com que 13h UTC vire 10h no horário de Brasília (UTC-3).
 * 
 * A solução: Preservar o horário "visual" ignorando o timezone.
 */

/**
 * Cria uma data local preservando os componentes de data/hora UTC
 * Isso evita conversões automáticas de timezone
 * 
 * @param utcString - String de data em formato UTC (ex: "2025-06-24T13:00:00+00:00")
 * @returns Date - Data local com os mesmos componentes visuais
 */
export const createDateFromUTCString = (utcString: string): Date => {
  // Extrair componentes da data UTC
  const utcDate = new Date(utcString);
  
  // Criar nova data local com os mesmos componentes de data/hora
  // Isso preserva o horário "visual" independente do timezone
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );
};

/**
 * Formata uma string de data UTC para horário local preservando o horário visual
 * 
 * @param utcString - String de data em formato UTC
 * @param format - Formato de saída (ex: 'HH:mm', 'dd/MM/yyyy')
 * @returns string - Data formatada
 */
export const formatUTCStringAsLocal = (utcString: string, formatStr: string = 'HH:mm'): string => {
  const localDate = createDateFromUTCString(utcString);
  
  // Usar formatação simples para casos comuns
  if (formatStr === 'HH:mm') {
    return localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  
  if (formatStr === 'dd/MM/yyyy') {
    return localDate.toLocaleDateString('pt-BR');
  }
  
  if (formatStr === 'dd/MM/yyyy HH:mm') {
    return `${localDate.toLocaleDateString('pt-BR')} ${localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Para outros formatos, retornar a data local para uso com date-fns
  return localDate.toISOString();
};

/**
 * Verifica se uma data UTC está no mesmo dia que uma data local
 * 
 * @param utcString - String de data em formato UTC
 * @param localDate - Data local para comparação
 * @returns boolean - True se estão no mesmo dia
 */
export const isSameDayUTCAndLocal = (utcString: string, localDate: Date): boolean => {
  const utcAsLocal = createDateFromUTCString(utcString);
  
  return (
    utcAsLocal.getFullYear() === localDate.getFullYear() &&
    utcAsLocal.getMonth() === localDate.getMonth() &&
    utcAsLocal.getDate() === localDate.getDate()
  );
};

/**
 * Converte uma data local para string UTC preservando os componentes visuais
 * Útil para salvar no banco de dados
 * 
 * @param localDate - Data local
 * @returns string - String UTC com os mesmos componentes visuais
 */
export const convertLocalDateToUTCString = (localDate: Date): string => {
  // Criar data UTC com os mesmos componentes visuais da data local
  const utcDate = new Date(Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    localDate.getHours(),
    localDate.getMinutes(),
    localDate.getSeconds()
  ));
  
  return utcDate.toISOString();
};
