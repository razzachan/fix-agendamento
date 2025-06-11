import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const technicianController = {
  // Listar todos os técnicos
  getAllTechnicians: async (req, res) => {
    try {
      const { page = 0, limit = 20, search = null } = req.query;
      const offset = page * limit;

      let query = supabase
        .from('technicians')
        .select('*')
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%, phone.ilike.%${search}%, email.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar técnicos',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(technician => mapTechnician(technician)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar técnicos',
        details: error.message
      });
    }
  },

  // Obter um técnico específico
  getTechnicianById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Técnico não encontrado',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: mapTechnician(data)
      });
    } catch (error) {
      console.error(`Erro ao buscar técnico ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar técnico',
        details: error.message
      });
    }
  },

  // Criar um novo técnico
  createTechnician: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const technicianData = req.body;
      const id = technicianData.id || uuidv4();
      const createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('technicians')
        .insert({
          id,
          name: technicianData.name,
          email: technicianData.email || null,
          phone: technicianData.phone || null,
          specialties: technicianData.specialties || [],
          active: technicianData.active !== undefined ? technicianData.active : true,
          notes: technicianData.notes || null,
          created_at: createdAt,
          updated_at: createdAt
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar técnico',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Técnico criado com sucesso',
        data: mapTechnician(data)
      });
    } catch (error) {
      console.error('Erro ao criar técnico:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar técnico',
        details: error.message
      });
    }
  },

  // Atualizar um técnico
  updateTechnician: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const technicianData = req.body;
      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('technicians')
        .update({
          name: technicianData.name,
          email: technicianData.email || null,
          phone: technicianData.phone || null,
          specialties: technicianData.specialties || [],
          active: technicianData.active !== undefined ? technicianData.active : true,
          notes: technicianData.notes || null,
          updated_at: updatedAt
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar técnico',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Técnico atualizado com sucesso',
        data: mapTechnician(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar técnico ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar técnico',
        details: error.message
      });
    }
  },

  // Excluir um técnico
  deleteTechnician: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('technicians')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao excluir técnico',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Técnico excluído com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao excluir técnico ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao excluir técnico',
        details: error.message
      });
    }
  },

  // Atualizar localização do técnico
  updateTechnicianLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      const updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('technicians')
        .update({
          last_location_lat: latitude,
          last_location_lng: longitude,
          last_location_updated: updatedAt
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar localização do técnico',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Localização do técnico atualizada com sucesso',
        data: {
          id: data.id,
          latitude: data.last_location_lat,
          longitude: data.last_location_lng,
          updatedAt: data.last_location_updated
        }
      });
    } catch (error) {
      console.error(`Erro ao atualizar localização do técnico ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar localização do técnico',
        details: error.message
      });
    }
  },

  // Obter técnicos disponíveis
  getAvailableTechnicians: async (req, res) => {
    try {
      const { date } = req.query;

      // Buscar técnicos ativos
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar técnicos disponíveis',
          details: error.message
        });
      }

      // Se uma data foi especificada, verificar agendamentos existentes
      if (date) {
        // Buscar agendamentos para a data especificada
        const { data: scheduledServices, error: scheduledError } = await supabase
          .from('scheduled_services')
          .select('technician_id, scheduled_date, scheduled_time, duration_minutes')
          .eq('scheduled_date', date);

        if (scheduledError) {
          return res.status(400).json({
            error: true,
            message: 'Erro ao verificar agendamentos',
            details: scheduledError.message
          });
        }

        // Mapear técnicos com suas disponibilidades
        const techniciansWithAvailability = data.map(technician => {
          const technicianSchedules = scheduledServices.filter(
            service => service.technician_id === technician.id
          );

          return {
            ...mapTechnician(technician),
            schedules: technicianSchedules.map(schedule => ({
              date: schedule.scheduled_date,
              time: schedule.scheduled_time,
              durationMinutes: schedule.duration_minutes
            }))
          };
        });

        return res.status(200).json({
          success: true,
          data: techniciansWithAvailability
        });
      }

      // Se nenhuma data foi especificada, retornar apenas os técnicos ativos
      return res.status(200).json({
        success: true,
        data: data.map(technician => mapTechnician(technician))
      });
    } catch (error) {
      console.error('Erro ao buscar técnicos disponíveis:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar técnicos disponíveis',
        details: error.message
      });
    }
  }
};

// Função auxiliar para mapear os dados do técnico
function mapTechnician(data) {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    specialties: data.specialties || [],
    active: data.active,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export default technicianController;
