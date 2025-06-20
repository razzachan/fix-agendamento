// ===================================================================
// 🏭 HOOK PARA DADOS DE OFICINAS (MVP 4)
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workshopService } from '@/services/user/workshopService';
import { User } from '@/types';
import { toast } from 'sonner';

/**
 * Hook para gerenciar dados de oficinas
 */
export function useWorkshopsData() {
  const queryClient = useQueryClient();

  /**
   * Query para buscar todas as oficinas
   */
  const {
    data: workshops = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['workshops'],
    queryFn: workshopService.findAllWorkshops,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });

  /**
   * Mutation para criar nova oficina
   */
  const createWorkshopMutation = useMutation({
    mutationFn: async (workshopData: Partial<User>) => {
      // Esta função seria implementada no workshopService
      throw new Error('Criação de oficina deve ser feita através do sistema de usuários');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast.success('Oficina criada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar oficina:', error);
      toast.error('Erro ao criar oficina');
    }
  });

  /**
   * Mutation para atualizar oficina
   */
  const updateWorkshopMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      // Esta função seria implementada no workshopService
      throw new Error('Atualização de oficina deve ser feita através do sistema de usuários');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast.success('Oficina atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar oficina:', error);
      toast.error('Erro ao atualizar oficina');
    }
  });

  /**
   * Mutation para deletar oficina
   */
  const deleteWorkshopMutation = useMutation({
    mutationFn: async (id: string) => {
      // Esta função seria implementada no workshopService
      throw new Error('Exclusão de oficina deve ser feita através do sistema de usuários');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast.success('Oficina removida com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao remover oficina:', error);
      toast.error('Erro ao remover oficina');
    }
  });

  /**
   * Buscar oficina por ID
   */
  const getWorkshopById = useCallback((id: string): User | undefined => {
    return workshops.find(workshop => workshop.id === id);
  }, [workshops]);

  /**
   * Buscar oficinas por cidade
   */
  const getWorkshopsByCity = useCallback((city: string): User[] => {
    return workshops.filter(workshop => 
      workshop.city?.toLowerCase().includes(city.toLowerCase())
    );
  }, [workshops]);

  /**
   * Buscar oficinas por estado
   */
  const getWorkshopsByState = useCallback((state: string): User[] => {
    return workshops.filter(workshop => 
      workshop.state?.toLowerCase() === state.toLowerCase()
    );
  }, [workshops]);

  /**
   * Obter estatísticas das oficinas
   */
  const getWorkshopStats = useCallback(() => {
    const totalWorkshops = workshops.length;
    const citiesCount = new Set(workshops.map(w => w.city).filter(Boolean)).size;
    const statesCount = new Set(workshops.map(w => w.state).filter(Boolean)).size;
    
    return {
      total: totalWorkshops,
      cities: citiesCount,
      states: statesCount,
      byState: workshops.reduce((acc, workshop) => {
        if (workshop.state) {
          acc[workshop.state] = (acc[workshop.state] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    };
  }, [workshops]);

  /**
   * Refresh manual dos dados
   */
  const refreshWorkshops = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar oficinas:', error);
      toast.error('Erro ao atualizar lista de oficinas');
    }
  }, [refetch]);

  return {
    // Dados
    workshops,
    isLoading,
    error,
    
    // Mutations
    createWorkshop: createWorkshopMutation.mutateAsync,
    updateWorkshop: updateWorkshopMutation.mutateAsync,
    deleteWorkshop: deleteWorkshopMutation.mutateAsync,
    
    // Estados das mutations
    isCreating: createWorkshopMutation.isPending,
    isUpdating: updateWorkshopMutation.isPending,
    isDeleting: deleteWorkshopMutation.isPending,
    
    // Utilitários
    getWorkshopById,
    getWorkshopsByCity,
    getWorkshopsByState,
    getWorkshopStats,
    refreshWorkshops,
    
    // Controle de cache
    invalidateWorkshops: () => queryClient.invalidateQueries({ queryKey: ['workshops'] })
  };
}
