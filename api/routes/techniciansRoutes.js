import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Create technician
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, specialties, userId, isActive, groups, weight } = req.body || {};
    const payload = {
      name,
      email,
      phone: phone ?? null,
      specialties: Array.isArray(specialties) ? specialties : [],
      user_id: userId ?? null,
      is_active: isActive !== false,
      groups: Array.isArray(groups) ? groups : ['A','B'],
      weight: typeof weight === 'number' ? weight : 0,
    };

    const { data, error } = await supabase.from('technicians').insert(payload).select('*').single();
    if (error) throw error;
    return res.json({ ok:true, technician: data });
  } catch (e) {
    console.error('[api/technicians POST] error', e);
    return res.status(400).json({ ok:false, error:'technician_create_failed', message: e?.message, details: e });
  }
});

// Update technician
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, specialties, isActive, groups, weight } = req.body || {};

    const update = {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone: phone ?? null } : {}),
      ...(specialties !== undefined ? { specialties: Array.isArray(specialties) ? specialties : [] } : {}),
      ...(isActive !== undefined ? { is_active: !!isActive } : {}),
      ...(groups !== undefined ? { groups: Array.isArray(groups) ? groups : ['A','B'] } : {}),
      ...(weight !== undefined ? { weight: typeof weight === 'number' ? weight : 0 } : {}),
    };

    const { data, error } = await supabase.from('technicians').update(update).eq('id', id).select('*').single();
    if (error) throw error;

    return res.json({ ok:true, technician: data });
  } catch (e) {
    console.error('[api/technicians PATCH] error', e);
    return res.status(400).json({ ok:false, error:'technician_update_failed', message: e?.message, details: e });
  }
});

// Delete technician
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (error) throw error;
    return res.json({ ok:true });
  } catch (e) {
    console.error('[api/technicians DELETE] error', e);
    return res.status(400).json({ ok:false, error:'technician_delete_failed', message: e?.message, details: e });
  }
});

export default router;

