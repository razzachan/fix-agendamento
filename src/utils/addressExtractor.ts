
/**
 * Utility functions to extract address components from a full address string
 */

/**
 * Extracts the city from a full address string
 */
export const extractCityFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Match pattern for Brazilian cities followed by state
  // Example: "Rio de Janeiro, RJ" or "São Paulo - SP" or "Belo Horizonte - MG"
  const cityRegex = /,\s*([^,\d-]+?)(?:\s*[-,]\s*[A-Z]{2}|\s*\d{5}-\d{3}|$)/;
  const match = address.match(cityRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Alternative pattern for addresses without commas
  const altCityRegex = /\s([^-,\d]+?)\s+-\s+[A-Z]{2}/;
  const altMatch = address.match(altCityRegex);
  
  return altMatch ? altMatch[1].trim() : null;
};

/**
 * Extracts the state from a full address string
 */
export const extractStateFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Match pattern for Brazilian state abbreviations (2 uppercase letters)
  // Usually followed by ZIP code or at the end of the string
  const stateRegex = /\s+([A-Z]{2})(?:\s*\d{5}-?\d{3}|,|\s|$)/;
  const match = address.match(stateRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Second pattern for states after a dash
  const dashStateRegex = /-\s*([A-Z]{2})(?:\s|,|$)/;
  const dashMatch = address.match(dashStateRegex);
  
  return dashMatch ? dashMatch[1].trim() : null;
};

/**
 * Extracts the ZIP code from a full address string
 */
export const extractZipCodeFromAddress = (address?: string): string | null => {
  if (!address) return null;
  
  // Match pattern for Brazilian ZIP codes (CEP): 5 digits, hyphen, 3 digits or 8 consecutive digits
  const zipCodeRegex = /\b(\d{5}-\d{3}|\d{8})\b/;
  const match = address.match(zipCodeRegex);
  
  return match ? match[1].trim() : null;
};
