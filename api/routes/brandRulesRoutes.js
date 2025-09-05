import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Listar regras (opcionalmente filtrando por brand)
router.get('/', async (req, res) => {
  try {
    const { brand } = req.query;
    let q = supabase.from('brand_segment_rules').select('*').order('brand');
    if (brand) q = q.ilike('brand', `%${brand}%`);
    const { data, error } = await q;
    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error('[brand-rules] list error', e);
    return res.status(500).json({ ok:false, error:'list_failed', message: e?.message });
  }
});

// Resolver a regra aplicável para uma marca+tipo de montagem (cooktop|floor)
router.get('/resolve', async (req, res) => {
  try {
    const brandRaw = String(req.query.brand || '').trim();
    const mountRaw = String(req.query.mount || '').trim().toLowerCase();
    if (!brandRaw) return res.status(400).json({ ok:false, error:'missing_brand' });

    const brand = brandRaw.toLowerCase();
    const mount = (mountRaw.includes('cooktop') ? 'cooktop' : (mountRaw.includes('piso') || mountRaw.includes('floor') ? 'floor' : 'both'));

    // Buscar regras por brand
    const { data, error } = await supabase
      .from('brand_segment_rules')
      .select('*')
      .ilike('brand', brand)
      .order('applies_to');
    if (error) throw error;

    if (!data || !data.length) return res.json({ ok:true, rule: null });

    // Preferir regra específica de mount; se não houver, usar 'both'
    let rule = data.find(r => r.applies_to === mount) || data.find(r => r.applies_to === 'both') || data[0];
    return res.json({ ok:true, rule });
  } catch (e) {
    console.error('[brand-rules] resolve error', e);
    return res.status(500).json({ ok:false, error:'resolve_failed', message: e?.message });
  }
});

// Substituir todas as regras (bulk replace)
router.post('/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    // Limpa todas
    const { error: del } = await supabase.from('brand_segment_rules').delete().neq('id','00000000-0000-0000-0000-000000000000');
    if (del) throw del;
    if (items.length) {
      const payload = items.map(x=> ({
        brand: String(x.brand||'').trim(),
        applies_to: x.applies_to || 'both',
        strategy: x.strategy || 'infer_by_photos',
        recommended_segment: x.recommended_segment || null,
        notes: x.notes || null
      }));
      const { error: ins } = await supabase.from('brand_segment_rules').insert(payload);
      if (ins) throw ins;
    }
    return res.json({ ok:true });
  } catch (e) {
    console.error('[brand-rules] bulk error', e);
    return res.status(500).json({ ok:false, error:'bulk_failed', message: e?.message });
  }
});

export default router;

