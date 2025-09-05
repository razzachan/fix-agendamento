import { supabase } from '../config/supabase.js';

export async function nextTechnician({ region=null, skills=[], group=null }={}){
  // get candidates (support new schema: is_active/specialties; fallback to active/skills)
  let q = supabase.from('technicians').select('*');
  // active flag
  try { q = q.eq('is_active', true); } catch { q = q.eq('active', true); }
  // region filter (if JSON/array columns exist)
  if (region) {
    try { q = q.contains('regions', [region]); } catch {}
  }
  if (group) {
    try { q = q.contains('groups', [group]); } catch {}
  }
  // skills/specialties filter
  if (skills?.length) {
    let usedFilter = false;
    try { q = q.contains('specialties', skills); usedFilter = true; } catch {}
    if (!usedFilter) {
      try { q = q.contains('skills', skills); } catch {}
    }
  }

  // order by weight desc (fallback to updated_at desc)
  let techs = [];
  let error;
  try {
    ({ data: techs, error } = await q.order('weight', { ascending:false }));
    if (error) throw error;
  } catch {
    ({ data: techs, error } = await q.order('updated_at', { ascending:false }));
  }
  if (error) throw error;
  if (!techs?.length) return null;

  // pointer
  const { data: ptrRow } = await supabase.from('tech_assign_pointer').select('*').limit(1).single();
  const idx = (ptrRow?.index || 0) % techs.length;
  const chosen = techs[idx];
  await supabase.from('tech_assign_pointer').upsert({ id: ptrRow?.id || 1, index: (idx+1)%techs.length });
  return chosen;
}

export default { nextTechnician };

