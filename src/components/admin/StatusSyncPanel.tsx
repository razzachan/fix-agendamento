/**
 * 🔧 PAINEL DE SINCRONIZAÇÃO DE STATUS
 * 
 * Componente para administradores corrigirem inconsistências
 * entre service_orders e scheduled_services
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  Database
} from 'lucide-react';
import { StatusFixService } from '@/services/synchronization/statusFixService';

interface InconsistencyReport {
  scheduledId: string;
  clientName: string;
  currentScheduledStatus: string;
  currentOrderStatus: string;
  expectedScheduledStatus: string;
  fixed: boolean;
  error?: string;
}

const StatusSyncPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyReport[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [fixResult, setFixResult] = useState<{ fixed: number; errors: number } | null>(null);

  const handleIdentifyInconsistencies = async () => {
    setIsLoading(true);
    try {
      const result = await StatusFixService.identifyInconsistencies();
      setInconsistencies(result);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro ao identificar inconsistências:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixAllInconsistencies = async () => {
    setIsLoading(true);
    try {
      const result = await StatusFixService.fixAllInconsistencies();
      setFixResult({ fixed: result.fixed, errors: result.errors });
      setInconsistencies(result.report);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro ao corrigir inconsistências:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunFullSystemFix = async () => {
    setIsLoading(true);
    try {
      await StatusFixService.runFullSystemFix();
      // Recarregar inconsistências após correção
      await handleIdentifyInconsistencies();
    } catch (error) {
      console.error('Erro na correção completa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_the_way': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronização de Status - Calendário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleIdentifyInconsistencies}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar Inconsistências
            </Button>

            <Button
              onClick={handleFixAllInconsistencies}
              disabled={isLoading || inconsistencies.length === 0}
              variant="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Corrigir Todas
            </Button>

            <Button
              onClick={handleRunFullSystemFix}
              disabled={isLoading}
              variant="destructive"
            >
              <Zap className="h-4 w-4 mr-2" />
              Correção Completa + Auto-Sync
            </Button>
          </div>

          {lastCheck && (
            <p className="text-sm text-gray-600">
              Última verificação: {lastCheck.toLocaleString('pt-BR')}
            </p>
          )}

          {fixResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Correção concluída: {fixResult.fixed} corrigidas, {fixResult.errors} erros
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {inconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Inconsistências Encontradas ({inconsistencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inconsistencies.map((item, index) => (
                <div
                  key={item.scheduledId}
                  className={`p-3 rounded-lg border ${
                    item.fixed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{item.clientName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">Agendamento:</span>
                        <Badge className={getStatusColor(item.currentScheduledStatus)}>
                          {item.currentScheduledStatus}
                        </Badge>
                        <span className="text-sm text-gray-600">→</span>
                        <Badge className={getStatusColor(item.expectedScheduledStatus)}>
                          {item.expectedScheduledStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">Ordem:</span>
                        <Badge className={getStatusColor(item.currentOrderStatus)}>
                          {item.currentOrderStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {item.fixed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : item.error ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                  </div>
                  {item.error && (
                    <p className="text-sm text-red-600 mt-2">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {inconsistencies.length === 0 && lastCheck && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-green-800">
                Sistema Sincronizado!
              </h3>
              <p className="text-green-600">
                Nenhuma inconsistência encontrada entre as tabelas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatusSyncPanel;
