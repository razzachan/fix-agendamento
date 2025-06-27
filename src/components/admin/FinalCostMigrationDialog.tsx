import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { migrateFinalCostValues, checkFinalCostStatus } from '@/utils/migrateFinalCostValues';

interface FinalCostMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinalCostMigrationDialog({ open, onOpenChange }: FinalCostMigrationDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const statusData = await checkFinalCostStatus();
      setStatus(statusData);
      console.log('📊 Status dos valores:', statusData);
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      toast.error('Erro ao verificar status dos valores');
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const results = await migrateFinalCostValues();
      setMigrationResults(results);
      
      if (results.updated > 0) {
        toast.success(`✅ ${results.updated} ordens atualizadas com sucesso!`);
      }
      
      if (results.errors > 0) {
        toast.warning(`⚠️ ${results.errors} erros durante a migração`);
      }

      // Atualizar status após migração
      await handleCheckStatus();
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      toast.error('Erro durante a migração');
    } finally {
      setIsMigrating(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      handleCheckStatus();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Migração de Valores Final Cost
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Status Atual dos Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isChecking ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando status...</span>
                </div>
              ) : status ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total de OS:</span>
                      <Badge variant="outline">{status.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Com valores:</span>
                      <Badge variant="default" className="bg-green-600">{status.withValues}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sem valores:</span>
                      <Badge variant="secondary">{status.withoutValues}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Precisam migração:</span>
                      <Badge variant="destructive">{status.needsMigration}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Clique em "Verificar Status" para ver os dados</div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCheckStatus}
              disabled={isChecking || isMigrating}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Status'
              )}
            </Button>

            <Button 
              onClick={handleMigration}
              disabled={isMigrating || isChecking || !status?.needsMigration}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                'Executar Migração'
              )}
            </Button>
          </div>

          {/* Resultados da Migração */}
          {migrationResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados da Migração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Atualizadas: {migrationResults.updated}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>Erros: {migrationResults.errors}</span>
                    </div>
                  </div>

                  {migrationResults.details.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {migrationResults.details.map((detail: any, index: number) => (
                        <div 
                          key={index}
                          className={`text-xs p-2 rounded ${
                            detail.status === 'success' 
                              ? 'bg-green-50 text-green-800' 
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          <strong>OS {detail.id}:</strong> {detail.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">O que esta migração faz:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Busca OS com final_cost = 0 mas que têm valores na descrição</li>
              <li>• Extrai o valor da descrição usando regex</li>
              <li>• Atualiza o campo final_cost no banco de dados</li>
              <li>• Corrige dashboards e relatórios financeiros</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
