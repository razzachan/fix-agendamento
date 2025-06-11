import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const serviceOrderProgressController = {
  // Obter histórico de progresso de uma ordem de serviço
  getServiceOrderProgress: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceOrderId } = req.params;

      // Buscar histórico de progresso
      const { data, error } = await supabase
        .from('service_order_progress')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar histórico de progresso',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(item => ({
          id: item.id,
          serviceOrderId: item.service_order_id,
          status: item.status,
          notes: item.notes,
          createdAt: item.created_at,
          createdBy: item.created_by
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de progresso:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao buscar histórico de progresso',
        details: error.message
      });
    }
  },

  // Adicionar um novo registro de progresso
  addServiceOrderProgress: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceOrderId, status, notes, createdBy } = req.body;

      // Verificar se a ordem de serviço existe
      const { data: serviceOrder, error: serviceOrderError } = await supabase
        .from('service_orders')
        .select('id')
        .eq('id', serviceOrderId)
        .single();

      if (serviceOrderError) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: serviceOrderError.message
        });
      }

      // Criar novo registro de progresso
      const progressEntry = {
        id: uuidv4(),
        service_order_id: serviceOrderId,
        status,
        notes,
        created_at: new Date().toISOString(),
        created_by: createdBy
      };

      const { data, error } = await supabase
        .from('service_order_progress')
        .insert(progressEntry)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao adicionar registro de progresso',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Registro de progresso adicionado com sucesso',
        data: {
          id: data.id,
          serviceOrderId: data.service_order_id,
          status: data.status,
          notes: data.notes,
          createdAt: data.created_at,
          createdBy: data.created_by
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar registro de progresso:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao adicionar registro de progresso',
        details: error.message
      });
    }
  }
};

export default serviceOrderProgressController;
