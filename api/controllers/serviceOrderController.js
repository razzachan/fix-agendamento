import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { NotificationService } from '../services/notificationService.js';
import { v4 as uuidv4 } from 'uuid';

// Status válidos para ordens de serviço
const VALID_STATUSES = [
  'pending',       // Pendente (apenas para pré-agendamentos)
  'scheduled',     // Agendado (status inicial das OS)
  'in_progress',   // Em andamento
  'diagnosis',     // Em diagnóstico
  'awaiting_parts', // Aguardando peças
  'awaiting_approval', // Aguardando aprovação do cliente
  'repair',        // Em reparo
  'testing',       // Em teste
  'completed',     // Concluído
  'delivered',     // Entregue
  'canceled',      // Cancelado
  'returned'       // Devolvido sem reparo
];

// Mapeamento de transições de status permitidas
const ALLOWED_STATUS_TRANSITIONS = {
  'pending': ['scheduled', 'in_progress', 'diagnosis', 'canceled'],
  'scheduled': ['in_progress', 'diagnosis', 'canceled'],
  'in_progress': ['diagnosis', 'awaiting_parts', 'awaiting_approval', 'repair', 'testing', 'completed', 'canceled', 'returned'],
  'diagnosis': ['awaiting_parts', 'awaiting_approval', 'repair', 'testing', 'completed', 'canceled', 'returned'],
  'awaiting_parts': ['repair', 'canceled', 'returned'],
  'awaiting_approval': ['repair', 'canceled', 'returned'],
  'repair': ['testing', 'completed', 'canceled'],
  'testing': ['repair', 'completed', 'canceled'],
  'completed': ['delivered', 'returned'],
  'delivered': [],
  'canceled': [],
  'returned': []
};

const serviceOrderController = {
  // Obter todas as ordens de serviço
  getAllServiceOrders: async (req, res) => {
    try {
      const { includeArchived } = req.query;

      let query = supabase.from('service_orders').select('*');

      // Filtrar ordens arquivadas, a menos que seja explicitamente solicitado para incluí-las
      if (includeArchived !== 'true') {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar ordens de serviço',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(order => mapServiceOrder(order))
      });
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar ordens de serviço',
        details: error.message
      });
    }
  },

  // Obter uma ordem de serviço específica
  getServiceOrderById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error(`Erro ao buscar ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar ordem de serviço',
        details: error.message
      });
    }
  },

  // Obter ordens de serviço por cliente
  getServiceOrdersByClientId: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { includeArchived } = req.query;

      let query = supabase
        .from('service_orders')
        .select('*')
        .eq('client_id', clientId);

      // Filtrar ordens arquivadas, a menos que seja explicitamente solicitado para incluí-las
      if (includeArchived !== 'true') {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar ordens de serviço do cliente',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(order => mapServiceOrder(order))
      });
    } catch (error) {
      console.error(`Erro ao buscar ordens de serviço do cliente ${req.params.clientId}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar ordens de serviço do cliente',
        details: error.message
      });
    }
  },

  // Obter ordens de serviço por técnico
  getServiceOrdersByTechnicianId: async (req, res) => {
    try {
      const { technicianId } = req.params;
      const { includeArchived } = req.query;

      let query = supabase
        .from('service_orders')
        .select('*')
        .eq('technician_id', technicianId);

      // Filtrar ordens arquivadas, a menos que seja explicitamente solicitado para incluí-las
      if (includeArchived !== 'true') {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar ordens de serviço do técnico',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(order => mapServiceOrder(order))
      });
    } catch (error) {
      console.error(`Erro ao buscar ordens de serviço do técnico ${req.params.technicianId}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar ordens de serviço do técnico',
        details: error.message
      });
    }
  },

  // Criar uma nova ordem de serviço
  createServiceOrder: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const serviceOrderData = req.body;
      const id = serviceOrderData.id || uuidv4();
      const createdAt = new Date().toISOString();

      // Validar o status, se fornecido
      const status = serviceOrderData.status || 'scheduled';
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: true,
          message: 'Status inválido',
          details: `Status deve ser um dos seguintes: ${VALID_STATUSES.join(', ')}`
        });
      }

      // Criar registro de progresso inicial
      const progressId = uuidv4();
      const progressEntry = {
        id: progressId,
        service_order_id: id,
        status,
        notes: 'Ordem de serviço criada',
        created_at: createdAt,
        created_by: req.user?.id || 'system'
      };

      // Inserir a ordem de serviço
      const { data, error } = await supabase
        .from('service_orders')
        .insert({
          id,
          client_id: serviceOrderData.clientId,
          client_name: serviceOrderData.clientName,
          client_email: serviceOrderData.clientEmail || null,
          client_phone: serviceOrderData.clientPhone || null,
          client_cpf_cnpj: serviceOrderData.clientCpfCnpj || null,
          client_address: serviceOrderData.clientAddress || null,
          client_address_complement: serviceOrderData.clientAddressComplement || null,
          client_address_reference: serviceOrderData.clientAddressReference || null,
          client_city: serviceOrderData.clientCity || null,
          client_state: serviceOrderData.clientState || null,
          client_zip_code: serviceOrderData.clientZipCode || null,
          technician_id: serviceOrderData.technicianId || null,
          technician_name: serviceOrderData.technicianName || null,
          status,
          created_at: createdAt,
          scheduled_date: serviceOrderData.scheduledDate || null,
          scheduled_time: serviceOrderData.scheduledTime || null,
          completed_date: null,
          description: serviceOrderData.description,
          equipment_type: serviceOrderData.equipmentType,
          equipment_model: serviceOrderData.equipmentModel || null,
          equipment_serial: serviceOrderData.equipmentSerial || null,
          needs_pickup: serviceOrderData.needsPickup || false,
          pickup_address: serviceOrderData.pickupAddress || null,
          pickup_city: serviceOrderData.pickupCity || null,
          pickup_state: serviceOrderData.pickupState || null,
          pickup_zip_code: serviceOrderData.pickupZipCode || null,
          archived: false,
          cancellation_reason: null,
          last_progress_id: progressId
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar ordem de serviço',
          details: error.message
        });
      }

      // Inserir o registro de progresso
      const { error: progressError } = await supabase
        .from('service_order_progress')
        .insert(progressEntry);

      if (progressError) {
        console.error('Erro ao criar registro de progresso:', progressError);
        // Não falhar a operação principal, apenas registrar o erro
      }

      return res.status(201).json({
        success: true,
        message: 'Ordem de serviço criada com sucesso',
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar ordem de serviço',
        details: error.message
      });
    }
  },

  // Atualizar uma ordem de serviço
  updateServiceOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Converter as chaves para o formato do banco de dados
      const dbUpdateData = {};
      Object.keys(updateData).forEach(key => {
        // Converter camelCase para snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbUpdateData[snakeKey] = updateData[key];
      });

      const { data, error } = await supabase
        .from('service_orders')
        .update(dbUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar ordem de serviço',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Ordem de serviço atualizada com sucesso',
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar ordem de serviço',
        details: error.message
      });
    }
  },

  // Excluir uma ordem de serviço
  deleteServiceOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao excluir ordem de serviço',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Ordem de serviço excluída com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao excluir ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao excluir ordem de serviço',
        details: error.message
      });
    }
  },

  // Atribuir técnico a uma ordem de serviço
  assignTechnician: async (req, res) => {
    try {
      const { id } = req.params;
      const { technicianId } = req.body;

      // Buscar informações do técnico
      const { data: technicianData, error: technicianError } = await supabase
        .from('technicians')
        .select('name')
        .eq('id', technicianId)
        .single();

      if (technicianError) {
        return res.status(404).json({
          error: true,
          message: 'Técnico não encontrado',
          details: technicianError.message
        });
      }

      // Atualizar a ordem de serviço
      const { data, error } = await supabase
        .from('service_orders')
        .update({
          technician_id: technicianId,
          technician_name: technicianData.name
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atribuir técnico à ordem de serviço',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Técnico atribuído com sucesso',
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error(`Erro ao atribuir técnico à ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atribuir técnico à ordem de serviço',
        details: error.message
      });
    }
  },

  // Atualizar status de uma ordem de serviço
  updateServiceOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, cancellationReason } = req.body;
      const timestamp = new Date().toISOString();

      // Validar o status
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: true,
          message: 'Status inválido',
          details: `Status deve ser um dos seguintes: ${VALID_STATUSES.join(', ')}`
        });
      }

      // Buscar a ordem de serviço atual para verificar o status atual
      const { data: currentOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: fetchError.message
        });
      }

      // Verificar se a transição de status é permitida
      const currentStatus = currentOrder.status;
      if (currentStatus !== status && !ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(status)) {
        return res.status(400).json({
          error: true,
          message: 'Transição de status não permitida',
          details: `Não é possível mudar de '${currentStatus}' para '${status}'`
        });
      }

      // Preparar dados para atualização
      let updateData = { status };

      // Tratamento específico para diferentes status
      if (status === 'completed') {
        updateData.completed_date = timestamp;
      } else if (status === 'canceled') {
        if (!cancellationReason) {
          return res.status(400).json({
            error: true,
            message: 'Motivo de cancelamento é obrigatório',
            details: 'Forneça um motivo para o cancelamento da ordem de serviço'
          });
        }
        updateData.cancellation_reason = cancellationReason;
      }

      // Criar registro de progresso
      const progressId = uuidv4();
      const progressEntry = {
        id: progressId,
        service_order_id: id,
        status,
        notes: notes || `Status alterado de ${currentStatus} para ${status}`,
        created_at: timestamp,
        created_by: req.user?.id || 'system'
      };

      // Adicionar o ID do progresso aos dados de atualização
      updateData.last_progress_id = progressId;

      // Processar notificações automáticas se status mudou
      if (updateData.status) {
        await NotificationService.processStatusChange(
          id,
          updateData.status,
          updateData.notes || 'Status atualizado via API',
          'API Sistema'
        );
      }

      // Atualizar a ordem de serviço
      const { data, error } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar status da ordem de serviço',
          details: error.message
        });
      }

      // Inserir o registro de progresso
      const { error: progressError } = await supabase
        .from('service_order_progress')
        .insert(progressEntry);

      if (progressError) {
        console.error('Erro ao criar registro de progresso:', progressError);
        // Não falhar a operação principal, apenas registrar o erro
      }

      return res.status(200).json({
        success: true,
        message: 'Status da ordem de serviço atualizado com sucesso',
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar status da ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar status da ordem de serviço',
        details: error.message
      });
    }
  },

  // Obter o histórico de progresso de uma ordem de serviço
  getServiceOrderProgress: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se a ordem de serviço existe
      const { data: orderExists, error: orderError } = await supabase
        .from('service_orders')
        .select('id')
        .eq('id', id)
        .single();

      if (orderError) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: orderError.message
        });
      }

      // Buscar o histórico de progresso
      const { data, error } = await supabase
        .from('service_order_progress')
        .select('*')
        .eq('service_order_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar histórico de progresso',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: data.map(progress => ({
          id: progress.id,
          serviceOrderId: progress.service_order_id,
          status: progress.status,
          notes: progress.notes,
          createdAt: progress.created_at,
          createdBy: progress.created_by
        }))
      });
    } catch (error) {
      console.error(`Erro ao buscar histórico de progresso da ordem de serviço ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar histórico de progresso',
        details: error.message
      });
    }
  }
};

// Função auxiliar para mapear os dados da ordem de serviço
function mapServiceOrder(data) {
  return {
    id: data.id,
    clientId: data.client_id,
    clientName: data.client_name,
    clientEmail: data.client_email,
    clientPhone: data.client_phone,
    clientCpfCnpj: data.client_cpf_cnpj,
    clientAddress: data.client_address,
    clientAddressComplement: data.client_address_complement,
    clientAddressReference: data.client_address_reference,
    clientCity: data.client_city,
    clientState: data.client_state,
    clientZipCode: data.client_zip_code,
    technicianId: data.technician_id,
    technicianName: data.technician_name,
    status: data.status,
    createdAt: data.created_at,
    scheduledDate: data.scheduled_date,
    scheduledTime: data.scheduled_time,
    completedDate: data.completed_date,
    description: data.description,
    equipmentType: data.equipment_type,
    equipmentModel: data.equipment_model,
    equipmentSerial: data.equipment_serial,
    needsPickup: data.needs_pickup,
    pickupAddress: data.pickup_address,
    pickupCity: data.pickup_city,
    pickupState: data.pickup_state,
    pickupZipCode: data.pickup_zip_code,
    archived: data.archived,
    cancellationReason: data.cancellation_reason,
    lastProgressId: data.last_progress_id
  };
}

export default serviceOrderController;
