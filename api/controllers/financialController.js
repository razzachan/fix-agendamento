import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const financialController = {
  // Listar todas as transações financeiras
  getAllTransactions: async (req, res) => {
    try {
      const { page = 0, limit = 20, startDate = null, endDate = null, type = null } = req.query;
      const offset = page * limit;

      let query = supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar transações financeiras',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(transaction => mapTransaction(transaction)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error('Erro ao buscar transações financeiras:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar transações financeiras',
        details: error.message
      });
    }
  },

  // Obter uma transação financeira específica
  getTransactionById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Transação financeira não encontrada',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: mapTransaction(data)
      });
    } catch (error) {
      console.error(`Erro ao buscar transação financeira ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar transação financeira',
        details: error.message
      });
    }
  },

  // Criar uma nova transação financeira
  createTransaction: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const transactionData = req.body;
      const id = transactionData.id || uuidv4();
      const createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          id,
          description: transactionData.description,
          amount: transactionData.amount,
          type: transactionData.type,
          date: transactionData.date || createdAt,
          service_order_id: transactionData.serviceOrderId || null,
          payment_method: transactionData.paymentMethod || null,
          category: transactionData.category || null,
          notes: transactionData.notes || null,
          created_at: createdAt,
          created_by: req.user?.id || 'system'
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar transação financeira',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Transação financeira criada com sucesso',
        data: mapTransaction(data)
      });
    } catch (error) {
      console.error('Erro ao criar transação financeira:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar transação financeira',
        details: error.message
      });
    }
  },

  // Atualizar uma transação financeira
  updateTransaction: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const transactionData = req.body;
      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('financial_transactions')
        .update({
          description: transactionData.description,
          amount: transactionData.amount,
          type: transactionData.type,
          date: transactionData.date,
          service_order_id: transactionData.serviceOrderId || null,
          payment_method: transactionData.paymentMethod || null,
          category: transactionData.category || null,
          notes: transactionData.notes || null,
          updated_at: updatedAt,
          updated_by: req.user?.id || 'system'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar transação financeira',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Transação financeira atualizada com sucesso',
        data: mapTransaction(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar transação financeira ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar transação financeira',
        details: error.message
      });
    }
  },

  // Excluir uma transação financeira
  deleteTransaction: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao excluir transação financeira',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Transação financeira excluída com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao excluir transação financeira ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao excluir transação financeira',
        details: error.message
      });
    }
  },

  // Obter resumo financeiro
  getFinancialSummary: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: true,
          message: 'Datas de início e fim são obrigatórias'
        });
      }

      // Buscar receitas
      const { data: incomeData, error: incomeError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', startDate)
        .lte('date', endDate);

      if (incomeError) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar receitas',
          details: incomeError.message
        });
      }

      // Buscar despesas
      const { data: expenseData, error: expenseError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expenseError) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar despesas',
          details: expenseError.message
        });
      }

      // Calcular totais
      const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = expenseData.reduce((sum, item) => sum + item.amount, 0);
      const balance = totalIncome - totalExpense;

      return res.status(200).json({
        success: true,
        data: {
          totalIncome,
          totalExpense,
          balance,
          period: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      console.error('Erro ao gerar resumo financeiro:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao gerar resumo financeiro',
        details: error.message
      });
    }
  },

  // Obter transações por ordem de serviço
  getTransactionsByServiceOrderId: async (req, res) => {
    try {
      const { serviceOrderId } = req.params;

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('date', { ascending: false });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar transações da ordem de serviço',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(transaction => mapTransaction(transaction))
      });
    } catch (error) {
      console.error(`Erro ao buscar transações da ordem de serviço ${req.params.serviceOrderId}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar transações da ordem de serviço',
        details: error.message
      });
    }
  },

  // Obter transações por tipo
  getTransactionsByType: async (req, res) => {
    try {
      const { type } = req.params;
      const { page = 0, limit = 20, startDate = null, endDate = null } = req.query;
      const offset = page * limit;

      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('type', type)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) {
        return res.status(400).json({
          error: true,
          message: `Erro ao buscar transações do tipo ${type}`,
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(transaction => mapTransaction(transaction)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error(`Erro ao buscar transações do tipo ${req.params.type}:`, error);
      return res.status(500).json({
        error: true,
        message: `Erro ao buscar transações do tipo ${req.params.type}`,
        details: error.message
      });
    }
  },

  // Obter transações por status de pagamento
  getTransactionsByStatus: async (req, res) => {
    try {
      const { status } = req.params;
      const { page = 0, limit = 20, startDate = null, endDate = null } = req.query;
      const offset = page * limit;

      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('paid_status', status)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) {
        return res.status(400).json({
          error: true,
          message: `Erro ao buscar transações com status ${status}`,
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(transaction => mapTransaction(transaction)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error(`Erro ao buscar transações com status ${req.params.status}:`, error);
      return res.status(500).json({
        error: true,
        message: `Erro ao buscar transações com status ${req.params.status}`,
        details: error.message
      });
    }
  },

  // Atualizar status de pagamento de uma transação
  updateTransactionStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { paidStatus } = req.body;
      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('financial_transactions')
        .update({
          paid_status: paidStatus,
          updated_at: updatedAt,
          updated_by: req.user?.id || 'system'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar status de pagamento',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Status de pagamento atualizado com sucesso',
        data: mapTransaction(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar status de pagamento da transação ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar status de pagamento',
        details: error.message
      });
    }
  }
};

// Função auxiliar para mapear os dados da transação
function mapTransaction(data) {
  return {
    id: data.id,
    description: data.description,
    amount: data.amount,
    type: data.type,
    date: data.date,
    serviceOrderId: data.service_order_id,
    paymentMethod: data.payment_method,
    category: data.category,
    notes: data.notes,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by
  };
}

export default financialController;
