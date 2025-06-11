
/**
 * Utility functions for extracting address components from full address strings
 */

/**
 * Extracts city from a full address string
 */
export const extractCityFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Tenta encontrar padrão comum em endereços brasileiros: ", Cidade - Estado"
  const cityMatch = address.match(/,\s*([^,]+?)(?:\s*-\s*[A-Z]{2}|,|$)/i);
  if (cityMatch && cityMatch[1]) return cityMatch[1].trim();
  
  // Segundo padrão: após a vírgula e antes da UF
  const secondPattern = address.match(/(?:,\s*)([^,]+)(?:,\s*[A-Z]{2})/);
  return secondPattern ? secondPattern[1].trim() : null;
};

/**
 * Extracts state from a full address string
 */
export const extractStateFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Tenta encontrar padrão comum para estados brasileiros: "- UF" ou ", UF"
  const stateMatch = address.match(/(?:-|,)\s*([A-Z]{2})(?:,|\s|$)/);
  if (stateMatch && stateMatch[1]) return stateMatch[1];
  
  // Segundo padrão: após a vírgula e depois da cidade
  const secondPattern = address.match(/(?:,\s*[^,]+,\s*)([A-Z]{2})/);
  return secondPattern ? secondPattern[1] : null;
};

/**
 * Extracts zip code from a full address string
 */
export const extractZipCodeFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Buscar por CEP no formato 00000-000 ou 00000000
  const zipMatch = address.match(/(\d{5}-\d{3}|\d{8})/);
  
  // Se encontrar, retornar o CEP
  return zipMatch ? zipMatch[0] : null;
};
