import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Download,
  RefreshCw,
  Bug
} from 'lucide-react';
import { SystemTester, TestSuite, TestResult } from '@/utils/systemTesting';
import { toast } from 'sonner';

interface SystemTestingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemTestingDialog({ open, onOpenChange }: SystemTestingDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    
    try {
      const tester = new SystemTester();
      
      // Simular progresso durante os testes
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 100);
      
      setCurrentTest('Iniciando testes do sistema...');
      const results = await tester.runAllTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentTest('Testes concluídos!');
      setTestResults(results);
      
      const totalTests = results.reduce((sum, suite) => sum + suite.totalTests, 0);
      const passedTests = results.reduce((sum, suite) => sum + suite.passedTests, 0);
      const failedTests = results.reduce((sum, suite) => sum + suite.failedTests, 0);
      
      if (failedTests === 0) {
        toast.success(`✅ Todos os ${totalTests} testes passaram!`);
      } else {
        toast.warning(`⚠️ ${passedTests}/${totalTests} testes passaram. ${failedTests} falharam.`);
      }
      
    } catch (error) {
      console.error('Erro durante os testes:', error);
      toast.error('Erro durante a execução dos testes');
      setCurrentTest('Erro durante os testes');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (testResults.length === 0) return;
    
    const tester = new SystemTester();
    // Hack para acessar o método generateReport
    (tester as any).results = testResults;
    const report = tester.generateReport();
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-test-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Relatório baixado com sucesso!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const calculateOverallStats = () => {
    const totalTests = testResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passedTests = testResults.reduce((sum, suite) => sum + suite.passedTests, 0);
    const failedTests = testResults.reduce((sum, suite) => sum + suite.failedTests, 0);
    const warningTests = testResults.reduce((sum, suite) => sum + suite.warningTests, 0);
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    return { totalTests, passedTests, failedTests, warningTests, successRate };
  };

  const stats = calculateOverallStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-blue-600" />
            Testes do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controles de Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={runTests}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executando Testes...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Executar Todos os Testes
                    </>
                  )}
                </Button>
                
                {testResults.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={downloadReport}
                    disabled={isRunning}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Relatório
                  </Button>
                )}
              </div>
              
              {isRunning && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentTest}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          {testResults.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalTests}</div>
                    <div className="text-sm text-gray-600">Total de Testes</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.passedTests}</div>
                    <div className="text-sm text-gray-600">Passou</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.failedTests}</div>
                    <div className="text-sm text-gray-600">Falhou</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Taxa de Sucesso</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resultados dos Testes */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resultados dos Testes</h3>
              
              {testResults.map((suite, suiteIndex) => (
                <Card key={suiteIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{suite.suiteName}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {suite.passedTests} ✅
                        </Badge>
                        {suite.failedTests > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {suite.failedTests} ❌
                          </Badge>
                        )}
                        {suite.warningTests > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            {suite.warningTests} ⚠️
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {suite.totalTests} testes • {suite.totalDuration}ms
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {suite.results.map((result, resultIndex) => (
                        <Card 
                          key={resultIndex} 
                          className={`border ${getStatusColor(result.status)}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1">
                                {getStatusIcon(result.status)}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{result.testName}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {result.message}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {result.duration}ms
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Estado inicial */}
          {testResults.length === 0 && !isRunning && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <Bug className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="font-medium mb-2">Testes do Sistema</h3>
                  <p className="text-sm mb-4">
                    Execute testes automatizados para validar todas as funcionalidades críticas do sistema.
                  </p>
                  <div className="text-xs text-gray-400">
                    <div>• Sistema de Comentários</div>
                    <div>• Validação de Geolocalização</div>
                    <div>• Conectividade do Banco</div>
                    <div>• Sistema de Notificações</div>
                    <div>• Ciclo de Vida das Ordens</div>
                    <div>• Sistema de Autenticação</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
