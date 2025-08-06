import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder } from '@/types';
import { calculateFinancialSummary } from '@/utils/financialCalculations';
import { toast } from 'sonner';

/**
 * Serviço para sincronização automática entre tabelas financeiras
 * Garante consistência entre service_orders, financial_transactions, payments e equipment_diagnostics
 */

export interface SyncResult {
  success: boolean;
  updated: number;
  errors: string[];
  warnings: string[];
}

export class FinancialSyncService {
  
  /**
   * Sincroniza payment_status baseado nos valores financeiros
   */
  static async syncPaymentStatus(serviceOrderId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      updated: 0,
      errors: [],
      warnings: []
    };

    try {
      // Buscar ordens de serviço
      let query = supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          status,
          initial_cost,
          final_cost,
          payment_status,
          completed_date,
          created_at,
          service_attendance_type,
          equipment_diagnostics (
            estimated_cost
          )
        `);

      if (serviceOrderId) {
        query = query.eq('id', serviceOrderId);
      }

      const { data: orders, error } = await query;

      if (error) {
        result.success = false;
        result.errors.push(`Erro ao buscar ordens: ${error.message}`);
        return result;
      }

      if (!orders || orders.length === 0) {
        result.warnings.push('Nenhuma ordem encontrada para sincronização');
        return result;
      }

      // Processar cada ordem
      for (const order of orders) {
        try {
          const orderData: ServiceOrder = {
            id: order.id,
            clientName: order.client_name,
            status: order.status,
            initialCost: order.initial_cost,
            finalCost: order.final_cost,
            paymentStatus: order.payment_status,
            completedDate: order.completed_date,
            createdAt: order.created_at,
            serviceAttendanceType: order.service_attendance_type,
            diagnosis: order.equipment_diagnostics?.[0] ? {
              estimatedCost: order.equipment_diagnostics[0].estimated_cost
            } : undefined,
            // Campos obrigatórios com valores padrão
            clientId: '',
            clientEmail: '',
            clientPhone: '',
            clientCpfCnpj: '',
            clientAddressComplement: '',
            clientAddressReference: '',
            technicianId: null,
            technicianName: null,
            scheduledDate: null,
            scheduledTime: '',
            description: '',
            equipmentType: '',
            equipmentModel: null,
            equipmentSerial: null,
            needsPickup: false,
            pickupAddress: null,
            pickupAddressComplement: null,
            pickupCity: null,
            pickupState: null,
            pickupZipCode: null,
            currentLocation: null,
            clientDescription: '',
            images: [],
            serviceItems: []
          };

          const financial = calculateFinancialSummary(orderData);
          
          // Determinar novo payment_status
          let newPaymentStatus = order.payment_status;
          
          if (financial.isOverdue) {
            newPaymentStatus = 'overdue';
          } else if (financial.paymentStatus === 'completed') {
            newPaymentStatus = 'completed';
          } else if (financial.paymentStatus === 'partial') {
            newPaymentStatus = 'partial';
          } else if (financial.paymentStatus === 'advance_paid') {
            newPaymentStatus = 'advance_paid';
          } else {
            newPaymentStatus = 'pending';
          }

          // Atualizar se necessário
          if (newPaymentStatus !== order.payment_status) {
            const { error: updateError } = await supabase
              .from('service_orders')
              .update({ payment_status: newPaymentStatus })
              .eq('id', order.id);

            if (updateError) {
              result.errors.push(`Erro ao atualizar ordem ${order.id}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          }

        } catch (orderError) {
          result.errors.push(`Erro ao processar ordem ${order.id}: ${orderError}`);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Erro geral na sincronização: ${error}`);
    }

    return result;
  }

  /**
   * Cria transação financeira automática baseada na OS
   */
  static async createFinancialTransaction(
    serviceOrderId: string,
    type: 'advance_payment' | 'final_payment' | 'diagnosis_fee',
    amount: number,
    description?: string
  ): Promise<boolean> {
    try {
      const transactionData = {
        service_order_id: serviceOrderId,
        type: 'income',
        amount,
        description: description || this.getTransactionDescription(type),
        category: this.getTransactionCategory(type),
        date: new Date().toISOString().split('T')[0],
        paid_status: 'paid'
      };

      const { error } = await supabase
        .from('financial_transactions')
        .insert(transactionData);

      if (error) {
        console.error('Erro ao criar transação financeira:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar transação financeira:', error);
      return false;
    }
  }

  /**
   * Sincroniza todas as tabelas financeiras
   */
  static async fullSync(): Promise<SyncResult> {
    const result = await this.syncPaymentStatus();
    
    if (result.success) {
      toast.success(`Sincronização concluída. ${result.updated} registros atualizados.`);
    } else {
      toast.error(`Sincronização com erros. ${result.errors.length} erros encontrados.`);
    }

    return result;
  }

  /**
   * Valida consistência entre tabelas
   */
  static async validateConsistency(): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Verificar ordens com payment_status inconsistente
      const { data: inconsistentOrders, error } = await supabase
        .from('service_orders')
        .select('id, client_name, initial_cost, final_cost, payment_status, status')
        .or('payment_status.is.null,payment_status.eq.pending')
        .gt('final_cost', 0);

      if (error) {
        issues.push(`Erro ao verificar consistência: ${error.message}`);
      } else if (inconsistentOrders && inconsistentOrders.length > 0) {
        issues.push(`${inconsistentOrders.length} ordens com payment_status inconsistente`);
      }

      // Verificar transações sem ordem de serviço
      const { data: orphanTransactions, error: orphanError } = await supabase
        .from('financial_transactions')
        .select('id, description')
        .not('service_order_id', 'is', null)
        .not('service_order_id', 'in', 
          `(${await supabase.from('service_orders').select('id').then(r => r.data?.map(o => `'${o.id}'`).join(',') || '')})`
        );

      if (orphanError) {
        issues.push(`Erro ao verificar transações órfãs: ${orphanError.message}`);
      } else if (orphanTransactions && orphanTransactions.length > 0) {
        issues.push(`${orphanTransactions.length} transações sem ordem de serviço válida`);
      }

    } catch (error) {
      issues.push(`Erro na validação de consistência: ${error}`);
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  private static getTransactionDescription(type: string): string {
    switch (type) {
      case 'advance_payment':
        return 'Sinal pago pelo cliente';
      case 'final_payment':
        return 'Pagamento final do serviço';
      case 'diagnosis_fee':
        return 'Taxa de diagnóstico';
      default:
        return 'Transação financeira';
    }
  }

  private static getTransactionCategory(type: string): string {
    switch (type) {
      case 'advance_payment':
        return 'Sinal';
      case 'final_payment':
        return 'Serviço';
      case 'diagnosis_fee':
        return 'Diagnóstico';
      default:
        return 'Outros';
    }
  }
}
