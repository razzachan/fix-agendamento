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

export async function nextAvailableTechnicianForSlot({ region=null, skills=[], group=null, start_time=null, end_time=null }={}){
  const hasWindow = !!(start_time && end_time);

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

  // pointer-based round robin start
  const { data: ptrRow } = await supabase.from('tech_assign_pointer').select('*').limit(1).single();
  const startIdx = (ptrRow?.index || 0) % techs.length;

  const isFree = async (techId) => {
    if (!hasWindow) return true;
    try {
      const { data: overlaps, error: ovErr } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('technician_id', techId)
        .neq('status', 'canceled')
        .lt('start_time', String(end_time))
        .gt('end_time', String(start_time))
        .limit(1);
      if (ovErr) return false;
      return !(overlaps && overlaps.length);
    } catch {
      return false;
    }
  };

  // try all technicians in cyclic order from pointer
  for (let offset = 0; offset < techs.length; offset++) {
    const idx = (startIdx + offset) % techs.length;
    const candidate = techs[idx];
    if (!candidate?.id) continue;
    const ok = await isFree(candidate.id);
    if (ok) {
      // advance pointer to next after the chosen one
      const nextIndex = (idx + 1) % techs.length;
      await supabase.from('tech_assign_pointer').upsert({ id: ptrRow?.id || 1, index: nextIndex });
      return candidate;
    }
  }

  // No one free: keep old behavior (pick pointer) to avoid hard failure
  const fallback = techs[startIdx];
  await supabase.from('tech_assign_pointer').upsert({ id: ptrRow?.id || 1, index: (startIdx+1)%techs.length });
  return fallback || null;
}

export default { nextTechnician, nextAvailableTechnicianForSlot };

