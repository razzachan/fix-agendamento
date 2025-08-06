/**
 * Utilitários para gerenciar automaticamente o campo current_location
 * baseado no status da ordem de serviço
 */

export type CurrentLocation = 'client' | 'transit' | 'workshop' | 'delivered';

/**
 * Mapeamento de status para current_location
 * Define onde o equipamento está fisicamente baseado no status da OS
 */
export const STATUS_TO_LOCATION_MAP: Record<string, CurrentLocation> = {
  // Equipamento com o cliente
  'pending': 'client',
  'scheduled': 'client',
  'scheduled_collection': 'client',
  
  // Equipamento em trânsito (técnico indo buscar ou entregando)
  'on_the_way': 'transit',
  'on_the_way_to_deliver': 'transit',
  
  // Equipamento com o técnico (em domicílio ou coletado)
  'in_progress': 'client', // Para serviços em domicílio
  'collected': 'transit',
  'collected_for_diagnosis': 'transit',
  'collected_for_delivery': 'transit',
  
  // Equipamento na oficina
  'at_workshop': 'workshop',
  'received_at_workshop': 'workshop',
  'in_repair': 'workshop',
  'diagnosis_completed': 'workshop',
  'quote_sent': 'workshop',
  'quote_approved': 'workshop',
  'ready_for_delivery': 'workshop',
  
  // Equipamento entregue
  'payment_pending': 'delivered',
  'completed': 'delivered',
  
  // Equipamento cancelado (volta para cliente)
  'cancelled': 'client'
};

/**
 * Calcula o current_location baseado no status e tipo de atendimento
 */
export function calculateCurrentLocation(
  status: string, 
  serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'
): CurrentLocation {
  // Para serviços em domicílio, alguns status têm comportamento diferente
  if (serviceAttendanceType === 'em_domicilio') {
    switch (status) {
      case 'in_progress':
        return 'client'; // Técnico está na casa do cliente
      case 'ready_for_delivery':
        return 'client'; // Serviço concluído na casa do cliente
      default:
        return STATUS_TO_LOCATION_MAP[status] || 'client';
    }
  }
  
  // Para coleta e conserto/diagnóstico, usar mapeamento padrão
  return STATUS_TO_LOCATION_MAP[status] || 'client';
}

/**
 * Verifica se uma mudança de status requer atualização de location
 */
export function shouldUpdateLocation(
  oldStatus: string,
  newStatus: string,
  serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'
): boolean {
  const oldLocation = calculateCurrentLocation(oldStatus, serviceAttendanceType);
  const newLocation = calculateCurrentLocation(newStatus, serviceAttendanceType);
  
  return oldLocation !== newLocation;
}

/**
 * Traduz current_location para texto amigável
 */
export function translateLocation(location: CurrentLocation): string {
  const locationMap: Record<CurrentLocation, string> = {
    'client': 'Com o Cliente',
    'transit': 'Em Trânsito',
    'workshop': 'Na Oficina',
    'delivered': 'Entregue'
  };

  return locationMap[location];
}

/**
 * Obtém ícone para current_location
 */
export function getLocationIcon(location: CurrentLocation): string {
  const iconMap: Record<CurrentLocation, string> = {
    'client': '🏠',
    'transit': '🚚',
    'workshop': '🔧',
    'delivered': '✅'
  };

  return iconMap[location];
}

/**
 * Obtém cor para current_location
 */
export function getLocationColor(location: CurrentLocation): string {
  const colorMap: Record<CurrentLocation, string> = {
    'client': 'blue',
    'transit': 'yellow',
    'workshop': 'purple',
    'delivered': 'green'
  };

  return colorMap[location];
}
