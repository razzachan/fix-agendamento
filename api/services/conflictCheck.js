import { supabase } from '../config/supabase.js';

// Checagem leve de conflitos pós-criação de evento para alertar o bot/operador
export async function checkConflictsForEvent(event){
  const problems = [];
  const suggestions = [];

  try {
    // Verificar conflito de horário do mesmo técnico (se atribuído)
    if (event.technician_id) {
      const { data: overlaps, error } = await supabase
        .from('calendar_events')
        .select('id,start_time,end_time')
        .eq('technician_id', event.technician_id)
        .neq('id', event.id)
        .overlaps('tsrange(start_time, end_time)', `[${event.start_time},${event.end_time})`);
      if (!error && overlaps && overlaps.length) {
        problems.push({ type: 'technician_conflict', message: 'Técnico já possui compromisso nesse horário', affected: overlaps.map(o=>o.id) });
        suggestions.push('Escolher outro horário ou outro técnico');
      }
    }
  } catch {}

  // Verificar mistura de tipo de atendimento (heurística simples)
  if (event.tipo_servico && /coleta/.test(event.tipo_servico) && event.address && /(condom|edif|ap\.|apt\.)/i.test(event.address)){
    suggestions.push('Para coleta, confirme acesso/portaria e local de retirada');
  }

  return { hasConflicts: problems.length>0, problems, suggestions };
}

export default { checkConflictsForEvent };

