// ===================================================================
// 📊 COMPONENTE DE EXPORTAÇÕES DE RELATÓRIOS (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download,
  FileText,
  File,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  Calendar
} from 'lucide-react';
import { useReportExports } from '@/hooks/useReports';

/**
 * Componente para gerenciar exportações de relatórios
 */
export function ReportExports() {
  const { exports, isLoading } = useReportExports();

  // Dados simulados para desenvolvimento
  const mockExports = [
    {
      id: '1',
      report_id: 'report_1',
      report_title: 'Relatório Operacional - Janeiro 2025',
      format: 'pdf',
      status: 'completed',
      file_url: '/exports/operational_jan_2025.pdf',
      file_size: 2048576, // 2MB
      download_count: 5,
      created_at: '2025-01-19T14:30:00Z',
      expires_at: '2025-01-26T14:30:00Z'
    },
    {
      id: '2',
      report_id: 'report_2',
      report_title: 'Análise Financeira - Q4 2024',
      format: 'excel',
      status: 'processing',
      file_size: 0,
      download_count: 0,
      created_at: '2025-01-19T15:00:00Z',
      expires_at: '2025-01-26T15:00:00Z'
    },
    {
      id: '3',
      report_id: 'report_3',
      report_title: 'Performance de Técnicos - Dezembro',
      format: 'csv',
      status: 'failed',
      error_message: 'Erro ao processar dados de performance',
      file_size: 0,
      download_count: 0,
      created_at: '2025-01-19T13:15:00Z',
      expires_at: '2025-01-26T13:15:00Z'
    },
    {
      id: '4',
      report_id: 'report_4',
      report_title: 'Satisfação do Cliente - 2024',
      format: 'pdf',
      status: 'completed',
      file_url: '/exports/customer_satisfaction_2024.pdf',
      file_size: 1536000, // 1.5MB
      download_count: 12,
      created_at: '2025-01-18T16:45:00Z',
      expires_at: '2025-01-25T16:45:00Z'
    }
  ];

  /**
   * Formatar tamanho do arquivo
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
   * Obter ícone baseado no formato
   */
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <File className="h-4 w-4" />;
      case 'csv':
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  /**
   * Obter cor do badge baseado no status
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processando</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * Obter ícone de status
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * Calcular dias até expirar
   */
  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando exportações...</p>
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
          <h2 className="text-2xl font-bold">Exportações de Relatórios</h2>
          <p className="text-muted-foreground">
            Gerencie e baixe seus relatórios exportados
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Exportações</p>
                <p className="text-2xl font-bold">{mockExports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Concluídas</p>
                <p className="text-2xl font-bold">
                  {mockExports.filter(e => e.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Processando</p>
                <p className="text-2xl font-bold">
                  {mockExports.filter(e => e.status === 'processing').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <File className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Tamanho Total</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(mockExports.reduce((sum, e) => sum + e.file_size, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de exportações */}
      <div className="space-y-4">
        {mockExports.map((exportItem) => {
          const daysUntilExpiry = getDaysUntilExpiry(exportItem.expires_at);
          
          return (
            <Card key={exportItem.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(exportItem.status)}
                      {getFormatIcon(exportItem.format)}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{exportItem.report_title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(exportItem.status)}
                        <Badge variant="outline">
                          {exportItem.format.toUpperCase()}
                        </Badge>
                        {exportItem.file_size > 0 && (
                          <Badge variant="secondary">
                            {formatFileSize(exportItem.file_size)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="font-medium">Criado em</p>
                      <p className="text-muted-foreground">
                        {formatDate(exportItem.created_at)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {exportItem.status === 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="default"
                            size="sm"
                            title="Baixar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
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

                {/* Barra de progresso para processamento */}
                {exportItem.status === 'processing' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Processando relatório...</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                )}

                {/* Erro */}
                {exportItem.status === 'failed' && exportItem.error_message && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{exportItem.error_message}</p>
                  </div>
                )}

                {/* Detalhes adicionais */}
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Downloads</p>
                      <p className="font-medium">{exportItem.download_count} vez(es)</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Expira em</p>
                      <p className="font-medium">
                        {daysUntilExpiry > 0 ? `${daysUntilExpiry} dia(s)` : 'Expirado'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Data de expiração</p>
                      <p className="font-medium">{formatDate(exportItem.expires_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado vazio */}
      {mockExports.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma exportação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Gere relatórios para ver suas exportações aqui
            </p>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
