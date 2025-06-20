// ===================================================================
// 📊 HOOK PARA SISTEMA DE RELATÓRIOS (MVP 4)
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReportsService } from '@/services/reports/reportsService';
import {
  Report,
  ReportType,
  ReportFormat,
  ReportFilters,
  ScheduledReport,
  ReportExport,
  ExportOptions
} from '@/types/reports';

/**
 * Hook principal para gerenciamento de relatórios
 */
export function useReports() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);

  /**
   * Gerar relatório
   */
  const generateReportMutation = useMutation({
    mutationFn: ({ type, filters }: { type: ReportType; filters: ReportFilters }) =>
      ReportsService.generateReport(type, filters),
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (report) => {
      setCurrentReport(report);
      setIsGenerating(false);
      console.log('✅ [useReports] Relatório gerado com sucesso');
    },
    onError: (error) => {
      setIsGenerating(false);
      console.error('❌ [useReports] Erro ao gerar relatório:', error);
    }
  });

  /**
   * Exportar relatório
   */
  const exportReportMutation = useMutation({
    mutationFn: ({ 
      reportId, 
      format, 
      options 
    }: { 
      reportId: string; 
      format: ReportFormat; 
      options?: ExportOptions 
    }) =>
      ReportsService.exportReport(reportId, format, options),
    onSuccess: (exportData) => {
      console.log('✅ [useReports] Exportação iniciada:', exportData.id);
      // Invalidar queries de exportações para atualizar lista
      queryClient.invalidateQueries({ queryKey: ['report-exports'] });
    },
    onError: (error) => {
      console.error('❌ [useReports] Erro ao exportar relatório:', error);
    }
  });

  /**
   * Query para relatórios agendados
   */
  const {
    data: scheduledReports = [],
    isLoading: isLoadingScheduled,
    error: scheduledError
  } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: ReportsService.getScheduledReports,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 1000 // 30 segundos
  });

  /**
   * Criar relatório agendado
   */
  const createScheduledReportMutation = useMutation({
    mutationFn: (scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt'>) =>
      ReportsService.createScheduledReport(scheduledReport),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      console.log('✅ [useReports] Relatório agendado criado');
    },
    onError: (error) => {
      console.error('❌ [useReports] Erro ao criar relatório agendado:', error);
    }
  });

  /**
   * Gerar relatório com loading state
   */
  const generateReport = useCallback(async (type: ReportType, filters: ReportFilters) => {
    try {
      const report = await generateReportMutation.mutateAsync({ type, filters });
      return report;
    } catch (error) {
      throw error;
    }
  }, [generateReportMutation]);

  /**
   * Exportar relatório com loading state
   */
  const exportReport = useCallback(async (
    reportId: string, 
    format: ReportFormat, 
    options?: ExportOptions
  ) => {
    try {
      const exportData = await exportReportMutation.mutateAsync({ 
        reportId, 
        format, 
        options 
      });
      return exportData;
    } catch (error) {
      throw error;
    }
  }, [exportReportMutation]);

  /**
   * Criar relatório agendado
   */
  const createScheduledReport = useCallback(async (
    scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt'>
  ) => {
    try {
      const created = await createScheduledReportMutation.mutateAsync(scheduledReport);
      return created;
    } catch (error) {
      throw error;
    }
  }, [createScheduledReportMutation]);

  return {
    // Estados
    isGenerating,
    currentReport,
    scheduledReports,
    isLoadingScheduled,
    
    // Ações
    generateReport,
    exportReport,
    createScheduledReport,
    
    // Estados de loading das mutations
    isExporting: exportReportMutation.isPending,
    isCreatingScheduled: createScheduledReportMutation.isPending,
    
    // Erros
    generateError: generateReportMutation.error,
    exportError: exportReportMutation.error,
    scheduledError,
    createScheduledError: createScheduledReportMutation.error,
    
    // Utilitários
    clearCurrentReport: () => setCurrentReport(null),
    refetchScheduled: () => queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
  };
}

/**
 * Hook para filtros de relatórios
 */
export function useReportFilters() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'month',
    startDate: undefined,
    endDate: undefined,
    technicianId: undefined,
    workshopId: undefined,
    clientId: undefined,
    serviceType: undefined,
    status: undefined,
    region: undefined
  });

  /**
   * Atualizar filtro específico
   */
  const updateFilter = useCallback(<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  /**
   * Resetar filtros
   */
  const resetFilters = useCallback(() => {
    setFilters({
      period: 'month',
      startDate: undefined,
      endDate: undefined,
      technicianId: undefined,
      workshopId: undefined,
      clientId: undefined,
      serviceType: undefined,
      status: undefined,
      region: undefined
    });
  }, []);

  /**
   * Aplicar período predefinido
   */
  const applyPeriod = useCallback((period: ReportFilters['period']) => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'custom':
        // Manter datas atuais para custom
        break;
    }

    setFilters(prev => ({
      ...prev,
      period,
      startDate,
      endDate
    }));
  }, []);

  /**
   * Validar filtros
   */
  const validateFilters = useCallback((): string[] => {
    const errors: string[] = [];

    if (filters.period === 'custom') {
      if (!filters.startDate) {
        errors.push('Data de início é obrigatória para período customizado');
      }
      if (!filters.endDate) {
        errors.push('Data de fim é obrigatória para período customizado');
      }
      if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
        errors.push('Data de início deve ser anterior à data de fim');
      }
    }

    return errors;
  }, [filters]);

  /**
   * Verificar se filtros são válidos
   */
  const isValid = useCallback((): boolean => {
    return validateFilters().length === 0;
  }, [validateFilters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    applyPeriod,
    validateFilters,
    isValid
  };
}

/**
 * Hook para templates de relatórios
 */
export function useReportTemplates() {
  const queryClient = useQueryClient();

  /**
   * Query para templates disponíveis
   */
  const {
    data: templates = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      // TODO: Implementar busca de templates quando houver backend
      return [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  /**
   * Templates padrão do sistema
   */
  const systemTemplates = [
    {
      id: 'operational-summary',
      name: 'Resumo Operacional',
      description: 'Visão geral das operações e ordens de serviço',
      type: 'operational' as ReportType
    },
    {
      id: 'financial-analysis',
      name: 'Análise Financeira',
      description: 'Relatório completo de performance financeira',
      type: 'financial' as ReportType
    },
    {
      id: 'technician-performance',
      name: 'Performance de Técnicos',
      description: 'Análise de produtividade e eficiência dos técnicos',
      type: 'technician' as ReportType
    },
    {
      id: 'customer-satisfaction',
      name: 'Satisfação do Cliente',
      description: 'Análise de satisfação e feedback dos clientes',
      type: 'customer' as ReportType
    }
  ];

  return {
    templates,
    systemTemplates,
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['report-templates'] })
  };
}

/**
 * Hook para histórico de exportações
 */
export function useReportExports() {
  const {
    data: exports = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['report-exports'],
    queryFn: async () => {
      // TODO: Implementar busca de exportações quando houver backend
      return [];
    },
    refetchInterval: 10 * 1000 // 10 segundos
  });

  return {
    exports,
    isLoading,
    error
  };
}
