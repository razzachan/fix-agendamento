/**
 * Utilitários para formatação de endereços com complemento
 */

export interface AddressData {
  address?: string | null;
  complement?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

/**
 * Formata um endereço completo com complemento de forma organizada
 * @param data Dados do endereço
 * @returns Endereço formatado
 */
export function formatFullAddress(data: AddressData): string {
  const parts: string[] = [];
  
  // Endereço principal
  if (data.address?.trim()) {
    parts.push(data.address.trim());
  }
  
  // Complemento (se existir)
  if (data.complement?.trim()) {
    parts.push(`Complemento: ${data.complement.trim()}`);
  }
  
  // Cidade e estado
  const locationParts: string[] = [];
  if (data.city?.trim()) {
    locationParts.push(data.city.trim());
  }
  if (data.state?.trim()) {
    locationParts.push(data.state.trim());
  }
  if (locationParts.length > 0) {
    parts.push(locationParts.join(', '));
  }
  
  // CEP
  if (data.zipCode?.trim()) {
    parts.push(`CEP: ${data.zipCode.trim()}`);
  }
  
  return parts.join(' - ');
}

/**
 * Formata endereço para exibição em uma linha
 * @param data Dados do endereço
 * @returns Endereço formatado em uma linha
 */
export function formatAddressOneLine(data: AddressData): string {
  const parts: string[] = [];
  
  if (data.address?.trim()) {
    parts.push(data.address.trim());
  }
  
  if (data.complement?.trim()) {
    parts.push(`(${data.complement.trim()})`);
  }
  
  return parts.join(' ');
}

/**
 * Formata endereço para exibição em múltiplas linhas (JSX)
 * @param data Dados do endereço
 * @returns Objeto com linhas do endereço
 */
export function formatAddressMultiLine(data: AddressData) {
  const lines = {
    main: '',
    complement: '',
    location: ''
  };
  
  // Linha principal
  if (data.address?.trim()) {
    lines.main = data.address.trim();
  }
  
  // Linha do complemento
  if (data.complement?.trim()) {
    lines.complement = `Complemento: ${data.complement.trim()}`;
  }
  
  // Linha da localização
  const locationParts: string[] = [];
  if (data.city?.trim()) {
    locationParts.push(data.city.trim());
  }
  if (data.state?.trim()) {
    locationParts.push(data.state.trim());
  }
  if (data.zipCode?.trim()) {
    locationParts.push(`CEP: ${data.zipCode.trim()}`);
  }
  if (locationParts.length > 0) {
    lines.location = locationParts.join(', ');
  }
  
  return lines;
}

/**
 * Extrai dados de endereço de uma ServiceOrder
 * @param order Ordem de serviço
 * @returns Dados do endereço formatados
 */
export function extractAddressFromServiceOrder(order: any): AddressData {
  return {
    address: order.pickup_address || order.pickupAddress || order.clientFullAddress || null,
    complement: order.pickup_address_complement || order.pickupAddressComplement || order.clientAddressComplement || null,
    city: order.pickup_city || order.pickupCity || order.clientCity || null,
    state: order.pickup_state || order.pickupState || order.clientState || null,
    zipCode: order.pickup_zip_code || order.pickupZipCode || order.clientZipCode || null
  };
}

/**
 * Extrai dados de endereço de um Client
 * @param client Cliente
 * @returns Dados do endereço formatados
 */
export function extractAddressFromClient(client: any): AddressData {
  return {
    address: client.address || null,
    complement: client.addressComplement || client.address_complement || null,
    city: client.city || null,
    state: client.state || null,
    zipCode: client.zipCode || client.zip_code || null
  };
}
