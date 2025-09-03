import { Router } from 'express';
import { isGloballyPaused, setGlobalPause } from '../services/pause.js';

export const pauseRouter = Router();

pauseRouter.get('/status', (_req, res) => {
  res.json({ paused: isGloballyPaused() });
});

pauseRouter.post('/pause', (_req, res) => {
  setGlobalPause(true);
  res.json({ ok: true, paused: true });
});

pauseRouter.post('/resume', (_req, res) => {
  setGlobalPause(false);
  res.json({ ok: true, paused: false });
});

