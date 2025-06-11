/**
 * Tipos relacionados ao sistema de garantia
 */

/**
 * Representa as informações de garantia de uma ordem de serviço
 */
export interface ServiceOrderWarranty {
  /**
   * Período de garantia em meses
   */
  warrantyPeriod: number;
  
  /**
   * Data de início da garantia (geralmente a data de conclusão do serviço)
   */
  warrantyStartDate: string | null;
  
  /**
   * Data de término da garantia
   */
  warrantyEndDate: string | null;
  
  /**
   * Termos específicos da garantia
   */
  warrantyTerms: string | null;
  
  /**
   * ID da ordem de serviço original (caso esta seja uma ordem em garantia)
   */
  relatedWarrantyOrderId: string | null;
}

/**
 * Representa um serviço realizado em garantia
 */
export interface WarrantyService {
  /**
   * ID único do serviço em garantia
   */
  id: string;
  
  /**
   * ID da ordem de serviço original
   */
  originalOrderId: string;
  
  /**
   * ID da ordem de serviço em garantia
   */
  warrantyOrderId: string;
  
  /**
   * Data de criação do registro
   */
  createdAt: string;
  
  /**
   * Observações sobre o serviço em garantia
   */
  notes: string | null;
}

/**
 * Status de garantia de uma ordem de serviço
 */
export enum WarrantyStatus {
  /**
   * Não aplicável (sem garantia)
   */
  NOT_APPLICABLE = 'not_applicable',
  
  /**
   * Em garantia
   */
  IN_WARRANTY = 'in_warranty',
  
  /**
   * Garantia expirada
   */
  EXPIRED = 'expired',
  
  /**
   * Esta é uma ordem em garantia
   */
  WARRANTY_SERVICE = 'warranty_service'
}

/**
 * Calcula o status atual da garantia
 * 
 * @param warrantyStartDate Data de início da garantia
 * @param warrantyEndDate Data de término da garantia
 * @param relatedWarrantyOrderId ID da ordem relacionada (se for uma ordem em garantia)
 * @returns Status atual da garantia
 */
export function calculateWarrantyStatus(
  warrantyStartDate: string | null,
  warrantyEndDate: string | null,
  relatedWarrantyOrderId: string | null
): WarrantyStatus {
  // Se for uma ordem em garantia
  if (relatedWarrantyOrderId) {
    return WarrantyStatus.WARRANTY_SERVICE;
  }
  
  // Se não tiver data de início ou fim da garantia
  if (!warrantyStartDate || !warrantyEndDate) {
    return WarrantyStatus.NOT_APPLICABLE;
  }
  
  // Verificar se a garantia está válida
  const now = new Date();
  const endDate = new Date(warrantyEndDate);
  
  if (now > endDate) {
    return WarrantyStatus.EXPIRED;
  }
  
  return WarrantyStatus.IN_WARRANTY;
}

/**
 * Calcula a data de término da garantia com base na data de início e no período
 * 
 * @param startDate Data de início da garantia
 * @param periodInMonths Período de garantia em meses
 * @returns Data de término da garantia
 */
export function calculateWarrantyEndDate(startDate: string, periodInMonths: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + periodInMonths);
  return date.toISOString();
}

/**
 * Verifica se uma ordem está em período de garantia
 * 
 * @param warrantyStartDate Data de início da garantia
 * @param warrantyEndDate Data de término da garantia
 * @returns Verdadeiro se estiver em garantia
 */
export function isInWarranty(warrantyStartDate: string | null, warrantyEndDate: string | null): boolean {
  if (!warrantyStartDate || !warrantyEndDate) {
    return false;
  }
  
  const now = new Date();
  const endDate = new Date(warrantyEndDate);
  
  return now <= endDate;
}
