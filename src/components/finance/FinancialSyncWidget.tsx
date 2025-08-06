import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Database,
  Zap
} from 'lucide-react';
import { useFinancialSync } from '@/hooks/useFinancialSync';

interface FinancialSyncWidgetProps {
  compact?: boolean;
  showActions?: boolean;
}

const FinancialSyncWidget: React.FC<FinancialSyncWidgetProps> = ({
  compact = false,
  showActions = true
}) => {
  const {
    isSyncing,
    syncAll,
    validateConsistency,
    getSyncSummary
  } = useFinancialSync();

  const syncSummary = getSyncSummary();

  const handleSync = async () => {
    await syncAll();
  };

  const handleValidate = async () => {
    await validateConsistency();
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Sincronização Financeira</span>
            </div>
            <div className="flex items-center gap-2">
              {syncSummary && (
                <>
                  {syncSummary.success ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sincronizado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Com erros
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {syncSummary.timeAgo}
                  </span>
                </>
              )}
              {showActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Sincronização Financeira</CardTitle>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={isSyncing}
              >
                <Zap className="h-4 w-4 mr-2" />
                Validar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isSyncing ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-muted-foreground">Sincronizando dados financeiros...</p>
          </div>
        ) : syncSummary ? (
          <div className="space-y-4">
            {/* Status da última sincronização */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {syncSummary.success ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h4 className="font-medium">
                    {syncSummary.success ? 'Sincronização Bem-sucedida' : 'Sincronização com Problemas'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {syncSummary.timeAgo}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {syncSummary.updated}
                </div>
                <div className="text-xs text-muted-foreground">
                  Atualizados
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {syncSummary.updated}
                </div>
                <div className="text-xs text-green-700">
                  Registros Atualizados
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">
                  {syncSummary.errors}
                </div>
                <div className="text-xs text-red-700">
                  Erros Encontrados
                </div>
              </div>
            </div>

            {/* Avisos */}
            {syncSummary.warnings > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  {syncSummary.warnings} avisos encontrados na última sincronização
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Nenhuma Sincronização Executada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Execute uma sincronização para verificar a consistência dos dados financeiros.
            </p>
            {showActions && (
              <Button onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Executar Sincronização
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialSyncWidget;
