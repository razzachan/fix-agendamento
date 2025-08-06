/**
 * 🔍 DEBUG RÁPIDO DO CALENDÁRIO
 */

import { supabase } from '@/integrations/supabase/client';

export async function debugGiovaniCalendar(): Promise<void> {
  console.group('🔍 [DEBUG] Estado do Calendário - Giovani');

  try {
    // 1. Verificar service_order
    const { data: serviceOrder, error: orderError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('id', '8b783242-6afd-4a99-9e81-6f28c4cd061a')
      .single();

    if (orderError) {
      console.error('❌ Erro ao buscar service_order:', orderError);
    } else {
      console.log('📋 Service Order:', {
        id: serviceOrder.id,
        client_name: serviceOrder.client_name,
        scheduled_date: serviceOrder.scheduled_date,
        status: serviceOrder.status,
        technician_id: serviceOrder.technician_id
      });
    }

    // 2. Verificar scheduled_service
    const { data: scheduledService, error: serviceError } = await supabase
      .from('scheduled_services')
      .select('*')
      .eq('service_order_id', '8b783242-6afd-4a99-9e81-6f28c4cd061a')
      .single();

    if (serviceError) {
      console.error('❌ Erro ao buscar scheduled_service:', serviceError);
    } else {
      console.log('📅 Scheduled Service:', {
        id: scheduledService.id,
        service_order_id: scheduledService.service_order_id,
        scheduled_start_time: scheduledService.scheduled_start_time,
        status: scheduledService.status,
        technician_id: scheduledService.technician_id
      });
    }

    // 3. Verificar range de datas atual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Segunda-feira
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('📅 Range da semana atual:', {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString(),
      giovaniDate: '2025-07-26T15:00:00.000Z',
      giovaniInRange: new Date('2025-07-26T15:00:00.000Z') >= startOfWeek && new Date('2025-07-26T15:00:00.000Z') <= endOfWeek
    });

    // 4. Verificar se há outros eventos do mesmo técnico
    const { data: otherEvents, error: eventsError } = await supabase
      .from('scheduled_services')
      .select('*')
      .eq('technician_id', serviceOrder?.technician_id)
      .gte('scheduled_start_time', startOfWeek.toISOString())
      .lte('scheduled_start_time', endOfWeek.toISOString());

    if (eventsError) {
      console.error('❌ Erro ao buscar outros eventos:', eventsError);
    } else {
      console.log(`📊 Outros eventos do técnico na semana: ${otherEvents?.length || 0}`);
      otherEvents?.forEach(event => {
        console.log(`  - ${event.client_name}: ${event.scheduled_start_time} (${event.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
  } finally {
    console.groupEnd();
  }
}

// Disponibilizar no window para uso no console
(window as any).debugGiovaniCalendar = debugGiovaniCalendar;

console.log('🔍 Debug do calendário carregado! Execute: debugGiovaniCalendar()');
