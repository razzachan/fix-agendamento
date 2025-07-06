import { formatUTCStringAsLocal } from '@/utils/timezoneUtils';

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  // Usar timezone utils para preservar o horário visual correto
  return formatUTCStringAsLocal(dateString, 'dd/MM/yyyy HH:mm');
};

// Note: The searchAddresses function has been replaced by searchAddressesWithMapbox
// in src/utils/mapboxUtils.ts
