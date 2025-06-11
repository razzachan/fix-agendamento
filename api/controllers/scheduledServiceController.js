import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const scheduledServiceController = {
  // Listar todos os agendamentos
  getAllScheduledServices: async (req, res) => {
    try {
      const { page = 0, limit = 20, startDate = null, endDate = null, technicianId = null } = req.query;
      const offset = page * limit;

      let query = supabase
        .from('scheduled_services')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (startDate) {
        query = query.gte('scheduled_date', startDate);
      }

      if (endDate) {
        query = query.lte('scheduled_date', endDate);
      }

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar agendamentos',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(scheduledService => mapScheduledService(scheduledService)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar agendamentos',
        details: error.message
      });
    }
  },

  // Obter um agendamento específico
  getScheduledServiceById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Agendamento não encontrado',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: mapScheduledService(data)
      });
    } catch (error) {
      console.error(`Erro ao buscar agendamento ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar agendamento',
        details: error.message
      });
    }
  },

  // Criar um novo agendamento
  createScheduledService: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const scheduledServiceData = req.body;
      const id = scheduledServiceData.id || uuidv4();
      const createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('scheduled_services')
        .insert({
          id,
          service_order_id: scheduledServiceData.serviceOrderId,
          client_id: scheduledServiceData.clientId,
          client_name: scheduledServiceData.clientName,
          technician_id: scheduledServiceData.technicianId || null,
          technician_name: scheduledServiceData.technicianName || null,
          scheduled_date: scheduledServiceData.scheduledDate,
          scheduled_time: scheduledServiceData.scheduledTime,
          duration_minutes: scheduledServiceData.durationMinutes || 60,
          service_type: scheduledServiceData.serviceType,
          status: scheduledServiceData.status || 'scheduled',
          notes: scheduledServiceData.notes || null,
          created_at: createdAt,
          created_by: req.user?.id || 'system'
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar agendamento',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Agendamento criado com sucesso',
        data: mapScheduledService(data)
      });
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar agendamento',
        details: error.message
      });
    }
  },

  // Atualizar um agendamento
  updateScheduledService: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const scheduledServiceData = req.body;
      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('scheduled_services')
        .update({
          service_order_id: scheduledServiceData.serviceOrderId,
          client_id: scheduledServiceData.clientId,
          client_name: scheduledServiceData.clientName,
          technician_id: scheduledServiceData.technicianId || null,
          technician_name: scheduledServiceData.technicianName || null,
          scheduled_date: scheduledServiceData.scheduledDate,
          scheduled_time: scheduledServiceData.scheduledTime,
          duration_minutes: scheduledServiceData.durationMinutes || 60,
          service_type: scheduledServiceData.serviceType,
          status: scheduledServiceData.status,
          notes: scheduledServiceData.notes || null,
          updated_at: updatedAt,
          updated_by: req.user?.id || 'system'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar agendamento',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: mapScheduledService(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar agendamento ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar agendamento',
        details: error.message
      });
    }
  },

  // Excluir um agendamento
  deleteScheduledService: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('scheduled_services')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao excluir agendamento',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Agendamento excluído com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao excluir agendamento ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao excluir agendamento',
        details: error.message
      });
    }
  },

  // Atualizar status de um agendamento
  updateScheduledServiceStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updatedAt = new Date().toISOString();

      // Validar status
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'rescheduled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: 'Status inválido',
          details: `Status deve ser um dos seguintes: ${validStatuses.join(', ')}`
        });
      }

      const { data, error } = await supabase
        .from('scheduled_services')
        .update({
          status,
          notes: notes || null,
          updated_at: updatedAt,
          updated_by: req.user?.id || 'system'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar status do agendamento',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Status do agendamento atualizado com sucesso',
        data: mapScheduledService(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar status do agendamento ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar status do agendamento',
        details: error.message
      });
    }
  },

  // Obter serviços agendados por técnico
  getScheduledServicesByTechnicianId: async (req, res) => {
    try {
      const { technicianId } = req.params;
      const { startDate = null, endDate = null } = req.query;

      let query = supabase
        .from('scheduled_services')
        .select('*')
        .eq('technician_id', technicianId)
        .order('scheduled_date', { ascending: true });

      if (startDate) {
        query = query.gte('scheduled_date', startDate);
      }

      if (endDate) {
        query = query.lte('scheduled_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar agendamentos do técnico',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(scheduledService => mapScheduledService(scheduledService))
      });
    } catch (error) {
      console.error(`Erro ao buscar agendamentos do técnico ${req.params.technicianId}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar agendamentos do técnico',
        details: error.message
      });
    }
  },

  // Obter serviços agendados por cliente
  getScheduledServicesByClientId: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { startDate = null, endDate = null } = req.query;

      let query = supabase
        .from('scheduled_services')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: true });

      if (startDate) {
        query = query.gte('scheduled_date', startDate);
      }

      if (endDate) {
        query = query.lte('scheduled_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar agendamentos do cliente',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(scheduledService => mapScheduledService(scheduledService))
      });
    } catch (error) {
      console.error(`Erro ao buscar agendamentos do cliente ${req.params.clientId}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar agendamentos do cliente',
        details: error.message
      });
    }
  },

  // Obter serviços agendados por intervalo de datas
  getScheduledServicesByDateRange: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: true,
          message: 'Datas de início e fim são obrigatórias'
        });
      }

      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar agendamentos por intervalo de datas',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(scheduledService => mapScheduledService(scheduledService))
      });
    } catch (error) {
      console.error('Erro ao buscar agendamentos por intervalo de datas:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar agendamentos por intervalo de datas',
        details: error.message
      });
    }
  }
};

// Função auxiliar para mapear os dados do agendamento
function mapScheduledService(data) {
  return {
    id: data.id,
    serviceOrderId: data.service_order_id,
    clientId: data.client_id,
    clientName: data.client_name,
    technicianId: data.technician_id,
    technicianName: data.technician_name,
    scheduledDate: data.scheduled_date,
    scheduledTime: data.scheduled_time,
    durationMinutes: data.duration_minutes,
    serviceType: data.service_type,
    status: data.status,
    notes: data.notes,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by
  };
}

export default scheduledServiceController;
