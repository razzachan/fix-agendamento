import { supabase } from '@/integrations/supabase/client';
import { ServiceEvent } from '@/types';

/**
 * Gets all events for a specific service order
 */
const getByServiceOrderId = async (serviceOrderId: string): Promise<ServiceEvent[]> => {
  try {
    const { data, error } = await supabase
      .from('service_events')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true })
      .setHeader('cache-control', 'no-cache');

    if (error) {
      throw error;
    }

    return data.map(event => ({
      id: event.id,
      serviceOrderId: event.service_order_id || '',
      type: event.type as any,
      description: event.description,
      createdAt: event.created_at || '',
      createdBy: event.created_by,
    }));
  } catch (error) {
    console.error(`Erro ao buscar eventos para a ordem de serviço ${serviceOrderId}:`, error);
    return [];
  }
};

/**
 * Gets diagnosis events for a specific service order
 */
const getDiagnosisEvents = async (serviceOrderId: string): Promise<ServiceEvent[]> => {
  try {
    // If service order ID is not provided, return empty list
    if (!serviceOrderId) {
      console.log('ID da ordem de serviço não fornecido');
      return [];
    }
    
    console.log(`Buscando eventos de diagnóstico para a ordem de serviço ${serviceOrderId}`);
    
    // Call the new RPC function directly
    const { data, error } = await supabase
      .rpc('get_diagnosis_events', { p_service_order_id: serviceOrderId })
      .setHeader('cache-control', 'no-cache, no-store, must-revalidate')
      .setHeader('pragma', 'no-cache')
      .setHeader('expires', '0');

    if (error) {
      console.error(`Erro ao buscar eventos de diagnóstico para OS ${serviceOrderId}:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`Nenhum evento de diagnóstico encontrado para a OS ${serviceOrderId}`);
      return [];
    }

    // Log retrieved events for debugging
    console.log(`Encontrados ${data.length} eventos de diagnóstico para OS ${serviceOrderId}:`, data);
    
    // Map data to ServiceEvent type
    return data.map(event => ({
      id: event.id,
      serviceOrderId: event.service_order_id || '',
      type: event.type as any,
      description: event.description,
      createdAt: event.created_at || '',
      createdBy: event.created_by,
    }));
  } catch (error) {
    console.error(`Erro ao buscar eventos de diagnóstico para a OS ${serviceOrderId}:`, error);
    return [];
  }
};

/**
 * Gets all diagnosis events from all service orders
 */
const getAllDiagnosisEvents = async (): Promise<ServiceEvent[]> => {
  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    
    // Execute query with anti-cache header
    const { data, error } = await supabase
      .from('service_events')
      .select('*')
      .eq('type', 'diagnosis')
      .order('created_at', { ascending: false })
      .setHeader('cache-control', 'no-cache, no-store, must-revalidate')
      .setHeader('pragma', 'no-cache')
      .setHeader('expires', '0')
      .setHeader('x-custom-timestamp', timestamp.toString());

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }
    
    console.log(`Total de ${data.length} eventos de diagnóstico encontrados`);

    return data.map(event => ({
      id: event.id,
      serviceOrderId: event.service_order_id || '',
      type: event.type as any,
      description: event.description,
      createdAt: event.created_at || '',
      createdBy: event.created_by,
    }));
  } catch (error) {
    console.error('Erro ao buscar todos os eventos de diagnóstico:', error);
    return [];
  }
};

/**
 * Gets repair progress events for a specific service order
 */
const getRepairProgressEvents = async (serviceOrderId: string): Promise<ServiceEvent[]> => {
  try {
    // If service order ID is not provided, return empty list
    if (!serviceOrderId) {
      console.log('ID da ordem de serviço não fornecido para buscar progresso do reparo');
      return [];
    }

    console.log(`Buscando eventos de progresso do reparo para a ordem de serviço ${serviceOrderId}`);

    const { data, error } = await supabase
      .from('service_events')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .eq('type', 'repair')
      .order('created_at', { ascending: true })
      .setHeader('cache-control', 'no-cache');

    if (error) {
      console.error(`Erro ao buscar eventos de progresso do reparo para OS ${serviceOrderId}:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`Nenhum evento de progresso do reparo encontrado para a OS ${serviceOrderId}`);
      return [];
    }

    // Log retrieved events for debugging
    console.log(`Encontrados ${data.length} eventos de progresso do reparo para OS ${serviceOrderId}:`, data);

    // Map data to ServiceEvent type and parse JSON descriptions
    return data.map(event => ({
      id: event.id,
      serviceOrderId: event.service_order_id || '',
      type: event.type as any,
      description: event.description,
      createdAt: event.created_at || '',
      createdBy: event.created_by,
      // Parse JSON description for repair events
      progress_description: (() => {
        try {
          const parsed = typeof event.description === 'string'
            ? JSON.parse(event.description)
            : event.description;
          return parsed.notes || parsed.completion_notes || 'Progresso atualizado';
        } catch {
          return event.description || 'Progresso atualizado';
        }
      })(),
      created_at: event.created_at
    }));
  } catch (error) {
    console.error(`Erro ao buscar eventos de progresso do reparo para a OS ${serviceOrderId}:`, error);
    return [];
  }
};

export const serviceEventQueryService = {
  getByServiceOrderId,
  getDiagnosisEvents,
  getAllDiagnosisEvents,
  getRepairProgressEvents
};
