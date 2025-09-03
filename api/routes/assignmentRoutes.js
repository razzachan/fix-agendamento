import express from 'express';
import { nextTechnician } from '../services/assignmentService.js';

const router = express.Router();

router.post('/next', async (req, res) => {
  try {
    const tech = await nextTechnician(req.body || {});
    if (!tech) return res.status(404).json({ ok:false, error:'no_technician' });
    return res.json({ ok:true, technician: tech });
  } catch (e) {
    console.error('[assignment/next] error', e);
    return res.status(500).json({ ok:false, error:'assignment_failed', message:e?.message });
  }
});

export default router;

