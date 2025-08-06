import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, DollarSign, RefreshCw, FileText, Download } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { validateFinancialConsistency, formatCurrency, calculateFinancialSummary } from '@/utils/financialCalculations';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

interface InconsistencyItem {
  order: ServiceOrder;
  errors: string[];
  warnings: string[];
  financial: ReturnType<typeof calculateFinancialSummary>;
}

const FinancialInconsistencyReport: React.FC = () => {
  const { serviceOrders, isLoading } = useAppData();
  const [inconsistencies, setInconsistencies] = useState<InconsistencyItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Analisar inconsistências
  const analyzeInconsistencies = () => {
    setIsAnalyzing(true);
    
    try {
      const issues: InconsistencyItem[] = [];
      
      serviceOrders.forEach(order => {
        const validation = validateFinancialConsistency(order);
        const financial = calculateFinancialSummary(order);
        
        if (!validation.isValid || validation.warnings.length > 0) {
          issues.push({
            order,
            errors: validation.errors,
            warnings: validation.warnings,
            financial
          });
        }
      });
      
      setInconsistencies(issues);
      setLastAnalysis(new Date());
      
      toast.success(`Análise concluída. ${issues.length} inconsistências encontradas.`);
    } catch (error) {
      console.error('Erro ao analisar inconsistências:', error);
      toast.error('Erro ao analisar inconsistências financeiras');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Executar análise inicial
  useEffect(() => {
    if (!isLoading && serviceOrders.length > 0) {
      analyzeInconsistencies();
    }
  }, [isLoading, serviceOrders.length]);

  // Exportar relatório
  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalOrders: serviceOrders.length,
      inconsistenciesFound: inconsistencies.length,
      details: inconsistencies.map(item => ({
        orderNumber: item.order.orderNumber || item.order.id,
        clientName: item.order.clientName,
        equipmentType: item.order.equipmentType,
        totalAmount: item.financial.totalAmount,
        advancePayment: item.financial.advancePayment,
        pendingAmount: item.financial.pendingAmount,
        paymentStatus: item.financial.paymentStatus,
        errors: item.errors,
        warnings: item.warnings
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-inconsistencias-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const getSeverityColor = (hasErrors: boolean, hasWarnings: boolean) => {
    if (hasErrors) return 'bg-red-100 text-red-800 border-red-200';
    if (hasWarnings) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSeverityIcon = (hasErrors: boolean) => {
    return hasErrors ? '🚨' : '⚠️';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle>Relatório de Inconsistências Financeiras</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeInconsistencies}
              disabled={isAnalyzing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Atualizar'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportReport}
              disabled={inconsistencies.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {lastAnalysis && (
          <p className="text-sm text-muted-foreground">
            Última análise: {lastAnalysis.toLocaleString('pt-BR')}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : inconsistencies.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium mb-2">Nenhuma Inconsistência Encontrada</h3>
            <p className="text-muted-foreground">
              Todos os {serviceOrders.length} pedidos estão com dados financeiros consistentes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">🚨</div>
                    <div>
                      <p className="text-sm text-red-600">Erros Críticos</p>
                      <p className="text-2xl font-bold text-red-700">
                        {inconsistencies.filter(item => item.errors.length > 0).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <p className="text-sm text-yellow-600">Avisos</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {inconsistencies.filter(item => item.warnings.length > 0).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600">Total Analisado</p>
                      <p className="text-2xl font-bold text-blue-700">{serviceOrders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Inconsistências */}
            <div className="space-y-3">
              {inconsistencies.map((item, index) => (
                <Card 
                  key={item.order.id} 
                  className={`border ${getSeverityColor(item.errors.length > 0, item.warnings.length > 0)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">
                          {getSeverityIcon(item.errors.length > 0)}
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {item.order.orderNumber || `#${item.order.id.slice(0, 8)}`} - {item.order.clientName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {item.order.equipmentType}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            {formatCurrency(item.financial.totalAmount)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.financial.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    {/* Detalhes Financeiros */}
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sinal:</span>
                        <p className="font-medium">{formatCurrency(item.financial.advancePayment)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pendente:</span>
                        <p className="font-medium">{formatCurrency(item.financial.pendingAmount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium">{item.financial.statusDescription}</p>
                      </div>
                    </div>

                    {/* Erros e Avisos */}
                    <div className="space-y-2">
                      {item.errors.map((error, errorIndex) => (
                        <div key={errorIndex} className="flex items-start gap-2 text-sm">
                          <div className="text-red-500 mt-0.5">🚨</div>
                          <span className="text-red-700 font-medium">{error}</span>
                        </div>
                      ))}
                      
                      {item.warnings.map((warning, warningIndex) => (
                        <div key={warningIndex} className="flex items-start gap-2 text-sm">
                          <div className="text-yellow-500 mt-0.5">⚠️</div>
                          <span className="text-yellow-700">{warning}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialInconsistencyReport;
