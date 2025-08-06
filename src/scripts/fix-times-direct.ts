/**
 * 🔧 CORREÇÃO DIRETA DE HORÁRIOS
 * 
 * Atualiza os horários específicos da Denise e Michelle para 13:00
 */

import { supabase } from '@/integrations/supabase/client';

export async function fixTimesDirectly() {
  try {
    console.log('🔧 Corrigindo horários diretamente...');

    // Primeiro, vamos ver quais eventos existem
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, client_name, start_time, end_time')
      .in('client_name', ['Denise Deibler', 'Michelle da Silva']);

    if (fetchError) {
      console.error('❌ Erro ao buscar eventos:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log('📋 Eventos encontrados:', events);

    if (!events || events.length === 0) {
      console.log('⚠️ Nenhum evento encontrado para atualizar');
      return { success: false, error: 'Nenhum evento encontrado' };
    }

    // Atualizar todos os eventos encontrados para 13:00
    const updatePromises = events.map(event => {
      const currentDate = new Date(event.start_time);
      const newStartTime = new Date(currentDate);
      newStartTime.setHours(13, 0, 0, 0);

      const newEndTime = new Date(newStartTime);
      newEndTime.setHours(14, 0, 0, 0);

      console.log(`🔄 Atualizando ${event.client_name}: ${event.start_time} → ${newStartTime.toISOString()}`);

      return supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);
    });

    const results = await Promise.all(updatePromises);

    console.log('📊 Resultados das atualizações:', results);

    const hasErrors = results.some(result => result.error);
    if (hasErrors) {
      console.error('❌ Alguns erros ocorreram:', results.filter(r => r.error));
      return { success: false, error: 'Erros nas atualizações' };
    }

    console.log('✅ Todos os horários corrigidos com sucesso!');

    return { success: true, updated: events.length };

  } catch (error) {
    console.error('❌ Erro ao corrigir horários:', error);
    return { success: false, error };
  }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  (window as any).fixTimesDirectly = fixTimesDirectly;
  console.log('🔧 Execute: fixTimesDirectly()');
}
