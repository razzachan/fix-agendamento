// ===================================================================
// 📊 LAYOUT PRINCIPAL PARA PÁGINA DE RELATÓRIOS (MVP 4)
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  Settings, 
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Wrench,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useReports, useReportTemplates } from '@/hooks/useReports';
import { ReportCard } from './ReportCard';
import { ReportFilters } from './ReportFilters';
import { ScheduledReports } from './ScheduledReports';
import { ReportExports } from './ReportExports';
import { ReportType } from '@/types/reports';

/**
 * Layout principal da página de relatórios
 */
export function ReportsLayout() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  
  const { 
    isGenerating, 
    currentReport, 
    generateReport,
    clearCurrentReport 
  } = useReports();
  
  const { systemTemplates } = useReportTemplates();

  /**
   * Templates de relatórios organizados por categoria
   */
  const reportCategories = [
    {
      id: 'operational',
      title: 'Relatórios Operacionais',
      description: 'Análise de operações e ordens de serviço',
      icon: BarChart3,
      color: 'bg-blue-500',
      reports: [
        {
          type: 'operational' as ReportType,
          title: 'Resumo Operacional',
          description: 'Visão geral das operações e ordens de serviço',
          icon: FileText,
          estimatedTime: '2-3 min'
        }
      ]
    },
    {
      id: 'financial',
      title: 'Relatórios Financeiros',
      description: 'Análise de performance financeira',
      icon: DollarSign,
      color: 'bg-green-500',
      reports: [
        {
          type: 'financial' as ReportType,
          title: 'Análise Financeira',
          description: 'Relatório completo de receitas, despesas e lucros',
          icon: TrendingUp,
          estimatedTime: '3-4 min'
        }
      ]
    },
    {
      id: 'performance',
      title: 'Relatórios de Performance',
      description: 'Análise de produtividade e eficiência',
      icon: TrendingUp,
      color: 'bg-purple-500',
      reports: [
        {
          type: 'technician' as ReportType,
          title: 'Performance de Técnicos',
          description: 'Análise de produtividade e eficiência dos técnicos',
          icon: Users,
          estimatedTime: '2-3 min'
        },
        {
          type: 'workshop' as ReportType,
          title: 'Performance de Oficinas',
          description: 'Análise de performance das oficinas',
          icon: Wrench,
          estimatedTime: '2-3 min'
        }
      ]
    },
    {
      id: 'customer',
      title: 'Relatórios de Clientes',
      description: 'Análise de satisfação e comportamento',
      icon: Users,
      color: 'bg-orange-500',
      reports: [
        {
          type: 'customer' as ReportType,
          title: 'Satisfação do Cliente',
          description: 'Análise de satisfação e feedback dos clientes',
          icon: Users,
          estimatedTime: '1-2 min'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Relatórios de Estoque',
      description: 'Análise de movimentações e custos',
      icon: Package,
      color: 'bg-indigo-500',
      reports: [
        {
          type: 'inventory' as ReportType,
          title: 'Análise de Estoque',
          description: 'Movimentações, custos e otimizações de estoque',
          icon: Package,
          estimatedTime: '2-3 min'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Avançados</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados e insights para sua operação
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Gerar Relatórios
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendados
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportações
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Aba: Gerar Relatórios */}
        <TabsContent value="generate" className="space-y-6">
          {!currentReport ? (
            <>
              {/* Estatísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Relatórios Disponíveis</p>
                        <p className="text-2xl font-bold">
                          {reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Agendados</p>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Exportações Hoje</p>
                        <p className="text-2xl font-bold">12</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Tempo Médio</p>
                        <p className="text-2xl font-bold">2.5min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Categorias de relatórios */}
              <div className="space-y-6">
                {reportCategories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <category.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.reports.map((report) => (
                          <ReportCard
                            key={report.type}
                            type={report.type}
                            title={report.title}
                            description={report.description}
                            icon={report.icon}
                            estimatedTime={report.estimatedTime}
                            isGenerating={isGenerating && selectedReportType === report.type}
                            onGenerate={() => {
                              setSelectedReportType(report.type);
                              // Será implementado com filtros
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            /* Exibir relatório gerado */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {currentReport.title}
                    </CardTitle>
                    <CardDescription>{currentReport.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {currentReport.metadata.record_count} registros
                    </Badge>
                    <Badge variant="outline">
                      {currentReport.metadata.execution_time}ms
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCurrentReport}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Conteúdo do relatório será implementado */}
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Relatório Gerado</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualização do relatório será implementada na próxima iteração
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba: Relatórios Agendados */}
        <TabsContent value="scheduled">
          <ScheduledReports />
        </TabsContent>

        {/* Aba: Exportações */}
        <TabsContent value="exports">
          <ReportExports />
        </TabsContent>

        {/* Aba: Configurações */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Relatórios</CardTitle>
              <CardDescription>
                Configure preferências e padrões para geração de relatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configurações</h3>
                <p className="text-muted-foreground">
                  Painel de configurações será implementado na próxima iteração
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
