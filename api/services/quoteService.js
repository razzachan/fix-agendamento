import { supabase } from '../config/supabase.js';

/**
 * Estimate a quote based on service_type, region and urgency.
 * Enhanced: consolidate segment (basico/inox/premium) using brand rules when applicable.
 */
export async function estimateQuote(input) {
  const { service_type, region, urgency } = input;
  if (!service_type) throw new Error('service_type is required');

  // Consolidar segmento com base em regras de marca
  // Estratégias: force (usa recomendado), prefer (eleva se visual abaixo), infer_by_photos (mantém visual)
  let consolidatedSegment = (input.segment || '').toLowerCase();
  const brand = String(input.brand || '').trim().toLowerCase();
  const mount = String(input.mount || '').trim().toLowerCase();
  try {
    if (brand) {
      // Resolver regra (via tabela brand_segment_rules)
      const { data: ruleData, error: ruleError } = await supabase
        .from('brand_segment_rules')
        .select('*')
        .ilike('brand', brand)
        .order('applies_to');
      if (!ruleError) {
        const applies = mount.includes('cooktop') ? 'cooktop' : (mount.includes('piso') || mount.includes('floor') ? 'floor' : 'both');
        const rule = (ruleData||[]).find(r=>r.applies_to===applies) || (ruleData||[]).find(r=>r.applies_to==='both');
        if (rule) {
          const rec = (rule.recommended_segment || '').toLowerCase();
          const strat = (rule.strategy || 'infer_by_photos');
          if (strat === 'force' && rec) {
            consolidatedSegment = rec;
          } else if (strat === 'prefer' && rec) {
            const rank = (s)=> s==='premium'?3 : s==='inox'?2 : s==='basico'?1 : 0;
            const current = rank(consolidatedSegment);
            const desired = rank(rec);
            if (desired > current) consolidatedSegment = rec;
          } // infer_by_photos: não altera
        }
      }
    }
  } catch (e) {
    console.warn('[estimateQuote] brand rule resolution failed:', e?.message || e);
  }

  let query = supabase.from('price_list').select('*').eq('service_type', service_type);
  if (region) query = query.eq('region', region);
  if (urgency) query = query.eq('urgency', urgency);

  const { data, error } = await query.order('priority', { ascending: true }).limit(1);
  if (error) throw error;

  const rule = data?.[0];
  if (!rule) {
    return { found: false, value: null, min: null, max: null };
  }

  return {
    found: true,
    value: Number(rule.base) || 0,
    min: Number(rule.min) || Number(rule.base) || 0,
    max: Number(rule.max) || Number(rule.base) || 0,
    // notes: rule.notes || null, // REMOVIDO: não deve aparecer na resposta final
    rule_id: rule.id,
    service_type: service_type,
    segment: consolidatedSegment || null
  };
}

export default { estimateQuote };

