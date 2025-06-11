export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Note: The searchAddresses function has been replaced by searchAddressesWithMapbox
// in src/utils/mapboxUtils.ts
