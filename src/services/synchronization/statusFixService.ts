/**
 * 🔧 SERVIÇO DE CORREÇÃO DE INCONSISTÊNCIAS DE STATUS
 * 
 * Este serviço identifica e corrige inconsistências entre as tabelas
 * service_orders e scheduled_services, garantindo que o calendário
 * sempre mostre o status correto.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mapeamento de status ServiceOrder → ScheduledService
const SERVICE_ORDER_TO_SCHEDULED_STATUS = {
  'pending': 'scheduled',
  'scheduled': 'scheduled',
  'scheduled_collection': 'scheduled',
  'on_the_way': 'in_progress',
  'in_progress': 'in_progress',
  'collected': 'in_progress',
  'collected_for_diagnosis': 'in_progress',
  'at_workshop': 'in_progress',
  'received_at_workshop': 'in_progress',
  'diagnosis_completed': 'in_progress',
  'awaiting_quote_approval': 'in_progress',
  'quote_approved': 'in_progress',
  'needs_workshop': 'in_progress',
  'in_repair': 'in_progress',
  'ready_for_delivery': 'in_progress',
  'collected_for_delivery': 'in_progress',
  'on_the_way_to_deliver': 'in_progress',
  'payment_pending': 'in_progress',
  'completed': 'completed',
  'delivered': 'completed',
  'cancelled': 'cancelled',
  'quote_rejected': 'cancelled',
  'returned': 'cancelled'
} as const;

interface InconsistencyReport {
  scheduledId: string;
  clientName: string;
  currentScheduledStatus: string;
  currentOrderStatus: string;
  expectedScheduledStatus: string;
  fixed: boolean;
  error?: string;
}

export class StatusFixService {
  
  /**
   * Identifica todas as inconsistências entre service_orders e scheduled_services
   */
  static async identifyInconsistencies(): Promise<InconsistencyReport[]> {
    try {
      console.log('🔍 [StatusFixService] Identificando inconsistências...');

      const { data, error } = await supabase
        .from('scheduled_services')
        .select(`
          id,
          client_name,
          status,
          service_order_id,
          service_orders!service_order_id(
            status
          )
        `)
        .not('service_order_id', 'is', null);

      if (error) throw error;

      const inconsistencies: InconsistencyReport[] = [];

      for (const scheduled of data) {
        const orderStatus = scheduled.service_orders?.status;
        if (!orderStatus) continue;

        const expectedScheduledStatus = SERVICE_ORDER_TO_SCHEDULED_STATUS[orderStatus as keyof typeof SERVICE_ORDER_TO_SCHEDULED_STATUS];
        
        if (expectedScheduledStatus && scheduled.status !== expectedScheduledStatus) {
          inconsistencies.push({
            scheduledId: scheduled.id,
            clientName: scheduled.client_name,
            currentScheduledStatus: scheduled.status,
            currentOrderStatus: orderStatus,
            expectedScheduledStatus,
            fixed: false
          });
        }
      }

      console.log(`🔍 [StatusFixService] Encontradas ${inconsistencies.length} inconsistências`);
      return inconsistencies;

    } catch (error) {
      console.error('❌ [StatusFixService] Erro ao identificar inconsistências:', error);
      return [];
    }
  }

  /**
   * Corrige uma inconsistência específica
   */
  static async fixInconsistency(inconsistency: InconsistencyReport): Promise<boolean> {
    try {
      console.log(`🔧 [StatusFixService] Corrigindo: ${inconsistency.clientName} (${inconsistency.currentScheduledStatus} → ${inconsistency.expectedScheduledStatus})`);

      const { error } = await supabase
        .from('scheduled_services')
        .update({ status: inconsistency.expectedScheduledStatus })
        .eq('id', inconsistency.scheduledId);

      if (error) throw error;

      console.log(`✅ [StatusFixService] Corrigido: ${inconsistency.clientName}`);
      return true;

    } catch (error) {
      console.error(`❌ [StatusFixService] Erro ao corrigir ${inconsistency.clientName}:`, error);
      return false;
    }
  }

  /**
   * Corrige todas as inconsistências identificadas
   */
  static async fixAllInconsistencies(): Promise<{ fixed: number; errors: number; report: InconsistencyReport[] }> {
    try {
      console.log('🔧 [StatusFixService] Iniciando correção de todas as inconsistências...');

      const inconsistencies = await this.identifyInconsistencies();
      
      if (inconsistencies.length === 0) {
        console.log('✅ [StatusFixService] Nenhuma inconsistência encontrada!');
        toast.success('Sistema já está sincronizado!');
        return { fixed: 0, errors: 0, report: [] };
      }

      let fixed = 0;
      let errors = 0;

      for (const inconsistency of inconsistencies) {
        const success = await this.fixInconsistency(inconsistency);
        
        if (success) {
          inconsistency.fixed = true;
          fixed++;
        } else {
          inconsistency.fixed = false;
          inconsistency.error = 'Falha ao atualizar no banco';
          errors++;
        }
      }

      console.log(`✅ [StatusFixService] Correção concluída: ${fixed} corrigidas, ${errors} erros`);
      
      if (fixed > 0) {
        toast.success(`${fixed} inconsistências corrigidas com sucesso!`);
      }
      
      if (errors > 0) {
        toast.error(`${errors} inconsistências não puderam ser corrigidas`);
      }

      return { fixed, errors, report: inconsistencies };

    } catch (error) {
      console.error('❌ [StatusFixService] Erro geral na correção:', error);
      toast.error('Erro ao corrigir inconsistências');
      return { fixed: 0, errors: 1, report: [] };
    }
  }

  /**
   * Cria um trigger no banco para sincronização automática
   */
  static async createAutoSyncTrigger(): Promise<boolean> {
    try {
      console.log('🔧 [StatusFixService] Criando trigger de sincronização automática...');

      // Função que será executada pelo trigger
      const triggerFunction = `
        CREATE OR REPLACE FUNCTION sync_scheduled_service_status()
        RETURNS TRIGGER AS $$
        DECLARE
          mapped_status TEXT;
        BEGIN
          -- Mapear status da service_order para scheduled_service
          mapped_status := CASE NEW.status
            WHEN 'pending' THEN 'scheduled'
            WHEN 'scheduled' THEN 'scheduled'
            WHEN 'scheduled_collection' THEN 'scheduled'
            WHEN 'on_the_way' THEN 'in_progress'
            WHEN 'in_progress' THEN 'in_progress'
            WHEN 'collected' THEN 'in_progress'
            WHEN 'collected_for_diagnosis' THEN 'in_progress'
            WHEN 'at_workshop' THEN 'in_progress'
            WHEN 'received_at_workshop' THEN 'in_progress'
            WHEN 'diagnosis_completed' THEN 'in_progress'
            WHEN 'awaiting_quote_approval' THEN 'in_progress'
            WHEN 'quote_approved' THEN 'in_progress'
            WHEN 'needs_workshop' THEN 'in_progress'
            WHEN 'in_repair' THEN 'in_progress'
            WHEN 'ready_for_delivery' THEN 'in_progress'
            WHEN 'collected_for_delivery' THEN 'in_progress'
            WHEN 'on_the_way_to_deliver' THEN 'in_progress'
            WHEN 'payment_pending' THEN 'in_progress'
            WHEN 'completed' THEN 'completed'
            WHEN 'delivered' THEN 'completed'
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'quote_rejected' THEN 'cancelled'
            WHEN 'returned' THEN 'cancelled'
            ELSE 'scheduled'
          END;

          -- Atualizar scheduled_services relacionados
          UPDATE scheduled_services 
          SET status = mapped_status
          WHERE service_order_id = NEW.id;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Criar o trigger
      const trigger = `
        DROP TRIGGER IF EXISTS sync_scheduled_status_trigger ON service_orders;
        CREATE TRIGGER sync_scheduled_status_trigger
          AFTER UPDATE OF status ON service_orders
          FOR EACH ROW
          WHEN (OLD.status IS DISTINCT FROM NEW.status)
          EXECUTE FUNCTION sync_scheduled_service_status();
      `;

      // Executar as queries
      const { error: functionError } = await supabase.rpc('exec_sql', { sql: triggerFunction });
      if (functionError) throw functionError;

      const { error: triggerError } = await supabase.rpc('exec_sql', { sql: trigger });
      if (triggerError) throw triggerError;

      console.log('✅ [StatusFixService] Trigger de sincronização criado com sucesso!');
      toast.success('Sincronização automática ativada!');
      return true;

    } catch (error) {
      console.error('❌ [StatusFixService] Erro ao criar trigger:', error);
      toast.error('Erro ao ativar sincronização automática');
      return false;
    }
  }

  /**
   * Executa uma correção completa do sistema
   */
  static async runFullSystemFix(): Promise<void> {
    try {
      console.log('🚀 [StatusFixService] Iniciando correção completa do sistema...');
      
      // 1. Corrigir inconsistências existentes
      const result = await this.fixAllInconsistencies();
      
      // 2. Criar trigger para sincronização automática
      if (result.fixed > 0 || result.errors === 0) {
        await this.createAutoSyncTrigger();
      }

      console.log('🎉 [StatusFixService] Correção completa finalizada!');
      
    } catch (error) {
      console.error('❌ [StatusFixService] Erro na correção completa:', error);
      toast.error('Erro na correção completa do sistema');
    }
  }
}

export default StatusFixService;
