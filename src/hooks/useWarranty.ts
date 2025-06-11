/**
 * Hook para gerenciar garantias
 * Implementa o padrão SOLID com Single Responsibility Principle (SRP)
 */
import { useState, useCallback } from 'react';
import { ServiceOrder } from '@/types';
import { warrantyService, serviceOrderWarrantyIntegration } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Interface para os dados de garantia
export interface WarrantyFormData {
  warrantyEnabled: boolean;
  warrantyPeriod: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate?: string | null;
  warrantyTerms: string | null;
}

// Interface para o resultado do hook
export interface UseWarrantyResult {
  isLoading: boolean;
  saveWarranty: (serviceOrderId: string, data: WarrantyFormData) => Promise<boolean>;
  activateWarranty: (serviceOrder: ServiceOrder) => Promise<boolean>;
  createWarrantyOrder: (originalOrderId: string, notes: string) => Promise<ServiceOrder | null>;
  checkWarrantyStatus: (serviceOrderId: string) => Promise<{ inWarranty: boolean, daysRemaining: number | null }>;
  getDefaultWarrantyTerms: (attendanceType: string) => string;
}

/**
 * Hook para gerenciar garantias
 * @returns Funções e estado para gerenciar garantias
 */
export function useWarranty(): UseWarrantyResult {
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Salva a configuração de garantia para uma ordem de serviço
   * @param serviceOrderId ID da ordem de serviço
   * @param data Dados do formulário de garantia
   * @returns Verdadeiro se a garantia foi salva com sucesso
   */
  const saveWarranty = useCallback(async (
    serviceOrderId: string, 
    data: WarrantyFormData
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Se a garantia não estiver habilitada, enviar valores nulos
      if (!data.warrantyEnabled) {
        const warrantyData = {
          serviceOrderId,
          warrantyPeriod: null,
          warrantyStartDate: null,
          warrantyEndDate: null,
          warrantyTerms: null,
        };
        
        await warrantyService.updateWarranty(serviceOrderId, warrantyData);
        toast.success('Garantia desabilitada com sucesso!');
        return true;
      }
      
      // Converter o período para número
      const warrantyPeriod = data.warrantyPeriod ? parseInt(data.warrantyPeriod) : 3;
      
      // Calcular a data de término se não for fornecida
      let warrantyEndDate = data.warrantyEndDate;
      if (!warrantyEndDate && data.warrantyStartDate) {
        const startDate = new Date(data.warrantyStartDate);
        const endDate = warrantyService.calculateWarrantyEndDate(startDate, warrantyPeriod);
        warrantyEndDate = format(endDate, 'yyyy-MM-dd');
      }
      
      // Preparar os dados para envio
      const warrantyData = {
        serviceOrderId,
        warrantyPeriod,
        warrantyStartDate: data.warrantyStartDate,
        warrantyEndDate,
        warrantyTerms: data.warrantyTerms,
      };
      
      // Enviar os dados
      await warrantyService.updateWarranty(serviceOrderId, warrantyData);
      toast.success('Garantia configurada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar garantia:', error);
      toast.error('Erro ao configurar garantia.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Ativa a garantia automaticamente para uma ordem de serviço concluída
   * @param serviceOrder Ordem de serviço concluída
   * @returns Verdadeiro se a garantia foi ativada com sucesso
   */
  const activateWarranty = useCallback(async (serviceOrder: ServiceOrder): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await serviceOrderWarrantyIntegration.activateWarrantyOnCompletion(serviceOrder);
      if (result) {
        toast.success('Garantia ativada automaticamente!');
      }
      return result;
    } catch (error) {
      console.error('Erro ao ativar garantia:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Cria uma nova ordem de serviço em garantia
   * @param originalOrderId ID da ordem de serviço original
   * @param notes Notas sobre o atendimento em garantia
   * @returns Nova ordem de serviço em garantia
   */
  const createWarrantyOrder = useCallback(async (
    originalOrderId: string, 
    notes: string
  ): Promise<ServiceOrder | null> => {
    setIsLoading(true);
    try {
      const newOrder = await serviceOrderWarrantyIntegration.createWarrantyServiceOrder(
        originalOrderId, 
        notes
      );
      
      if (newOrder) {
        toast.success('Ordem de serviço em garantia criada com sucesso!');
      } else {
        toast.error('Não foi possível criar a ordem em garantia.');
      }
      
      return newOrder;
    } catch (error) {
      console.error('Erro ao criar ordem em garantia:', error);
      toast.error('Erro ao criar ordem em garantia.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Verifica o status de garantia de uma ordem de serviço
   * @param serviceOrderId ID da ordem de serviço
   * @returns Status da garantia
   */
  const checkWarrantyStatus = useCallback(async (
    serviceOrderId: string
  ): Promise<{ inWarranty: boolean, daysRemaining: number | null }> => {
    try {
      return await warrantyService.checkWarrantyStatus(serviceOrderId);
    } catch (error) {
      console.error('Erro ao verificar status de garantia:', error);
      return { inWarranty: false, daysRemaining: null };
    }
  }, []);
  
  /**
   * Obtém os termos de garantia padrão com base no tipo de atendimento
   * @param attendanceType Tipo de atendimento
   * @returns Termos de garantia padrão
   */
  const getDefaultWarrantyTerms = useCallback((attendanceType: string): string => {
    return warrantyService.getDefaultWarrantyTerms(attendanceType);
  }, []);
  
  return {
    isLoading,
    saveWarranty,
    activateWarranty,
    createWarrantyOrder,
    checkWarrantyStatus,
    getDefaultWarrantyTerms
  };
}
