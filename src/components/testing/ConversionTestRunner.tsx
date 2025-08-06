import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  RefreshCw,
  Bug,
  TestTube
} from 'lucide-react';
import { ConversionFlowTests, TestResult } from '@/tests/conversionFlowTests';
import { toast } from 'sonner';

const ConversionTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    
    try {
      toast.info('Iniciando testes de conversões...');
      
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const results = await ConversionFlowTests.runAllTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);
      
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      
      if (passed === total) {
        toast.success(`Todos os ${total} testes passaram! 🎉`);
      } else {
        toast.warning(`${passed}/${total} testes passaram. Verifique os erros.`);
      }
      
    } catch (error) {
      console.error('Erro ao executar testes:', error);
      toast.error('Erro ao executar testes');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const downloadReport = () => {
    if (testResults.length === 0) {
      toast.warning('Execute os testes primeiro');
      return;
    }

    const report = ConversionFlowTests.generateTestReport(testResults);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-testes-conversoes-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório baixado com sucesso!');
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="w-6 h-6" />
            Testes de Conversões
          </h2>
          <p className="text-muted-foreground">
            Validação completa do fluxo de tracking e conversões
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={downloadReport}
            disabled={testResults.length === 0}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório
          </Button>
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Testes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso dos Testes</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {currentTest && (
                <p className="text-sm text-muted-foreground">
                  Executando: {currentTest}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Resultados */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Testes</p>
                  <p className="text-2xl font-bold">{totalTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-green-600">{passedTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Falharam</p>
                  <p className="text-2xl font-bold text-red-600">{totalTests - passedTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-purple-600">{passRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resultados Detalhados */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Resultados Detalhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.passed)}
                    <div>
                      <h4 className="font-medium">{result.testName}</h4>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(result.passed)}>
                    {result.passed ? 'PASSOU' : 'FALHOU'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      {testResults.length === 0 && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium">Execute os Testes</h4>
                <p className="text-sm text-muted-foreground">
                  Clique em "Executar Testes" para validar todo o fluxo de conversões
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium">Analise os Resultados</h4>
                <p className="text-sm text-muted-foreground">
                  Verifique quais testes passaram e quais falharam
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium">Baixe o Relatório</h4>
                <p className="text-sm text-muted-foreground">
                  Gere um relatório detalhado para documentação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cenários Testados */}
      <Card>
        <CardHeader>
          <CardTitle>Cenários Testados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Tracking Básico:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Armazenamento de GCLID</li>
                <li>• Parâmetros UTM completos</li>
                <li>• Persistência de dados</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Cenários de Serviço:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Serviço em domicílio</li>
                <li>• Coleta para diagnóstico</li>
                <li>• Coleta para conserto</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Relacionamentos:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Vinculação pai-filho</li>
                <li>• Auto-link de ordens</li>
                <li>• Atualização de conversões</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Exportação:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Formato CSV correto</li>
                <li>• Validação de dados</li>
                <li>• Integridade das conversões</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionTestRunner;
