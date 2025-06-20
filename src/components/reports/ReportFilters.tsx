// ===================================================================
// 📊 COMPONENTE DE FILTROS PARA RELATÓRIOS (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Filter,
  X,
  Users,
  Wrench,
  MapPin,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useReportFilters } from '@/hooks/useReports';
import { useTechniciansData } from '@/hooks/data/useTechniciansData';
import { useWorkshopsData } from '@/hooks/data/useWorkshopsData';
import { ReportType, ReportPeriod } from '@/types/reports';

interface ReportFiltersProps {
  reportType: ReportType;
  className?: string;
}

/**
 * Componente de filtros avançados para relatórios
 */
export function ReportFilters({ reportType, className }: ReportFiltersProps) {
  const { 
    filters, 
    updateFilter, 
    resetFilters, 
    applyPeriod, 
    validateFilters,
    isValid 
  } = useReportFilters();
  
  const { technicians } = useTechniciansData();
  const { workshops } = useWorkshopsData();

  /**
   * Períodos disponíveis
   */
  const periods: { value: ReportPeriod; label: string; description: string }[] = [
    { value: 'today', label: 'Hoje', description: 'Apenas hoje' },
    { value: 'week', label: 'Esta Semana', description: 'Últimos 7 dias' },
    { value: 'month', label: 'Este Mês', description: 'Mês atual' },
    { value: 'quarter', label: 'Este Trimestre', description: 'Trimestre atual' },
    { value: 'year', label: 'Este Ano', description: 'Ano atual' },
    { value: 'custom', label: 'Personalizado', description: 'Período customizado' }
  ];

  /**
   * Tipos de serviço
   */
  const serviceTypes = [
    { value: 'em_domicilio', label: 'Em Domicílio' },
    { value: 'coleta_diagnostico', label: 'Coleta para Diagnóstico' },
    { value: 'coleta_conserto', label: 'Coleta para Conserto' }
  ];

  /**
   * Status de ordens de serviço
   */
  const orderStatuses = [
    { value: 'scheduled', label: 'Agendado' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'completed', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  /**
   * Verificar se filtro está ativo
   */
  const hasActiveFilters = () => {
    return filters.technicianId || 
           filters.workshopId || 
           filters.clientId || 
           filters.serviceType || 
           filters.status || 
           filters.region ||
           filters.period === 'custom';
  };

  /**
   * Obter filtros específicos por tipo de relatório
   */
  const getRelevantFilters = () => {
    const baseFilters = ['period'];
    
    switch (reportType) {
      case 'operational':
        return [...baseFilters, 'technician', 'workshop', 'serviceType', 'status'];
      case 'financial':
        return [...baseFilters, 'serviceType', 'status'];
      case 'performance':
      case 'technician':
        return [...baseFilters, 'technician', 'region'];
      case 'workshop':
        return [...baseFilters, 'workshop', 'region'];
      case 'customer':
        return [...baseFilters, 'region', 'serviceType'];
      case 'inventory':
        return [...baseFilters, 'technician', 'workshop'];
      default:
        return baseFilters;
    }
  };

  const relevantFilters = getRelevantFilters();
  const errors = validateFilters();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros do Relatório
        </CardTitle>
        <CardDescription>
          Configure os parâmetros para personalizar seu relatório
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Período */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Período
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={filters.period === period.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPeriod(period.value)}
                className="justify-start"
              >
                {period.label}
              </Button>
            ))}
          </div>
          
          {/* Datas customizadas */}
          {filters.period === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Técnico */}
        {relevantFilters.includes('technician') && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Técnico
            </Label>
            <Select
              value={filters.technicianId || ''}
              onValueChange={(value) => updateFilter('technicianId', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os técnicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os técnicos</SelectItem>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Oficina */}
        {relevantFilters.includes('workshop') && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Oficina
            </Label>
            <Select
              value={filters.workshopId || ''}
              onValueChange={(value) => updateFilter('workshopId', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as oficinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as oficinas</SelectItem>
                {workshops.map((workshop) => (
                  <SelectItem key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tipo de Serviço */}
        {relevantFilters.includes('serviceType') && (
          <div className="space-y-2">
            <Label>Tipo de Serviço</Label>
            <Select
              value={filters.serviceType || ''}
              onValueChange={(value) => updateFilter('serviceType', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status */}
        {relevantFilters.includes('status') && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => updateFilter('status', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Região */}
        {relevantFilters.includes('region') && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Região
            </Label>
            <Input
              placeholder="Digite a região (opcional)"
              value={filters.region || ''}
              onChange={(e) => updateFilter('region', e.target.value || undefined)}
            />
          </div>
        )}

        {/* Filtros ativos */}
        {hasActiveFilters() && (
          <div className="space-y-2">
            <Label>Filtros Ativos</Label>
            <div className="flex flex-wrap gap-2">
              {filters.technicianId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Técnico selecionado
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('technicianId', undefined)}
                  />
                </Badge>
              )}
              {filters.workshopId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Oficina selecionada
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('workshopId', undefined)}
                  />
                </Badge>
              )}
              {filters.serviceType && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {serviceTypes.find(t => t.value === filters.serviceType)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('serviceType', undefined)}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {orderStatuses.find(s => s.value === filters.status)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('status', undefined)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Erros de validação */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-destructive">Erros de Validação</Label>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {isValid() ? 'Filtros válidos' : 'Verifique os filtros'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
