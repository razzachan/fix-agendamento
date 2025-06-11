/**
 * Utilitário para formatação de telefones brasileiros
 */

/**
 * Formata um número de telefone brasileiro no padrão (XX) XXXXX-XXXX
 * @param value - Valor do input (pode conter caracteres não numéricos)
 * @returns string - Telefone formatado
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara baseada no tamanho
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  } else {
    // Limita a 11 dígitos
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
};

/**
 * Remove a formatação do telefone, deixando apenas números
 * @param phone - Telefone formatado
 * @returns string - Apenas números
 */
export const unformatPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Valida se um telefone brasileiro está no formato correto
 * @param phone - Telefone a ser validado
 * @returns boolean - True se válido
 */
export const isValidBrazilianPhone = (phone: string): boolean => {
  const numbers = unformatPhoneNumber(phone);
  // Telefone brasileiro: 10 dígitos (fixo) ou 11 dígitos (celular)
  return numbers.length === 10 || numbers.length === 11;
};

/**
 * Gera link do WhatsApp com número brasileiro
 * @param phone - Telefone formatado ou não
 * @returns string - URL do WhatsApp
 */
export const generateWhatsAppLink = (phone: string): string => {
  const numbers = unformatPhoneNumber(phone);
  return `https://wa.me/55${numbers}`;
};

/**
 * Gera link de ligação telefônica
 * @param phone - Telefone formatado ou não
 * @returns string - URL tel:
 */
export const generatePhoneLink = (phone: string): string => {
  const numbers = unformatPhoneNumber(phone);
  return `tel:${numbers}`;
};
