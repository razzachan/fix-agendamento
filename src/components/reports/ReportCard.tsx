// ===================================================================
// 📊 CARD INDIVIDUAL DE RELATÓRIO (MVP 4)
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Clock, 
  Play, 
  Loader2,
  Settings,
  Calendar,
  Download,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { ReportType } from '@/types/reports';
import { ReportFilters } from './ReportFilters';
import { useReports, useReportFilters } from '@/hooks/useReports';

interface ReportCardProps {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime: string;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

/**
 * Card individual para cada tipo de relatório
 */
export function ReportCard({
  type,
  title,
  description,
  icon: Icon,
  estimatedTime,
  isGenerating = false,
  onGenerate
}: ReportCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { generateReport } = useReports();
  const { filters, isValid } = useReportFilters();

  /**
   * Gerar relatório com filtros
   */
  const handleGenerate = async () => {
    if (!isValid()) {
      console.error('Filtros inválidos');
      return;
    }

    try {
      await generateReport(type, filters);
      setIsDialogOpen(false);
      console.log(`✅ Relatório ${type} gerado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao gerar relatório ${type}:`, error);
    }
  };

  /**
   * Obter cor do badge baseado no tipo
   */
  const getBadgeVariant = (reportType: ReportType) => {
    const variants = {
      operational: 'default',
      financial: 'secondary',
      performance: 'outline',
      customer: 'destructive',
      inventory: 'default',
      technician: 'secondary',
      workshop: 'outline'
    };
    return variants[reportType] || 'default';
  };

  /**
   * Obter estatísticas do relatório (simulado)
   */
  const getReportStats = (reportType: ReportType) => {
    const stats = {
      operational: { generated: 45, avgTime: '2.3min', lastGenerated: '2h atrás' },
      financial: { generated: 32, avgTime: '3.1min', lastGenerated: '4h atrás' },
      performance: { generated: 28, avgTime: '2.8min', lastGenerated: '1h atrás' },
      customer: { generated: 15, avgTime: '1.5min', lastGenerated: '6h atrás' },
      inventory: { generated: 22, avgTime: '2.2min', lastGenerated: '3h atrás' },
      technician: { generated: 38, avgTime: '2.5min', lastGenerated: '1h atrás' },
      workshop: { generated: 19, avgTime: '2.7min', lastGenerated: '5h atrás' }
    };
    return stats[reportType] || { generated: 0, avgTime: '0min', lastGenerated: 'Nunca' };
  };

  const stats = getReportStats(type);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <Badge variant={getBadgeVariant(type)} className="mt-1">
                {type}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {estimatedTime}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {description}
        </CardDescription>

        {/* Estatísticas do relatório */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold text-primary">{stats.generated}</div>
            <div className="text-muted-foreground">Gerados</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold text-primary">{stats.avgTime}</div>
            <div className="text-muted-foreground">Tempo Médio</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold text-primary">{stats.lastGenerated}</div>
            <div className="text-muted-foreground">Último</div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1" 
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Gerar
                  </>
                )}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  Gerar {title}
                </DialogTitle>
                <DialogDescription>
                  Configure os filtros e parâmetros para gerar o relatório
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Filtros do relatório */}
                <ReportFilters reportType={type} />

                {/* Preview das configurações */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Resumo da Configuração
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Período:</span>
                      <span className="ml-2 font-medium">{filters.period}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tempo estimado:</span>
                      <span className="ml-2 font-medium">{estimatedTime}</span>
                    </div>
                    {filters.technicianId && (
                      <div>
                        <span className="text-muted-foreground">Técnico:</span>
                        <span className="ml-2 font-medium">Selecionado</span>
                      </div>
                    )}
                    {filters.workshopId && (
                      <div>
                        <span className="text-muted-foreground">Oficina:</span>
                        <span className="ml-2 font-medium">Selecionada</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações do dialog */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    disabled={!isValid() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Relatório
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm"
            className="px-3"
            title="Agendar relatório"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>

        {/* Indicadores visuais */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Popular</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>Exportável</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
