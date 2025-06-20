/**
 * Utilitários para geração e formatação de números sequenciais
 * Sistema de numeração amigável:
 * - Ordens de Serviço: OS #001, OS #002, etc.
 * - Pré-agendamentos: AG #001, AG #002, etc.
 */

import { supabase } from '@/integrations/supabase/client';

export type NumberType = 'service_order' | 'pre_schedule';

export interface NumberConfig {
  prefix: string;
  tableName: string;
  columnName: string;
  sequenceName: string;
}

/**
 * Configurações para diferentes tipos de numeração
 */
const NUMBER_CONFIGS: Record<NumberType, NumberConfig> = {
  service_order: {
    prefix: 'OS',
    tableName: 'service_orders',
    columnName: 'order_number',
    sequenceName: 'service_order_number_seq'
  },
  pre_schedule: {
    prefix: 'AG',
    tableName: 'schedules', // ou a tabela correta para pré-agendamentos
    columnName: 'schedule_number',
    sequenceName: 'pre_schedule_number_seq'
  }
};

/**
 * Gera o próximo número sequencial para um tipo específico
 * @param type - Tipo de numeração ('service_order' ou 'pre_schedule')
 * @returns Promise<string> - Número formatado (ex: "OS #001" ou "AG #001")
 */
export async function generateNextNumber(type: NumberType): Promise<string> {
  const config = NUMBER_CONFIGS[type];
  try {
    // 1. Buscar o maior número existente
    const { data: records, error } = await supabase
      .from(config.tableName)
      .select(config.columnName)
      .not(config.columnName, 'is', null)
      .order(config.columnName, { ascending: false })
      .limit(1);

    if (error) {
      console.error(`❌ Erro ao buscar último número de ${type}:`, error);
      throw error;
    }

    let nextNumber = 1;

    if (records && records.length > 0 && records[0][config.columnName]) {
      // Extrair número do formato "OS #001" ou "AG #001"
      const lastNumber = records[0][config.columnName];
      const numberMatch = lastNumber.match(new RegExp(`${config.prefix} #(\\d+)`));

      if (numberMatch) {
        const lastNum = parseInt(numberMatch[1], 10);
        nextNumber = lastNum + 1;
      }
    }

    // 2. Formatar como "OS #001" ou "AG #001"
    const formattedNumber = `${config.prefix} #${nextNumber.toString().padStart(3, '0')}`;

    console.log(`🔢 Próximo número de ${type} gerado: ${formattedNumber}`);
    return formattedNumber;

  } catch (error) {
    console.error(`❌ Erro ao gerar número de ${type}:`, error);
    // Fallback: usar timestamp para evitar conflitos
    const timestamp = Date.now().toString().slice(-6);
    return `${config.prefix} #${timestamp}`;
  }
}

/**
 * Função de compatibilidade para gerar números de ordem de serviço
 * @returns Promise<string> - Número formatado (ex: "OS #001")
 */
export async function generateNextOrderNumber(): Promise<string> {
  return generateNextNumber('service_order');
}

/**
 * Função para gerar números de pré-agendamento
 * @returns Promise<string> - Número formatado (ex: "AG #001")
 */
export async function generateNextScheduleNumber(): Promise<string> {
  return generateNextNumber('pre_schedule');
}

/**
 * Formata um número sequencial no padrão do sistema
 * @param number - Número a ser formatado
 * @param type - Tipo de numeração
 * @returns string - Número formatado (ex: "OS #001" ou "AG #001")
 */
export function formatNumber(number: number, type: NumberType): string {
  const config = NUMBER_CONFIGS[type];
  return `${config.prefix} #${number.toString().padStart(3, '0')}`;
}

/**
 * Função de compatibilidade para formatar números de ordem
 * @param number - Número a ser formatado
 * @returns string - Número formatado (ex: "OS #001")
 */
export function formatOrderNumber(number: number): string {
  return formatNumber(number, 'service_order');
}

/**
 * Extrai o número sequencial de um número formatado
 * @param formattedNumber - Número formatado (ex: "OS #001" ou "AG #001")
 * @param type - Tipo de numeração (opcional, detecta automaticamente se não fornecido)
 * @returns number | null - Número extraído ou null se inválido
 */
export function extractNumber(formattedNumber: string, type?: NumberType): number | null {
  if (type) {
    const config = NUMBER_CONFIGS[type];
    const match = formattedNumber.match(new RegExp(`${config.prefix} #(\\d+)`));
    return match ? parseInt(match[1], 10) : null;
  }

  // Detectar automaticamente o tipo
  for (const [numberType, config] of Object.entries(NUMBER_CONFIGS)) {
    const match = formattedNumber.match(new RegExp(`${config.prefix} #(\\d+)`));
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Função de compatibilidade para extrair números de ordem
 * @param orderNumber - Número formatado (ex: "OS #001")
 * @returns number | null - Número extraído ou null se inválido
 */
export function extractOrderNumber(orderNumber: string): number | null {
  return extractNumber(orderNumber, 'service_order');
}

/**
 * Valida se um número está no formato correto
 * @param formattedNumber - Número a ser validado
 * @param type - Tipo de numeração (opcional, valida qualquer tipo se não fornecido)
 * @returns boolean - True se válido
 */
export function isValidNumber(formattedNumber: string, type?: NumberType): boolean {
  if (type) {
    const config = NUMBER_CONFIGS[type];
    return new RegExp(`^${config.prefix} #\\d{3,}$`).test(formattedNumber);
  }

  // Validar qualquer tipo
  return Object.values(NUMBER_CONFIGS).some(config =>
    new RegExp(`^${config.prefix} #\\d{3,}$`).test(formattedNumber)
  );
}

/**
 * Função de compatibilidade para validar números de ordem
 * @param orderNumber - Número a ser validado
 * @returns boolean - True se válido
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return isValidNumber(orderNumber, 'service_order');
}

/**
 * Atualiza ordens existentes sem order_number com numeração sequencial
 * Esta função deve ser executada uma única vez para migrar dados existentes
 */
export async function migrateExistingOrders(): Promise<void> {
  try {
    console.log('🔄 Iniciando migração de ordens existentes...');

    // 1. Buscar ordens sem order_number
    const { data: ordersWithoutNumber, error: fetchError } = await supabase
      .from('service_orders')
      .select('id, created_at')
      .is('order_number', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar ordens sem numeração:', fetchError);
      throw fetchError;
    }

    if (!ordersWithoutNumber || ordersWithoutNumber.length === 0) {
      console.log('✅ Nenhuma ordem encontrada para migração');
      return;
    }

    console.log(`📋 Encontradas ${ordersWithoutNumber.length} ordens para migração`);

    // 2. Buscar o maior número existente para continuar a sequência
    const { data: existingOrders, error: maxError } = await supabase
      .from('service_orders')
      .select('order_number')
      .not('order_number', 'is', null)
      .order('order_number', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('❌ Erro ao buscar maior número existente:', maxError);
      throw maxError;
    }

    let startNumber = 1;
    if (existingOrders && existingOrders.length > 0 && existingOrders[0].order_number) {
      const lastNumber = extractOrderNumber(existingOrders[0].order_number);
      if (lastNumber) {
        startNumber = lastNumber + 1;
      }
    }

    // 3. Atualizar cada ordem com numeração sequencial
    for (let i = 0; i < ordersWithoutNumber.length; i++) {
      const order = ordersWithoutNumber[i];
      const orderNumber = formatOrderNumber(startNumber + i);

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ order_number: orderNumber })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ordem ${order.id}:`, updateError);
        continue;
      }

      console.log(`✅ Ordem ${order.id} atualizada com número ${orderNumber}`);
    }

    console.log(`🎉 Migração concluída! ${ordersWithoutNumber.length} ordens atualizadas`);

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  }
}

/**
 * Garante que uma ordem de serviço tenha um order_number válido
 * @param serviceOrderId - ID da ordem de serviço
 * @returns Promise<string> - Order number da ordem
 */
export async function ensureOrderNumber(serviceOrderId: string): Promise<string> {
  try {
    // 1. Verificar se a ordem já tem um order_number
    const { data: order, error: fetchError } = await supabase
      .from('service_orders')
      .select('order_number')
      .eq('id', serviceOrderId)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao buscar ordem:', fetchError);
      throw fetchError;
    }

    // 2. Se já tem order_number, retornar
    if (order.order_number) {
      return order.order_number;
    }

    // 3. Se não tem, gerar e atualizar
    const newOrderNumber = await generateNextOrderNumber();
    
    const { error: updateError } = await supabase
      .from('service_orders')
      .update({ order_number: newOrderNumber })
      .eq('id', serviceOrderId);

    if (updateError) {
      console.error('❌ Erro ao atualizar order_number:', updateError);
      throw updateError;
    }

    console.log(`✅ Order number ${newOrderNumber} atribuído à ordem ${serviceOrderId}`);
    return newOrderNumber;

  } catch (error) {
    console.error('❌ Erro ao garantir order_number:', error);
    throw error;
  }
}

/**
 * Detecta o tipo de item e retorna o número de exibição apropriado
 * @param item - Item que pode ser uma ordem de serviço ou pré-agendamento
 * @param index - Índice como fallback
 * @returns string - Número formatado para exibição
 */
export function getDisplayNumber(item: any, index?: number): string {
  // 1. Se tem order_number válido (Ordem de Serviço)
  if (item.orderNumber && isValidNumber(item.orderNumber, 'service_order')) {
    return item.orderNumber;
  }
  if (item.order_number && isValidNumber(item.order_number, 'service_order')) {
    return item.order_number;
  }

  // 2. Se tem schedule_number válido (Pré-agendamento)
  if (item.scheduleNumber && isValidNumber(item.scheduleNumber, 'pre_schedule')) {
    return item.scheduleNumber;
  }
  if (item.schedule_number && isValidNumber(item.schedule_number, 'pre_schedule')) {
    return item.schedule_number;
  }

  // 3. Detectar pelo contexto/propriedades do item
  // Primeiro verificar se é pré-agendamento (tabela agendamentos_ai)
  const isPreSchedule = item.nome || // campo específico da tabela agendamentos_ai
                        item.equipamentos || // campo JSONB específico de pré-agendamentos
                        item.problemas || // campo JSONB específico de pré-agendamentos
                        item.scheduledDate ||
                        item.scheduled_date ||
                        item.isPreSchedule ||
                        (item.status && ['pendente', 'confirmado', 'roteirizado', 'cancelado', 'os_criada'].includes(item.status));

  // Só considerar como ordem de serviço se NÃO for pré-agendamento e tiver status de OS
  const isServiceOrder = !isPreSchedule &&
                         item.status &&
                         ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(item.status);

  // 4. Fallback baseado no tipo detectado
  if (isPreSchedule) {
    return typeof index === 'number' ? formatNumber(index + 1, 'pre_schedule') : 'AG #---';
  }

  if (isServiceOrder) {
    return typeof index === 'number' ? formatOrderNumber(index + 1) : 'OS #---';
  }

  // 5. Fallback final
  return typeof index === 'number' ? `#${(index + 1).toString().padStart(3, '0')}` : '#---';
}

/**
 * Determina se um item é uma ordem de serviço ou pré-agendamento
 * @param item - Item a ser analisado
 * @returns NumberType | null - Tipo detectado ou null se indeterminado
 */
export function detectItemType(item: any): NumberType | null {
  // Verificar por campos específicos
  if (item.orderNumber || item.order_number) return 'service_order';
  if (item.scheduleNumber || item.schedule_number) return 'pre_schedule';

  // Verificar por propriedades características
  // Primeiro verificar se é pré-agendamento (tabela agendamentos_ai)
  const isPreSchedule = item.nome || // campo específico da tabela agendamentos_ai
                        item.equipamentos || // campo JSONB específico de pré-agendamentos
                        item.problemas || // campo JSONB específico de pré-agendamentos
                        item.scheduledDate ||
                        item.scheduled_date ||
                        item.isPreSchedule ||
                        (item.status && ['pendente', 'confirmado', 'roteirizado', 'cancelado', 'os_criada'].includes(item.status));

  if (isPreSchedule) {
    return 'pre_schedule';
  }

  // Só considerar como ordem de serviço se NÃO for pré-agendamento
  if (item.status && ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(item.status)) {
    return 'service_order';
  }

  return null;
}
