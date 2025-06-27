import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Rocket, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Download,
  Play,
  Target
} from 'lucide-react';
import { MVPLaunchChecklist, ChecklistCategory, ChecklistItem } from '@/utils/mvpLaunchChecklist';
import { toast } from 'sonner';

interface MVPLaunchChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MVPLaunchChecklistDialog({ open, onOpenChange }: MVPLaunchChecklistDialogProps) {
  const [checklist] = useState(new MVPLaunchChecklist());
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const refreshData = () => {
    const newCategories = checklist.getChecklistByCategory();
    const newStats = checklist.getOverallStats();
    setCategories(newCategories);
    setStats(newStats);
  };

  useEffect(() => {
    if (open) {
      refreshData();
    }
  }, [open]);

  const runAutomatedChecks = async () => {
    setIsRunningChecks(true);
    try {
      await checklist.runAutomatedChecks();
      refreshData();
      toast.success('Verificações automatizadas concluídas!');
    } catch (error) {
      console.error('Erro nas verificações:', error);
      toast.error('Erro durante as verificações automatizadas');
    } finally {
      setIsRunningChecks(false);
    }
  };

  const toggleItemStatus = (itemId: string, completed: boolean) => {
    if (completed) {
      checklist.markItemCompleted(itemId, 'Marcado como completo manualmente');
    } else {
      checklist.markItemFailed(itemId, 'Marcado como pendente');
    }
    refreshData();
  };

  const downloadReport = () => {
    const report = checklist.generateReadinessReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mvp-readiness-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Relatório de prontidão baixado!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'high':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'medium':
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600" />
            Checklist de Lançamento MVP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  onClick={runAutomatedChecks}
                  disabled={isRunningChecks}
                  className="flex-1"
                >
                  {isRunningChecks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executando Verificações...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Executar Verificações Automáticas
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadReport}
                  disabled={isRunningChecks}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Relatório
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          {stats && (
            <div className="grid grid-cols-2 gap-6">
              <Card className={stats.readyForLaunch ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      {stats.readyForLaunch ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      )}
                    </div>
                    <div className="text-lg font-semibold mb-1">
                      {stats.readyForLaunch ? '✅ PRONTO PARA LANÇAMENTO' : '⚠️ NECESSITA AJUSTES'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stats.completionRate.toFixed(1)}% completo
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                      <div className="text-sm text-gray-600">Completos</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.critical - stats.criticalCompleted}</div>
                      <div className="text-sm text-gray-600">Críticos Pendentes</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.criticalCompletionRate.toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Críticos OK</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Progresso Geral */}
          {stats && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso Geral</span>
                    <span>{stats.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="w-full" />
                  <div className="flex justify-between text-sm">
                    <span>Itens Críticos</span>
                    <span>{stats.criticalCompletionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.criticalCompletionRate} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categorias do Checklist */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Itens do Checklist</h3>
            
            {categories.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {category.completedCount}/{category.totalCount}
                      </Badge>
                      <Badge 
                        variant={category.completionRate === 100 ? 'default' : 'secondary'}
                        className={category.completionRate === 100 ? 'bg-green-600' : ''}
                      >
                        {category.completionRate.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={category.completionRate} className="w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <Card key={itemIndex} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 mt-1">
                              {!item.automated && (
                                <Checkbox
                                  checked={item.status === 'completed'}
                                  onCheckedChange={(checked) => 
                                    toggleItemStatus(item.id, checked as boolean)
                                  }
                                />
                              )}
                              {getStatusIcon(item.status)}
                              {getPriorityIcon(item.priority)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium">{item.title}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {item.description}
                                  </div>
                                  {item.details && (
                                    <div className="text-xs text-gray-500 mt-2 italic">
                                      {item.details}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end gap-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      item.priority === 'critical' ? 'border-red-300 text-red-700' :
                                      item.priority === 'high' ? 'border-yellow-300 text-yellow-700' :
                                      item.priority === 'medium' ? 'border-blue-300 text-blue-700' :
                                      'border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    {getPriorityLabel(item.priority)}
                                  </Badge>
                                  {item.automated && (
                                    <Badge variant="secondary" className="text-xs">
                                      Auto
                                    </Badge>
                                  )}
                                </div>
                              </div>
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

          {/* Estado inicial */}
          {categories.length === 0 && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="font-medium mb-2">Checklist de Lançamento MVP</h3>
                  <p className="text-sm">
                    Verifique todos os itens críticos antes do lançamento do sistema.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
