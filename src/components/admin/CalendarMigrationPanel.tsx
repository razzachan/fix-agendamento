/**
 * 🚀 PAINEL DE MIGRAÇÃO PARA NOVA ARQUITETURA DO CALENDÁRIO
 * 
 * Executa a migração para a fonte única da verdade (calendar_events)
 * Elimina complexidade de múltiplas tabelas
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  error?: string;
}

const CalendarMigrationPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<MigrationStep[]>([
    {
      id: 'create_table',
      name: 'Criar Tabela calendar_events',
      description: 'Criar nova tabela como fonte única da verdade',
      completed: false
    },
    {
      id: 'create_indexes',
      name: 'Criar Índices',
      description: 'Criar índices para performance',
      completed: false
    },
    {
      id: 'create_triggers',
      name: 'Criar Triggers',
      description: 'Criar trigger para updated_at',
      completed: false
    },
    {
      id: 'migrate_scheduled_services',
      name: 'Migrar scheduled_services',
      description: 'Migrar dados de scheduled_services + service_orders',
      completed: false
    },
    {
      id: 'migrate_ai_appointments',
      name: 'Migrar agendamentos_ai',
      description: 'Migrar agendamentos da IA sem ordem de serviço',
      completed: false
    },
    {
      id: 'verify_migration',
      name: 'Verificar Migração',
      description: 'Verificar integridade dos dados migrados',
      completed: false
    }
  ]);

  const updateStep = (stepId: string, completed: boolean, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed, error } : step
    ));
  };

  const executeSQL = async (sql: string, description: string): Promise<boolean> => {
    try {
      console.log(`🔄 Executando: ${description}`);
      console.log(`SQL: ${sql}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`❌ Erro em ${description}:`, error);
        return false;
      }
      
      console.log(`✅ Sucesso: ${description}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro em ${description}:`, error);
      return false;
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    try {
      // Passo 1: Criar tabela
      setCurrentStep(1);
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS calendar_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_name TEXT NOT NULL,
          client_phone TEXT,
          client_id UUID,
          technician_id UUID,
          technician_name TEXT NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          address TEXT NOT NULL,
          address_complement TEXT,
          description TEXT,
          equipment_type TEXT,
          status TEXT NOT NULL DEFAULT 'scheduled',
          service_order_id UUID,
          original_ai_id UUID,
          is_urgent BOOLEAN DEFAULT false,
          logistics_group TEXT,
          final_cost DECIMAL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
        );
      `;
      
      const tableSuccess = await executeSQL(createTableSQL, 'Criar tabela calendar_events');
      updateStep('create_table', tableSuccess, tableSuccess ? undefined : 'Falha ao criar tabela');
      
      if (!tableSuccess) throw new Error('Falha ao criar tabela');

      // Passo 2: Criar índices
      setCurrentStep(2);
      const indexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_technician_id ON calendar_events(technician_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_service_order_id ON calendar_events(service_order_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(start_time, end_time);
      `;
      
      const indexesSuccess = await executeSQL(indexesSQL, 'Criar índices');
      updateStep('create_indexes', indexesSuccess, indexesSuccess ? undefined : 'Falha ao criar índices');

      // Passo 3: Criar triggers
      setCurrentStep(3);
      const triggerSQL = `
        CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON calendar_events;
        CREATE TRIGGER trigger_calendar_events_updated_at
          BEFORE UPDATE ON calendar_events
          FOR EACH ROW
          EXECUTE FUNCTION update_calendar_events_updated_at();
      `;
      
      const triggerSuccess = await executeSQL(triggerSQL, 'Criar triggers');
      updateStep('create_triggers', triggerSuccess, triggerSuccess ? undefined : 'Falha ao criar triggers');

      // Passo 4: Migrar scheduled_services
      setCurrentStep(4);
      const migrateScheduledSQL = `
        INSERT INTO calendar_events (
          client_name, client_phone, client_id, technician_id, technician_name,
          start_time, end_time, address, address_complement, description,
          equipment_type, status, service_order_id, logistics_group, final_cost, created_at
        )
        SELECT 
          s.client_name,
          so.client_phone,
          s.client_id,
          s.technician_id,
          s.technician_name,
          s.scheduled_start_time,
          s.scheduled_end_time,
          s.address,
          s.address_complement,
          s.description,
          so.equipment_type,
          CASE 
            WHEN so.status IS NOT NULL THEN
              CASE so.status
                WHEN 'pending' THEN 'scheduled'
                WHEN 'scheduled' THEN 'scheduled'
                WHEN 'on_the_way' THEN 'on_the_way'
                WHEN 'in_progress' THEN 'in_progress'
                WHEN 'completed' THEN 'completed'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'scheduled'
              END
            ELSE 'scheduled'
          END,
          s.service_order_id,
          s.logistics_group,
          so.final_cost,
          COALESCE(s.created_at, NOW())
        FROM scheduled_services s
        LEFT JOIN service_orders so ON s.service_order_id = so.id
        WHERE s.service_order_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
      `;
      
      const migrateScheduledSuccess = await executeSQL(migrateScheduledSQL, 'Migrar scheduled_services');
      updateStep('migrate_scheduled_services', migrateScheduledSuccess, 
        migrateScheduledSuccess ? undefined : 'Falha ao migrar scheduled_services');

      // Passo 5: Migrar agendamentos_ai
      setCurrentStep(5);
      const migrateAiSQL = `
        INSERT INTO calendar_events (
          client_name, client_phone, technician_id, technician_name,
          start_time, end_time, address, description, equipment_type,
          status, original_ai_id, is_urgent, logistics_group, created_at
        )
        SELECT 
          a.nome,
          a.telefone,
          a.technician_id,
          COALESCE(a.tecnico, 'Não atribuído'),
          COALESCE(a.horario_confirmado, a.data_agendada, NOW() + INTERVAL '1 day'),
          COALESCE(a.horario_confirmado, a.data_agendada, NOW() + INTERVAL '1 day') + INTERVAL '1 hour',
          a.endereco,
          a.problema,
          a.equipamento,
          CASE a.status
            WHEN 'agendado' THEN 'scheduled'
            WHEN 'pendente' THEN 'scheduled'
            ELSE 'scheduled'
          END,
          a.id,
          COALESCE(a.urgente, false),
          a.logistics_group,
          a.created_at
        FROM agendamentos_ai a
        WHERE a.ordem_servico_id IS NULL
          AND a.status IN ('agendado', 'pendente')
        ON CONFLICT (id) DO NOTHING;
      `;
      
      const migrateAiSuccess = await executeSQL(migrateAiSQL, 'Migrar agendamentos_ai');
      updateStep('migrate_ai_appointments', migrateAiSuccess, 
        migrateAiSuccess ? undefined : 'Falha ao migrar agendamentos_ai');

      // Passo 6: Verificar migração
      setCurrentStep(6);
      const { data: verifyData, error: verifyError } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true });

      const verifySuccess = !verifyError;
      updateStep('verify_migration', verifySuccess, 
        verifySuccess ? undefined : 'Falha na verificação');

      if (verifySuccess) {
        toast.success(`🎉 Migração concluída! ${verifyData?.length || 0} eventos migrados`);
      }

    } catch (error) {
      console.error('❌ Erro na migração:', error);
      toast.error('Erro durante a migração');
    } finally {
      setIsRunning(false);
      setCurrentStep(0);
    }
  };

  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migração para Nova Arquitetura do Calendário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>FONTE ÚNICA DA VERDADE:</strong> Esta migração cria a tabela <code>calendar_events</code> 
              como fonte única para todos os eventos, eliminando a complexidade de sincronização entre múltiplas tabelas.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isRunning ? 'Executando Migração...' : 'Executar Migração'}
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da Migração</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  step.completed 
                    ? 'bg-green-50 border-green-200' 
                    : step.error
                    ? 'bg-red-50 border-red-200'
                    : currentStep === index + 1
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : step.error ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : currentStep === index + 1 ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.name}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.error && (
                    <p className="text-sm text-red-600 mt-1">{step.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarMigrationPanel;
