import express from 'express';
import { supabase } from '../config/supabase.js';
import { nextTechnician } from '../services/assignmentService.js';

const router = express.Router();

// GET availability
router.get('/availability', async (req, res) => {
  try {
    const { date, region, service_type, duration = 60 } = req.query;
    if (!date) return res.status(400).json({ error: 'date_required' });

    // working hours
    const { data: wh } = await supabase.from('working_hours').select('*').eq('weekday', new Date(date).getDay());
    const start = wh?.[0]?.start_time || '08:00';
    const end = wh?.[0]?.end_time || '18:00';

    // blackouts
    const { data: blackouts } = await supabase.from('blackouts').select('*').gte('start_time', `${date}T00:00:00`).lte('end_time', `${date}T23:59:59`);

    // existing real events (ignore test) with graceful fallback if column doesn't exist
    let events = [];
    let hasIsTest = true;
    try {
      const resp = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .eq('is_test', false)
        .order('start_time');
      if (resp.error) throw resp.error;
      events = resp.data || [];
    } catch (err) {
      // Fallback without is_test filter (older schema)
      hasIsTest = false;
      const resp2 = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .order('start_time');
      events = resp2.data || [];
    }

    const slots = computeSlots(date, start, end, Number(duration), events || [], blackouts || []);
    return res.json({ date, slots, has_is_test: hasIsTest });
  } catch (e) {
    console.error('[schedule/availability] error', e);
    return res.status(500).json({ error: 'availability_failed', message: e?.message });
  }
});

function computeSlots(date, start, end, durationMin, events, blackouts){
  const toMinutes = (t)=>{ const [h,m]=t.split(':').map(Number); return h*60+m; };
  const startM = toMinutes(start), endM = toMinutes(end);
  const busy = [];
  for(const ev of events){
    const s = new Date(ev.start_time); const e = new Date(ev.end_time);
    busy.push([s.getHours()*60+s.getMinutes(), e.getHours()*60+e.getMinutes()]);
  }
  for(const bl of blackouts){
    const s = new Date(bl.start_time); const e = new Date(bl.end_time);
    busy.push([s.getHours()*60+s.getMinutes(), e.getHours()*60+e.getMinutes()]);
  }
  busy.sort((a,b)=>a[0]-b[0]);

  const slots=[];
  for(let t=startM; t+durationMin<=endM; t+=30){
    const conflict = busy.some(([s,e])=> !(t+durationMin<=s || t>=e));
    if (!conflict) slots.push({ start: toTime(t), end: toTime(t+durationMin) });
  }
  return slots;
}
function toTime(m){ const h=Math.floor(m/60).toString().padStart(2,'0'); const mm=(m%60).toString().padStart(2,'0'); return `${h}:${mm}`; }

// POST book
router.post('/book', async (req, res) => {
  try {
    const { client_id, client_name, technician_id=null, start_time, end_time, address='', address_complement=null, description='', region=null, is_test=false } = req.body || {};
    if (!client_name || !start_time || !end_time) return res.status(400).json({ error: 'missing_fields' });
    const insert = { client_id, client_name, technician_id, start_time, end_time, address, address_complement, description, status:'scheduled', region, is_test, source: is_test ? 'bot_studio' : null };
    const { data, error } = await supabase.from('calendar_events').insert(insert).select().single();
    if (error) throw error;
    return res.json({ ok:true, event: data });
  } catch (e) { console.error('[schedule/book] error', e); return res.status(500).json({ error: 'book_failed', message: e?.message }); }
});

// POST cancel
router.post('/cancel', async (req, res) => {
  try {
    const { id, reason='' } = req.body || {};
    if (!id) return res.status(400).json({ error:'id_required' });
    const { data, error } = await supabase.from('calendar_events').update({ status:'canceled', notes: reason }).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok:true, event: data });
  } catch (e) { console.error('[schedule/cancel] error', e); return res.status(500).json({ error:'cancel_failed', message: e?.message }); }
});

export default router;

