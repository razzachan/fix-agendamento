import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, differenceInDays } from 'date-fns';

// Mapear uma ordem de serviço do formato do banco de dados para o formato da API
const mapServiceOrder = (order) => {
  if (!order) return null;

  return {
    id: order.id,
    clientId: order.client_id,
    clientName: order.client_name,
    clientEmail: order.client_email,
    clientPhone: order.client_phone,
    clientCpfCnpj: order.client_cpf_cnpj,
    clientAddressComplement: order.client_address_complement,
    clientAddressReference: order.client_address_reference,
    clientCity: order.client_city,
    clientState: order.client_state,
    clientZipCode: order.client_zip_code,
    clientFullAddress: order.client_full_address,
    technicianId: order.technician_id,
    technicianName: order.technician_name,
    status: order.status,
    createdAt: order.created_at,
    scheduledDate: order.scheduled_date,
    scheduledTime: order.scheduled_time,
    completedDate: order.completed_date,
    description: order.description,
    equipmentType: order.equipment_type,
    equipmentModel: order.equipment_model,
    equipmentSerial: order.equipment_serial,
    needsPickup: order.needs_pickup,
    pickupAddress: order.pickup_address,
    pickupCity: order.pickup_city,
    pickupState: order.pickup_state,
    pickupZipCode: order.pickup_zip_code,
    currentLocation: order.current_location,
    serviceAttendanceType: order.service_attendance_type,
    relatedWarrantyOrderId: order.related_warranty_order_id,
    warrantyPeriod: order.warranty_period,
    warrantyStartDate: order.warranty_start_date,
    warrantyEndDate: order.warranty_end_date,
    warrantyTerms: order.warranty_terms
  };
};

// Calcular a data de término da garantia
const calculateWarrantyEndDate = (startDate, warrantyPeriod) => {
  const start = new Date(startDate);
  return addMonths(start, warrantyPeriod);
};

// Calcular dias restantes de garantia
const calculateRemainingDays = (today, endDate) => {
  return differenceInDays(endDate, today);
};

const warrantyController = {
  // Configurar garantia para uma ordem de serviço
  configureWarranty: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceOrderId, warrantyPeriod, warrantyStartDate, warrantyEndDate, warrantyTerms } = req.body;

      // Atualizar a ordem de serviço com as informações de garantia
      const { data, error } = await supabase
        .from('service_orders')
        .update({
          warranty_period: warrantyPeriod,
          warranty_start_date: warrantyStartDate,
          warranty_end_date: warrantyEndDate,
          warranty_terms: warrantyTerms
        })
        .eq('id', serviceOrderId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao configurar garantia',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Garantia configurada com sucesso',
        data: {
          serviceOrderId,
          warrantyPeriod,
          warrantyStartDate,
          warrantyEndDate,
          warrantyTerms
        }
      });
    } catch (error) {
      console.error('Erro ao configurar garantia:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao configurar garantia',
        details: error.message
      });
    }
  },

  // Atualizar configuração de garantia
  updateWarranty: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceOrderId } = req.params;
      const updateData = req.body;

      // Verificar se a ordem de serviço existe
      const { data: existingOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: fetchError.message
        });
      }

      // Preparar dados para atualização
      const updateFields = {};
      if (updateData.warrantyPeriod !== undefined) updateFields.warranty_period = updateData.warrantyPeriod;
      if (updateData.warrantyStartDate !== undefined) updateFields.warranty_start_date = updateData.warrantyStartDate;
      if (updateData.warrantyEndDate !== undefined) updateFields.warranty_end_date = updateData.warrantyEndDate;
      if (updateData.warrantyTerms !== undefined) updateFields.warranty_terms = updateData.warrantyTerms;

      // Atualizar a ordem de serviço
      const { data, error } = await supabase
        .from('service_orders')
        .update(updateFields)
        .eq('id', serviceOrderId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar garantia',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Garantia atualizada com sucesso',
        data: {
          serviceOrderId,
          warrantyPeriod: data.warranty_period,
          warrantyStartDate: data.warranty_start_date,
          warrantyEndDate: data.warranty_end_date,
          warrantyTerms: data.warranty_terms
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar garantia:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao atualizar garantia',
        details: error.message
      });
    }
  },

  // Verificar status de garantia
  checkWarrantyStatus: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceOrderId } = req.params;

      // Buscar a ordem de serviço
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço não encontrada',
          details: error.message
        });
      }

      // Verificar se tem garantia configurada
      if (!data.warranty_period || !data.warranty_start_date || !data.warranty_end_date) {
        return res.status(200).json({
          success: true,
          data: { inWarranty: false, daysRemaining: null }
        });
      }

      // Calcular status
      const today = new Date();
      const endDate = new Date(data.warranty_end_date);
      const inWarranty = endDate >= today;
      const daysRemaining = inWarranty ? calculateRemainingDays(today, endDate) : 0;

      return res.status(200).json({
        success: true,
        data: { inWarranty, daysRemaining }
      });
    } catch (error) {
      console.error('Erro ao verificar status de garantia:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao verificar status de garantia',
        details: error.message
      });
    }
  },

  // Criar uma nova ordem de serviço em garantia
  createWarrantyServiceOrder: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { originalOrderId, notes } = req.body;

      // Verificar se a ordem original existe
      const { data: originalOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', originalOrderId)
        .single();

      if (fetchError) {
        return res.status(404).json({
          error: true,
          message: 'Ordem de serviço original não encontrada',
          details: fetchError.message
        });
      }

      // Verificar se a ordem original está em garantia
      const today = new Date();
      const endDate = originalOrder.warranty_end_date ? new Date(originalOrder.warranty_end_date) : null;

      if (!endDate || endDate < today) {
        return res.status(400).json({
          error: true,
          message: 'A ordem de serviço original não está mais em garantia'
        });
      }

      // Criar nova ordem com base na original
      const newOrderId = uuidv4();

      const newOrder = {
        id: newOrderId,
        client_id: originalOrder.client_id,
        client_name: originalOrder.client_name,
        client_email: originalOrder.client_email,
        client_phone: originalOrder.client_phone,
        client_cpf_cnpj: originalOrder.client_cpf_cnpj,
        client_address_complement: originalOrder.client_address_complement,
        client_address_reference: originalOrder.client_address_reference,
        client_city: originalOrder.client_city,
        client_state: originalOrder.client_state,
        client_zip_code: originalOrder.client_zip_code,
        client_full_address: originalOrder.client_full_address,
        technician_id: null, // Será atribuído posteriormente
        technician_name: null,
        status: 'pending',
        created_at: new Date().toISOString(),
        scheduled_date: null,
        // Removido scheduled_time para evitar problemas com o cache do esquema
        completed_date: null,
        description: `ATENDIMENTO EM GARANTIA: ${notes || 'Sem descrição'}`,
        equipment_type: originalOrder.equipment_type,
        equipment_model: originalOrder.equipment_model,
        equipment_serial: originalOrder.equipment_serial,
        needs_pickup: originalOrder.needs_pickup,
        pickup_address: originalOrder.pickup_address,
        pickup_city: originalOrder.pickup_city,
        pickup_state: originalOrder.pickup_state,
        pickup_zip_code: originalOrder.pickup_zip_code,
        current_location: originalOrder.current_location,
        service_attendance_type: originalOrder.service_attendance_type,
        related_warranty_order_id: originalOrderId,
        warranty_period: 0, // Ordens em garantia não têm garantia adicional
        warranty_start_date: null,
        warranty_end_date: null,
        warranty_terms: 'Atendimento em garantia da ordem #' + originalOrderId
      };

      // Inserir a nova ordem
      const { data, error: insertError } = await supabase
        .from('service_orders')
        .insert(newOrder)
        .select()
        .single();

      if (insertError) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar ordem de serviço em garantia',
          details: insertError.message
        });
      }

      // Registrar o serviço em garantia
      const warrantyService = {
        id: uuidv4(),
        original_order_id: originalOrderId,
        warranty_order_id: newOrderId,
        created_at: new Date().toISOString(),
        notes: notes || 'Atendimento em garantia'
      };

      const { error: warrantyError } = await supabase
        .from('warranty_services')
        .insert(warrantyService);

      if (warrantyError) {
        console.error('Erro ao registrar serviço em garantia:', warrantyError);
        // Não falhar a operação principal, apenas registrar o erro
      }

      return res.status(201).json({
        success: true,
        message: 'Ordem de serviço em garantia criada com sucesso',
        data: mapServiceOrder(data)
      });
    } catch (error) {
      console.error('Erro ao criar ordem de serviço em garantia:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao criar ordem de serviço em garantia',
        details: error.message
      });
    }
  },

  // Obter ordens de serviço em garantia relacionadas a uma ordem original
  getRelatedWarrantyOrders: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { originalOrderId } = req.params;

      // Buscar serviços em garantia
      const { data: warrantyServices, error: warrantyError } = await supabase
        .from('warranty_services')
        .select('*')
        .eq('original_order_id', originalOrderId);

      if (warrantyError) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar serviços em garantia',
          details: warrantyError.message
        });
      }

      if (!warrantyServices || warrantyServices.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      // Obter IDs das ordens em garantia
      const warrantyOrderIds = warrantyServices.map(service => service.warranty_order_id);

      // Buscar ordens em garantia
      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select('*')
        .in('id', warrantyOrderIds);

      if (ordersError) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar ordens em garantia',
          details: ordersError.message
        });
      }

      return res.status(200).json({
        success: true,
        data: orders.map(order => mapServiceOrder(order))
      });
    } catch (error) {
      console.error('Erro ao buscar ordens em garantia relacionadas:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao buscar ordens em garantia relacionadas',
        details: error.message
      });
    }
  },

  // Obter ordens de serviço com garantia próxima do vencimento
  getWarrantiesNearingExpiration: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { thresholdDays = 15 } = req.params;
      const today = new Date();

      // Calcular data limite (hoje + dias de threshold)
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + parseInt(thresholdDays));

      // Buscar ordens com garantia próxima do vencimento
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .not('warranty_end_date', 'is', null)
        .gte('warranty_end_date', today.toISOString())
        .lte('warranty_end_date', thresholdDate.toISOString());

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar garantias próximas do vencimento',
          details: error.message
        });
      }

      // Mapear resultados
      const result = data.map(order => {
        const endDate = new Date(order.warranty_end_date);
        const daysRemaining = calculateRemainingDays(today, endDate);

        return {
          serviceOrderId: order.id,
          clientName: order.client_name,
          equipmentType: order.equipment_type,
          warrantyEndDate: order.warranty_end_date,
          daysRemaining
        };
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erro ao buscar garantias próximas do vencimento:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro interno ao buscar garantias próximas do vencimento',
        details: error.message
      });
    }
  }
};

export default warrantyController;
