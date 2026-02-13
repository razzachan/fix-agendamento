import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireBotOrAdmin } from '../middleware/botOrAdmin.js';
import { supabase } from '../config/supabase.js';
import { GetAvailabilitySchema, CreateAppointmentSchema, CancelAppointmentSchema } from '../validation/botToolsSchemas.js';

const router = express.Router();

// Rate limit for bot tools (defensive)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
router.use(limiter);

// All routes here require bot token OR admin user
router.use(requireBotOrAdmin);

// GET /api/bot/tools/listAppointments
router.get('/listAppointments', async (req, res) => {
  try {
    const {
      date_from,
      date_to,
      status,
      limit,
    } = req.query || {};

    const parsedLimit = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);

    const today = new Date();
    const ymd = today.toISOString().slice(0, 10);
    const fromYmd = String(date_from || ymd);
    const toYmd = String(date_to || fromYmd);

    const fromIso = `${fromYmd}T00:00:00`;
    const toIso = `${toYmd}T23:59:59`;

    let q = supabase
      .from('calendar_events')
      .select('id,start_time,end_time,client_name,client_phone,equipment_type,description,status,technician_id,technician_name,service_order_id,logistics_group,is_test')
      .gte('start_time', fromIso)
      .lte('start_time', toIso)
      .order('start_time', { ascending: true })
      .limit(parsedLimit);

    if (status) {
      q = q.eq('status', String(status));
    }

    // Filtro defensivo de testes com fallback se coluna não existir
    let data;
    try {
      const resp = await q.eq('is_test', false);
      if (resp.error) throw resp.error;
      data = resp.data || [];
    } catch {
      const resp2 = await q;
      if (resp2.error) throw resp2.error;
      data = resp2.data || [];
    }

    const appointments = (data || []).map((e) => ({
      id: e.id,
      start_time: e.start_time,
      end_time: e.end_time,
      client_name: e.client_name,
      phone: e.client_phone || null,
      equipment_type: e.equipment_type || null,
      description: e.description || null,
      status: e.status,
      technician: e.technician_id || e.technician_name ? { id: e.technician_id || null, name: e.technician_name || null } : undefined,
      service_order_id: e.service_order_id || null,
    }));

    return res.json({ ok: true, appointments });
  } catch (e) {
    console.error('[botTools/listAppointments] error', e);
    return res.status(500).json({ ok: false, error: 'list_failed', message: e?.message });
  }
});

router.post('/getAvailability', async (req, res) => {
  try {
    const parsed = GetAvailabilitySchema.safeParse(req.body||{});
    if (!parsed.success) return res.status(400).json({ ok:false, error:'invalid_payload', details: parsed.error.format() });
    const { date, region=null, service_type=null, duration=60, technician_id=null } = parsed.data;

    // working hours
    const { data: wh } = await supabase.from('working_hours').select('*').eq('weekday', new Date(date).getDay());
    const start = wh?.[0]?.start_time || '08:00';
    const end = wh?.[0]?.end_time || '18:00';

    // blackouts (DB)
    const { data: blackoutsDb } = await supabase
      .from('blackouts')
      .select('*')
      .gte('start_time', `${date}T00:00:00`)
      .lte('end_time', `${date}T23:59:59`);

    // Injeta horário de almoço como blackout (compatível com calendário principal)
    const allBlackouts = [...(blackoutsDb || [])];
    const injectLunch = (process.env.CALENDAR_INJECT_LUNCH || 'true').toLowerCase() !== 'false';
    if (injectLunch) {
      const lunchStart = process.env.CALENDAR_LUNCH_START || '12:00';
      const lunchEnd = process.env.CALENDAR_LUNCH_END || '13:00';
      const ls = new Date(`${date}T${lunchStart}:00`);
      const le = new Date(`${date}T${lunchEnd}:00`);
      allBlackouts.push({ start_time: ls.toISOString(), end_time: le.toISOString() });
    }

    // events (ignore tests) com fallback se coluna is_test não existir
    let events = [];
    try {
      let q = supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .eq('is_test', false)
        .order('start_time');
      if (technician_id) q = q.eq('technician_id', String(technician_id));
      const resp = await q;
      if (resp.error) throw resp.error;
      events = resp.data || [];
    } catch (err) {
      let q2 = supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .order('start_time');
      if (technician_id) q2 = q2.eq('technician_id', String(technician_id));
      const resp2 = await q2;
      events = resp2.data || [];
    }

    const slots = computeSlots(date, start, end, Number(duration), events || [], allBlackouts);
    return res.json({ ok:true, date, slots });
  } catch (e) {
    console.error('[botTools/getAvailability] error', e);
    return res.status(500).json({ ok:false, error:'availability_failed', message: e?.message });
  }
});

router.post('/createAppointment', async (req, res) => {
  try {
    const parsed = CreateAppointmentSchema.safeParse(req.body||{});
    if (!parsed.success) return res.status(400).json({ ok:false, error:'invalid_payload', details: parsed.error.format() });
    const { client_name, start_time, end_time, is_test=false, address='', address_complement='', zip_code='', email='', cpf='', description='', equipment_type=null, phone=null, attendance_preference='', region=null } = parsed.data;

    // Classificar tipo de atendimento (em_domicilio | coleta_diagnostico | coleta_conserto)
    const { classifyAttendance } = await import('../services/attendanceClassifier.js');
    const attendanceType = classifyAttendance({ equipment_type, description, attendance_preference });

    // Determinar grupo logístico pela morada (sempre definir, independente do assignment)
    const { inferGroupFromAddress } = await import('../services/regionGroups.js');
    const group = inferGroupFromAddress(address || '') || 'B';
    req.app.set('currentLogisticsGroup', group);
    req.currentLogisticsGroup = group;

    // Escolher técnico com base em equipamento/skill e região/grupo (se disponível)
    let chosenTech = null;
    try {
      const { nextAvailableTechnicianForSlot, nextTechnician } = await import('../services/assignmentService.js');
      chosenTech = await nextAvailableTechnicianForSlot({
        region: null,
        group,
        skills: equipment_type ? [equipment_type] : [],
        start_time,
        end_time,
      });
      if (!chosenTech) {
        chosenTech = await nextTechnician({ region: null, group, skills: equipment_type ? [equipment_type] : [] });
      }
    } catch (e) {
      console.warn('[botTools/createAppointment] assignment fallback', e?.message);
    }

    const insert = {
      client_name,
      client_phone: phone || null,
      technician_id: chosenTech?.id || null,
      technician_name: chosenTech?.name || 'A Definir',
      start_time,
      end_time,
      address,
      address_complement: address_complement || null,
      description,
      equipment_type,
      status:'scheduled',
      is_test: !!is_test,
      source: 'bot',
      service_attendance_type: attendanceType,
      client_email: email || null,
      client_cpf_cnpj: cpf || null,
      logistics_group: (req.app.get('currentLogisticsGroup') || req.currentLogisticsGroup || null)
    };
    let data, error;
    try {
      ({ data, error } = await supabase.from('calendar_events').insert(insert).select().single());
      if (error) throw error;
    } catch (e) {
      // Fallback: remover colunas ausentes conhecidas (compat com schemas antigos)
      const msg = ((e?.message||'') + ' ' + (e?.hint||'') + ' ' + (e?.details||''))?.toLowerCase();
      const missingSAT = msg.includes('service_attendance_type');
      const missingCPF = msg.includes('client_cpf_cnpj');
      const missingEmail = msg.includes('client_email');
      if (missingSAT || missingCPF || missingEmail) {
        const { service_attendance_type, client_cpf_cnpj, client_email, ...safeInsert } = insert;
        ({ data, error } = await supabase.from('calendar_events').insert(safeInsert).select().single());
        if (error) throw error;
        // reidratar no payload de resposta para quem consome a API
        if (data) {
          if (missingSAT && !data.service_attendance_type) data.service_attendance_type = service_attendance_type;
          if (missingCPF && !data.client_cpf_cnpj) data.client_cpf_cnpj = client_cpf_cnpj || null;
          if (missingEmail && !data.client_email) data.client_email = client_email || null;
        }
      } else {
        throw e;
      }
    }
    // garantir que logistics_group seja refletido no payload de resposta
    if (data && !data.logistics_group) { data.logistics_group = (req.app.get('currentLogisticsGroup') || req.currentLogisticsGroup || null); }

    // Criar/vincular ordem de serviço a partir do evento
    let serviceOrder = null;
    try {
      // Em smoke test, não criar OS para não poluir produção
      if (is_test) {
        serviceOrder = null;
      } else {
      const payload = {
        client_name,
        client_phone: phone || null,
        description,
        equipment_type,
        status: 'scheduled',
        service_attendance_type: attendanceType,
        scheduled_date: start_time,
        technician_id: chosenTech?.id || null,
        technician_name: chosenTech?.name || null,
      };
      const { data: so, error: soErr } = await supabase.from('service_orders').insert(payload).select().single();
      if (!soErr) {
        serviceOrder = so;
        await supabase.from('calendar_events').update({ service_order_id: so.id }).eq('id', data.id);
      }
      }
    } catch {}

    // Decision log
    try {
      const { logDecision } = await import('../services/decisionLog.js');
      await logDecision('calendar_event', data.id, 'create_from_bot', {
        attendanceType,
        equipment_type,
        region,
        chosenTechnician: chosenTech,
        service_order_id: serviceOrder?.id || null,
      });
    } catch {}

    // Checagem leve de conflitos e sugestões
    let conflicts = { hasConflicts:false, problems:[], suggestions:[] };
    try {
      const { checkConflictsForEvent } = await import('../services/conflictCheck.js');
      conflicts = await checkConflictsForEvent(data);
      if (conflicts?.hasConflicts) {
        const { logDecision } = await import('../services/decisionLog.js');
        await logDecision('calendar_event', data.id, 'conflict_detected', conflicts);
      }
    } catch {}

    return res.json({ ok:true, event: data, attendanceType, technician: chosenTech, serviceOrder, conflicts });
  } catch (e) {
    console.error('[botTools/createAppointment] error', e);
    return res.status(500).json({ ok:false, error: 'book_failed', message: e?.message });
  }

});

router.post('/smartSuggestions', async (req, res) => {
    try {
      const { address = '', equipment_type = null, urgent = false } = req.body || {};

      // 1) Inferir grupo A/B/C a partir do endereço
      const { inferGroupFromAddress } = await import('../services/regionGroups.js');
      const group = inferGroupFromAddress(address || '') || 'B';

      // 2) Construir janelas nos próximos dias respeitando regras do Grupo C
      const tz = 'America/Sao_Paulo';
      const now = new Date();

      const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
      const isMonday = (d) => d.getDay() === 1;

      const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

      // Buscar eventos e blackouts de um dia específico
      async function dayAvailability(day){
        const ymd = day.toISOString().slice(0,10);
        const { data: wh } = await supabase.from('working_hours').select('*').eq('weekday', day.getDay());
        const start = wh?.[0]?.start_time || '08:00';
        const end = wh?.[0]?.end_time || '18:00';

        const { data: blackoutsDb } = await supabase
          .from('blackouts')
          .select('*')
          .gte('start_time', `${ymd}T00:00:00`)
          .lte('end_time', `${ymd}T23:59:59`);

        const allBlackouts = [...(blackoutsDb || [])];
        const injectLunch = (process.env.CALENDAR_INJECT_LUNCH || 'true').toLowerCase() !== 'false';
        if (injectLunch) {
          const lunchStart = process.env.CALENDAR_LUNCH_START || '12:00';
          const lunchEnd = process.env.CALENDAR_LUNCH_END || '13:00';
          const ls = new Date(`${ymd}T${lunchStart}:00`);
          const le = new Date(`${ymd}T${lunchEnd}:00`);
          allBlackouts.push({ start_time: ls.toISOString(), end_time: le.toISOString() });
        }

        let events = [];
        try {
          const resp = await supabase
            .from('calendar_events')
            .select('*')
            .gte('start_time', `${ymd}T00:00:00`)
            .lte('start_time', `${ymd}T23:59:59`)
            .eq('is_test', false)
            .order('start_time');
          if (resp.error) throw resp.error;
          events = resp.data || [];
        } catch {
          const resp2 = await supabase
            .from('calendar_events')
            .select('*')
            .gte('start_time', `${ymd}T00:00:00`)
            .lte('start_time', `${ymd}T23:59:59`)
            .order('start_time');
          events = resp2.data || [];
        }

        const slots = computeSlots(ymd, start, end, Number(process.env.CALENDAR_DEFAULT_DURATION||60), events, allBlackouts);
        return { ymd, slots, events };
      }

      // Regras do Grupo C conforme middleware: sem segundas, não consecutivo a outro C, e não misturar com A/B no mesmo dia
      async function groupCRulesAllow(day){
        const ymd = day.toISOString().slice(0,10);
        if (isWeekend(day)) return false; // já excluímos fim de semana
        if (isMonday(day)) return false;  // nunca Segunda

        // Se já houver evento C no dia anterior, bloquear
        const prev = addDays(day, -1).toISOString().slice(0,10);
        const { data: prevEvents } = await supabase
          .from('calendar_events')
          .select('logistics_group,start_time')
          .gte('start_time', `${prev}T00:00:00`).lte('start_time', `${prev}T23:59:59`);
        const hadCYesterday = (prevEvents||[]).some(e => e.logistics_group==='C');
        if (hadCYesterday) return false;

        // Não misturar com A/B no mesmo dia
        const { data: todayEvents } = await supabase
          .from('calendar_events')
          .select('logistics_group,start_time')
          .gte('start_time', `${ymd}T00:00:00`).lte('start_time', `${ymd}T23:59:59`);
        const hasAB = (todayEvents||[]).some(e => e.logistics_group==='A' || e.logistics_group==='B');
        if (hasAB) return false;

        return true;
      }

      const suggestions = [];
      let dayOffset = 0;
      while (suggestions.length < 2 && dayOffset < 14) {
        const day = addDays(now, dayOffset);
        if (isWeekend(day)) { dayOffset++; continue; }

        // Grupo C bloqueios específicos
        if (group === 'C') {
          const allowed = await groupCRulesAllow(day);
          if (!allowed) { dayOffset++; continue; }
        }

        const { ymd, slots } = await dayAvailability(day);
        if (slots.length > 0) {
          // pegar primeiros slots da janela preferencial
          const preferred = group==='C' ? slots.filter(s => s.start >= '14:00') : slots;
          const chosen = (preferred[0] || slots[0]);
          if (chosen) {
            suggestions.push({ date: ymd, window: `${chosen.start}–${chosen.end}`, group });
          }
        }
        dayOffset++;
      }

      // Formatar para o bot (ex.: 14/08 entre 13 e 14h)
      const display = suggestions.map(s=>{
        const [y,m,d] = s.date.split('-');
        const [h1,min1] = s.window.split('–')[0].split(':');
        const [h2,min2] = s.window.split('–')[1].split(':');
        return { text: `${d}/${m} entre ${h1} e ${h2}h`, date: s.date, from: `${s.date}T${s.window.split('–')[0]}:00`, to: `${s.date}T${s.window.split('–')[1]}:00`, group: s.group };
      });

      return res.json({ ok:true, suggestions: display });
    } catch (e) {
      console.error('[botTools/smartSuggestions] error', e);
      return res.status(500).json({ ok:false, error:'smart_suggestions_failed', message: e?.message });
    }
  });

router.get('/decision-logs', async (req, res) => {
  try {
    const { entity=null, q='', start=null, end=null, page='1', pageSize='50' } = req.query || {};
    const pg = Math.max(1, parseInt(String(page)||'1', 10));
    const ps = Math.max(10, Math.min(200, parseInt(String(pageSize)||'50', 10)));
    const from = (pg - 1) * ps;
    const to = from + ps - 1;

    const applyFilters = (qb) => {
      let qsb = qb;
      if (entity) qsb = qsb.eq('entity', String(entity));
      if (q) { qsb = qsb.or(`entity_id.ilike.%${q}%,action.ilike.%${q}%`); }
      if (start) {
        const s = String(start);
        const iso = s.length===10 ? `${s}T00:00:00Z` : s;
        qsb = qsb.gte('created_at', iso);
      }
      if (end) {
        const e = String(end);
        const iso = e.length===10 ? `${e}T23:59:59Z` : e;
        qsb = qsb.lte('created_at', iso);
      }
      return qsb;
    };

    // Count total
    const countQuery = applyFilters(
      supabase.from('decision_logs').select('*', { count: 'exact', head: true })
    );
    const { error: countErr, count } = await countQuery;
    if (countErr) throw countErr;

    // Data page
    let dataQuery = applyFilters(
      supabase.from('decision_logs').select('*')
    ).order('created_at', { ascending:false }).range(from, to);

    const { data, error } = await dataQuery;
    if (error) throw error;
    return res.json({ ok:true, items: data, page: pg, pageSize: ps, total: count ?? null });
  } catch (e) {
    console.error('[botTools/decision-logs] error', e);
    return res.status(500).json({ ok:false, error:'decision_logs_failed', message:e?.message });
  }
});


router.post('/cancelAppointment', async (req, res) => {
  try {
    const parsed = CancelAppointmentSchema.safeParse(req.body||{});
    if (!parsed.success) return res.status(400).json({ ok:false, error:'invalid_payload', details: parsed.error.format() });
    const { id, reason='' } = parsed.data;
    const { data, error } = await supabase.from('calendar_events').update({ status:'canceled', notes: reason }).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok:true, event: data });
  } catch (e) {
    console.error('[botTools/cancelAppointment] error', e);
    return res.status(500).json({ ok:false, error:'cancel_failed', message:e?.message });
  }
});

router.post('/buildQuote', async (req, res) => {
  try {
    // Reusa serviço existente
    const { default: quoteRouter } = await import('./../services/quoteService.js');
  } catch (e) {
    // Simplesmente encaminhar para rota existente de estimate
  }
  try {
    const { estimateQuote } = await import('../services/quoteService.js');
    // mapear equipment -> service_type se chegar do bot
    const payload = { ...(req.body||{}) };
    if (!payload.service_type && payload.equipment) payload.service_type = payload.equipment;
    const result = await estimateQuote(payload);
    return res.json({ ok:true, result });
  } catch (e) {
    console.error('[botTools/buildQuote] error', e);
    return res.status(500).json({ ok:false, error:'quote_failed', message:e?.message });
  }
});

router.post('/getOrderStatus', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:'id_required' });
    const { data, error } = await supabase.from('service_orders').select('status, order_number, client_name, scheduled_date, final_cost').eq('id', id).single();
    if (error) return res.status(404).json({ ok:false, error:'order_not_found' });
    return res.json({ ok:true, id, ...data });
  } catch (e) {
    console.error('[botTools/getOrderStatus] error', e);
    return res.status(500).json({ ok:false, error:'status_failed', message:e?.message });
  }
});

import { computeSlots } from '../services/scheduleUtils.js';

export default router;

