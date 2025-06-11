import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import { FinancialFilters as IFinancialFilters } from '@/services/financialAnalyticsService';
import { useAppData } from '@/hooks/useAppData';

interface FinancialFiltersProps {
  filters: IFinancialFilters;
  onFiltersChange: (filters: IFinancialFilters) => void;
  disabled?: boolean;
}

export function FinancialFilters({ filters, onFiltersChange, disabled = false }: FinancialFiltersProps) {
  const { technicians } = useAppData();
  const [localFilters, setLocalFilters] = useState<IFinancialFilters>(filters);

  // Sincronizar com props quando mudarem
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  /**
   * Aplicar filtros
   */
  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  /**
   * Resetar filtros para padrão (último mês)
   */
  const handleResetFilters = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const defaultFilters: IFinancialFilters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'all'
    };
    
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  /**
   * Filtros rápidos (períodos predefinidos)
   */
  const handleQuickFilter = (period: 'week' | 'month' | 'quarter' | 'year') => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    const newFilters = {
      ...localFilters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  /**
   * Atualizar filtro local
   */
  const updateLocalFilter = (key: keyof IFinancialFilters, value: string | undefined) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Filtros Rápidos */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Períodos Rápidos</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('week')}
                disabled={disabled}
              >
                Última Semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('month')}
                disabled={disabled}
              >
                Último Mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('quarter')}
                disabled={disabled}
              >
                Último Trimestre
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('year')}
                disabled={disabled}
              >
                Último Ano
              </Button>
            </div>
          </div>

          {/* Filtros Detalhados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Início */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">
                Data Início
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => updateLocalFilter('startDate', e.target.value)}
                  disabled={disabled}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">
                Data Fim
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => updateLocalFilter('endDate', e.target.value)}
                  disabled={disabled}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={localFilters.status || 'all'}
                onValueChange={(value) => updateLocalFilter('status', value as any)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Técnico */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Técnico</Label>
              <Select
                value={localFilters.technicianId || 'all'}
                onValueChange={(value) => updateLocalFilter('technicianId', value === 'all' ? undefined : value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os técnicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      {technician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Serviço</Label>
              <Select
                value={localFilters.serviceType || 'all'}
                onValueChange={(value) => updateLocalFilter('serviceType', value === 'all' ? undefined : value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Coleta diagnostico">Coleta Diagnóstico</SelectItem>
                  <SelectItem value="Coleta conserto">Coleta Conserto</SelectItem>
                  <SelectItem value="Em domicilio">Em Domicílio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleApplyFilters}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Aplicar Filtros
            </Button>
            
            <Button
              variant="outline"
              onClick={handleResetFilters}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>

            {/* Indicador de filtros ativos */}
            {(localFilters.serviceType || localFilters.technicianId || localFilters.status !== 'all') && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                <div className="flex gap-1">
                  {localFilters.serviceType && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {localFilters.serviceType}
                    </span>
                  )}
                  {localFilters.technicianId && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Técnico específico
                    </span>
                  )}
                  {localFilters.status !== 'all' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      {localFilters.status}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
