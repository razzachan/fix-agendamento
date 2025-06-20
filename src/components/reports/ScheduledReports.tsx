// ===================================================================
// 📊 COMPONENTE DE RELATÓRIOS AGENDADOS (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  FileText,
  Play,
  Pause,
  Trash2,
  Plus,
  Mail,
  Download
} from 'lucide-react';
import { useReports } from '@/hooks/useReports';

/**
 * Componente para gerenciar relatórios agendados
 */
export function ScheduledReports() {
  const { scheduledReports, isLoadingScheduled } = useReports();

  // Dados simulados para desenvolvimento
  const mockScheduledReports = [
    {
      id: '1',
      name: 'Relatório Operacional Semanal',
      type: 'operational',
      frequency: 'weekly',
      nextRun: '2025-01-20T09:00:00Z',
      lastRun: '2025-01-13T09:00:00Z',
      recipients: ['admin@fixfogoes.com', 'gerente@fixfogoes.com'],
      isActive: true,
      format: 'pdf'
    },
    {
      id: '2',
      name: 'Análise Financeira Mensal',
      type: 'financial',
      frequency: 'monthly',
      nextRun: '2025-02-01T08:00:00Z',
      lastRun: '2025-01-01T08:00:00Z',
      recipients: ['financeiro@fixfogoes.com'],
      isActive: true,
      format: 'excel'
    },
    {
      id: '3',
      name: 'Performance de Técnicos',
      type: 'technician',
      frequency: 'weekly',
      nextRun: '2025-01-21T10:00:00Z',
      lastRun: '2025-01-14T10:00:00Z',
      recipients: ['rh@fixfogoes.com', 'supervisao@fixfogoes.com'],
      isActive: false,
      format: 'pdf'
    }
  ];

  /**
   * Formatar data para exibição
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Obter cor do badge baseado na frequência
   */
  const getFrequencyBadge = (frequency: string) => {
    const variants = {
      daily: 'default',
      weekly: 'secondary',
      monthly: 'outline'
    };
    return variants[frequency as keyof typeof variants] || 'default';
  };

  /**
   * Obter cor do badge baseado no tipo
   */
  const getTypeBadge = (type: string) => {
    const variants = {
      operational: 'default',
      financial: 'secondary',
      technician: 'outline',
      customer: 'destructive'
    };
    return variants[type as keyof typeof variants] || 'default';
  };

  if (isLoadingScheduled) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando relatórios agendados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios Agendados</h2>
          <p className="text-muted-foreground">
            Gerencie relatórios automáticos e suas configurações
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Agendados</p>
                <p className="text-2xl font-bold">{mockScheduledReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Ativos</p>
                <p className="text-2xl font-bold">
                  {mockScheduledReports.filter(r => r.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Próximo em</p>
                <p className="text-2xl font-bold">2h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Enviados Hoje</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de relatórios agendados */}
      <div className="space-y-4">
        {mockScheduledReports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${report.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <FileText className={`h-5 w-5 ${report.isActive ? 'text-green-600' : 'text-gray-600'}`} />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getTypeBadge(report.type)}>
                        {report.type}
                      </Badge>
                      <Badge variant={getFrequencyBadge(report.frequency)}>
                        {report.frequency}
                      </Badge>
                      <Badge variant="outline">
                        {report.format.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="font-medium">Próxima execução</p>
                    <p className="text-muted-foreground">
                      {formatDate(report.nextRun)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      title={report.isActive ? 'Pausar' : 'Ativar'}
                    >
                      {report.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      title="Executar agora"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Detalhes adicionais */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Última execução</p>
                    <p className="font-medium">
                      {report.lastRun ? formatDate(report.lastRun) : 'Nunca'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Destinatários</p>
                    <p className="font-medium">
                      {report.recipients.length} email(s)
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={report.isActive ? 'default' : 'secondary'}>
                      {report.isActive ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vazio */}
      {mockScheduledReports.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum relatório agendado</h3>
            <p className="text-muted-foreground mb-4">
              Configure relatórios automáticos para receber insights regulares
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agendamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
