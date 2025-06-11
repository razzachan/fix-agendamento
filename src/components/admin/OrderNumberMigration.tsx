/**
 * Componente para migração de numeração sequencial de ordens
 * Este componente deve ser usado apenas uma vez para migrar dados existentes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Loader2, Database } from 'lucide-react';
import { useOrderNumber } from '@/hooks/useOrderNumber';
import { supabase } from '@/integrations/supabase/client';

export function OrderNumberMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'checking' | 'running' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    withNumber: number;
    withoutNumber: number;
    migrated: number;
  }>({
    total: 0,
    withNumber: 0,
    withoutNumber: 0,
    migrated: 0
  });

  const { runMigration, isLoading, error } = useOrderNumber();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkCurrentStatus = async () => {
    setMigrationStatus('checking');
    addLog('🔍 Verificando status atual das ordens...');

    try {
      // Verificar se a coluna order_number existe
      const { data: columns, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'service_orders' });

      if (columnError) {
        addLog('❌ Erro ao verificar estrutura da tabela');
        setMigrationStatus('error');
        return;
      }

      const hasOrderNumberColumn = columns?.some((col: any) => col.column_name === 'order_number');

      if (!hasOrderNumberColumn) {
        addLog('⚠️ Coluna order_number não encontrada. Execute a migração SQL primeiro.');
        setMigrationStatus('error');
        return;
      }

      // Contar ordens totais
      const { count: totalCount, error: totalError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        addLog('❌ Erro ao contar ordens totais');
        setMigrationStatus('error');
        return;
      }

      // Contar ordens com order_number
      const { count: withNumberCount, error: withNumberError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .not('order_number', 'is', null);

      if (withNumberError) {
        addLog('❌ Erro ao contar ordens com numeração');
        setMigrationStatus('error');
        return;
      }

      // Contar ordens sem order_number
      const { count: withoutNumberCount, error: withoutNumberError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .is('order_number', null);

      if (withoutNumberError) {
        addLog('❌ Erro ao contar ordens sem numeração');
        setMigrationStatus('error');
        return;
      }

      const newStats = {
        total: totalCount || 0,
        withNumber: withNumberCount || 0,
        withoutNumber: withoutNumberCount || 0,
        migrated: 0
      };

      setStats(newStats);

      addLog(`📊 Status atual:`);
      addLog(`   • Total de ordens: ${newStats.total}`);
      addLog(`   • Com numeração: ${newStats.withNumber}`);
      addLog(`   • Sem numeração: ${newStats.withoutNumber}`);

      if (newStats.withoutNumber === 0) {
        addLog('✅ Todas as ordens já possuem numeração sequencial!');
        setMigrationStatus('completed');
      } else {
        addLog(`⚠️ ${newStats.withoutNumber} ordens precisam de numeração`);
        setMigrationStatus('idle');
      }

    } catch (error) {
      console.error('Erro ao verificar status:', error);
      addLog('❌ Erro inesperado ao verificar status');
      setMigrationStatus('error');
    }
  };

  const runOrderMigration = async () => {
    setMigrationStatus('running');
    setProgress(0);
    addLog('🚀 Iniciando migração de numeração sequencial...');

    try {
      const success = await runMigration();

      if (success) {
        setProgress(100);
        addLog('✅ Migração concluída com sucesso!');
        setMigrationStatus('completed');
        
        // Atualizar estatísticas
        await checkCurrentStatus();
      } else {
        addLog('❌ Migração falhou');
        setMigrationStatus('error');
      }

    } catch (error) {
      console.error('Erro durante migração:', error);
      addLog('❌ Erro durante migração');
      setMigrationStatus('error');
    }
  };

  const addOrderNumberColumn = async () => {
    addLog('🔧 Adicionando coluna order_number...');
    
    try {
      // Executar SQL para adicionar a coluna
      const { error } = await supabase.rpc('add_order_number_column');
      
      if (error) {
        addLog('❌ Erro ao adicionar coluna: ' + error.message);
        setMigrationStatus('error');
        return;
      }

      addLog('✅ Coluna order_number adicionada com sucesso!');
      await checkCurrentStatus();

    } catch (error) {
      console.error('Erro ao adicionar coluna:', error);
      addLog('❌ Erro inesperado ao adicionar coluna');
      setMigrationStatus('error');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migração de Numeração Sequencial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {migrationStatus === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Migração concluída! Todas as ordens agora possuem numeração sequencial.
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error || 'Erro durante a migração. Verifique os logs abaixo.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total de Ordens</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.withNumber}</div>
            <div className="text-sm text-gray-600">Com Numeração</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.withoutNumber}</div>
            <div className="text-sm text-gray-600">Sem Numeração</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.migrated}</div>
            <div className="text-sm text-gray-600">Migradas</div>
          </div>
        </div>

        {/* Progress */}
        {migrationStatus === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da migração</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={checkCurrentStatus}
            disabled={migrationStatus === 'checking' || migrationStatus === 'running'}
            variant="outline"
          >
            {migrationStatus === 'checking' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Verificar Status
          </Button>

          <Button
            onClick={runOrderMigration}
            disabled={migrationStatus === 'running' || stats.withoutNumber === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {migrationStatus === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Executar Migração
          </Button>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <h3 className="font-medium">Logs da Migração:</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">Nenhum log ainda...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
